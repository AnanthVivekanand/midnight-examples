/**
 * Provides types and utilities for working with MERC-20 contracts.
 *
 * @packageDocumentation
 */

import { type ContractAddress, convert_bigint_to_Uint8Array } from '@midnight-ntwrk/compact-runtime';
import { type Logger } from 'pino';
import type { MERC20DerivedState, MERC20Contract, MERC20Providers, DeployedMERC20Contract } from './common-types.js';
import {
  type MERC20PrivateState,
  Contract,
  createMERC20PrivateState,
  ledger,
  pureCircuits,
  witnesses,
} from 'midnight-erc20-port';
import * as utils from './utils/index.js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { combineLatest, map, tap, from, type Observable } from 'rxjs';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';

/** @internal */
const merc20ContractInstance: MERC20Contract = new Contract(witnesses);

/**
 * An API for a deployed MERC-20 contract.
 */
export interface DeployedMERC20API {
  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<MERC20DerivedState>;

  transfer: (to: string, amount: bigint) => Promise<void>;
  approve: (spender: string, amount: bigint) => Promise<void>;
  transferFrom: (from: string, to: string, amount: bigint) => Promise<void>;
  balanceOf: (address: string) => Promise<bigint>;
  allowance: (owner: string, spender: string) => Promise<bigint>;
}

/**
 * Provides an implementation of {@link DeployedMERC20API} by adapting a deployed MERC-20 contract.
 *
 * @remarks
 * The `MERC20PrivateState` is managed at the DApp level by a private state provider. This private state
 * is shared across all instances of {@link MERC20API} and their underlying deployed contracts.
 * The private state includes the user's secret key, used to derive the user's address for operations.
 */
export class MERC20API implements DeployedMERC20API {
  private readonly providers: MERC20Providers;

  constructor(
    public readonly deployedContract: DeployedMERC20Contract,
    providers: MERC20Providers,
    private readonly logger?: Logger,
  ) {
    this.providers = providers;
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.state$ = combineLatest(
      [
        providers.publicDataProvider.contractStateObservable(this.deployedContractAddress, { type: 'latest' }).pipe(
          map((contractState) => ledger(contractState.data)),
          tap((ledgerState) =>
            logger?.trace({
              ledgerStateChanged: {
                ledgerState: {
                  tokenName: ledgerState.tokenName,
                  tokenSymbol: ledgerState.tokenSymbol,
                  tokenDecimals: ledgerState.tokenDecimals,
                  totalSupply: ledgerState.totalSupply,
                },
              },
            }),
          ),
        ),
        from(providers.privateStateProvider.get('MERC20PrivateState') as Promise<MERC20PrivateState>),
      ],
      (ledgerState, privateState) => {
        const userAddress = pureCircuits.compute_address(privateState.secretKey);
        const userBalance = ledgerState.balances.member(userAddress)
          ? ledgerState.balances.lookup(userAddress)
          : BigInt(0);
        return {
          userBalance,
          tokenName: ledgerState.tokenName,
          tokenSymbol: ledgerState.tokenSymbol,
          tokenDecimals: ledgerState.tokenDecimals,
          totalSupply: ledgerState.totalSupply,
        };
      },
    );
  }

  readonly deployedContractAddress: ContractAddress;
  readonly state$: Observable<MERC20DerivedState>;

  async transfer(to: string, amount: bigint): Promise<void> {
    this.logger?.info(`transferring ${amount} tokens to ${to}`);
    const txData = await this.deployedContract.callTx.transfer(stringToBytes32(to), amount);
    this.logger?.trace({
      transactionAdded: {
        circuit: 'transfer',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async approve(spender: string, amount: bigint): Promise<void> {
    this.logger?.info(`approving ${amount} tokens for ${spender}`);
    const txData = await this.deployedContract.callTx.approve(stringToBytes32(spender), amount);
    this.logger?.trace({
      transactionAdded: {
        circuit: 'approve',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async transferFrom(from: string, to: string, amount: bigint): Promise<void> {
    this.logger?.info(`transferring ${amount} tokens from ${from} to ${to}`);
    const txData = await this.deployedContract.callTx.transferFrom(stringToBytes32(from), stringToBytes32(to), amount);
    this.logger?.trace({
      transactionAdded: {
        circuit: 'transferFrom',
        txHash: txData.public.txHash,
        blockHeight: txData.public.blockHeight,
      },
    });
  }

  async balanceOf(address: string): Promise<bigint> {
    const ledgerState = await this.getLedgerState();
    return ledgerState.balances.member(stringToBytes32(address)) ? ledgerState.balances.lookup(stringToBytes32(address)) : BigInt(0);
  }

  async allowance(owner: string, spender: string): Promise<bigint> {
    const ledgerState = await this.getLedgerState();
    if (ledgerState.allowances.member(stringToBytes32(owner))) {
      const ownerAllowances = ledgerState.allowances.lookup(stringToBytes32(owner));
      return ownerAllowances.member(stringToBytes32(spender)) ? ownerAllowances.lookup(stringToBytes32(spender)) : BigInt(0);
    }
    return BigInt(0);
  }

  private async getLedgerState() {
    const contractState = await this.providers.publicDataProvider.queryContractState(this.deployedContractAddress);
    if (!contractState) {
      throw new Error('contract state not found');
    }
    return ledger(contractState.data);
  }

  static async deploy(providers: MERC20Providers, args: { totalSupply: bigint, mintAddress: string, tokenName: string, tokenSymbol: string, tokenDecimals: bigint }, logger?: Logger): Promise<MERC20API> {
    logger?.info('deploying MERC-20 contract');
    const deployedMERC20Contract = await deployContract(providers, {
      privateStateKey: 'MERC20PrivateState',
      contract: merc20ContractInstance,
      initialPrivateState: await MERC20API.getPrivateState(providers),
      args: [
        args.totalSupply,
        Uint8Array.from(Buffer.from(args.mintAddress, 'hex')),
        args.tokenName,
        args.tokenSymbol,
        args.tokenDecimals
      ]
    });
    logger?.trace({
      contractDeployed: {
        finalizedDeployTxData: deployedMERC20Contract.deployTxData.public,
      },
    });
    return new MERC20API(deployedMERC20Contract, providers, logger);
  }

  static async join(providers: MERC20Providers, contractAddress: ContractAddress, logger?: Logger): Promise<MERC20API> {
    logger?.info({ joinContract: { contractAddress } });
    const deployedMerc20Contract = await findDeployedContract(providers, {
      contractAddress,
      contract: merc20ContractInstance,
      privateStateKey: 'MERC20PrivateState',
      initialPrivateState: await MERC20API.getPrivateState(providers),
    });
    logger?.trace({
      contractJoined: {
        finalizedDeployTxData: deployedMerc20Contract.deployTxData.public,
      },
    });
    return new MERC20API(deployedMerc20Contract, providers, logger);
  }

  private static async getPrivateState(providers: MERC20Providers): Promise<MERC20PrivateState> {
    const existingPrivateState = await providers.privateStateProvider.get('MERC20PrivateState');
    return existingPrivateState ?? createMERC20PrivateState(utils.randomBytes(32));
  }
}

function stringToBytes32(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, 'hex'));
}

/**
 * A namespace that represents the exports from the `'utils'` sub-package.
 *
 * @public
 */
export * as utils from './utils/index.js';

export * from './common-types.js';