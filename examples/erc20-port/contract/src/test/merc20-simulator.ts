import { type CircuitContext, QueryContext, sampleContractAddress, constructorContext } from '@midnight-ntwrk/compact-runtime';
import { Contract, type Ledger, ledger } from '../managed/erc20/contract/index.cjs';
import { MERC20PrivateState, witnesses } from '../witnesses.js';

export class MERC20Simulator {
  readonly contract: Contract<MERC20PrivateState>; // No private state in the contract itself
  circuitContext: CircuitContext<MERC20PrivateState>;

  constructor(initialSupply: bigint, mintAddress: string, name: string, symbol: string, decimals: number, deployerSk?: Uint8Array) {
    this.contract = new Contract<MERC20PrivateState>(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } = this.contract.initialState(
      constructorContext({ secretKey: deployerSk || new Uint8Array() }, '0'.repeat(64)),
      initialSupply,
      Uint8Array.from(Buffer.from(mintAddress, 'hex')),
      name,
      symbol,
      BigInt(decimals)
    );
    this.circuitContext = {
      currentPrivateState,
      currentZswapLocalState,
      originalState: currentContractState,
      transactionContext: new QueryContext(currentContractState.data, sampleContractAddress()),
    };
  }

  public setSk(sk: Uint8Array): void {
    this.circuitContext.currentPrivateState = { ...this.circuitContext.currentPrivateState, secretKey: sk };
  }

  public getLedger(): Ledger {
    return ledger(this.circuitContext.transactionContext.state);
  }

  public transfer(to: Uint8Array, amount: bigint): Ledger {
    const witnessProvider = (witnessName: string) => {
      if (witnessName === 'get_secret_key') {
        return Buffer.from("").toString('hex');
      }
      throw new Error(`Unknown witness: ${witnessName}`);
    };
    const tempContext = { ...this.circuitContext, witnessProvider };
    this.circuitContext = this.contract.impureCircuits.transfer(tempContext, to, amount).context;
    return this.getLedger();
  }

  public approve(spender: Uint8Array, amount: bigint): Ledger {
    const witnessProvider = (witnessName: string) => {
      if (witnessName === 'get_secret_key') {
        return Buffer.from("").toString('hex');
      }
      throw new Error(`Unknown witness: ${witnessName}`);
    };
    const tempContext = { ...this.circuitContext, witnessProvider };
    this.circuitContext = this.contract.impureCircuits.approve(tempContext, spender, amount).context;
    return this.getLedger();
  }

  public transferFrom(from: Uint8Array, to: Uint8Array, amount: bigint): Ledger {
    const witnessProvider = (witnessName: string) => {
      if (witnessName === 'get_secret_key') {
        return Buffer.from("").toString('hex');
      }
      throw new Error(`Unknown witness: ${witnessName}`);
    };
    const tempContext = { ...this.circuitContext, witnessProvider };
    this.circuitContext = this.contract.impureCircuits.transferFrom(tempContext, from, to, amount ).context;
    return this.getLedger();
  }

  public balanceOf(address: Uint8Array): bigint {
    const ledgerState = this.getLedger();
    return ledgerState.balances.member(address) ? ledgerState.balances.lookup(address) : BigInt(0);
  }

  public allowance(owner: Uint8Array, spender: Uint8Array): bigint {
    const ledgerState = this.getLedger();
    if (ledgerState.allowances.member(owner)) {
      const ownerAllowances = ledgerState.allowances.lookup(owner);
      return ownerAllowances.member(spender) ? ownerAllowances.lookup(spender) : BigInt(0);
    }
    return BigInt(0);
  }
}