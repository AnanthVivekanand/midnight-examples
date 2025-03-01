/**
 * MERC-20 common types and abstractions.
 *
 * @module
 */

import { type MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { type FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { MERC20PrivateState, Contract, Witnesses } from 'midnight-erc20-port';

/**
 * The private states consumed throughout the application.
 *
 * @remarks
 * {@link PrivateStates} defines the schema for private states used by MERC-20 contracts.
 * Each key corresponds to a contract type, and the type represents the private state expected.
 */
export type PrivateStates = {
  /**
   * Key used to provide the private state for {@link MERC20Contract} deployments.
   */
  readonly MERC20PrivateState: MERC20PrivateState;
};

/**
 * Represents a MERC-20 contract and its private state.
 */
export type MERC20Contract = Contract<MERC20PrivateState, Witnesses<MERC20PrivateState>>;

/**
 * The keys of the circuits exported from {@link Merc20Contract}.
 */
export type MERC20CircuitKeys = Exclude<keyof MERC20Contract['impureCircuits'], number | symbol>;

/**
 * The providers required by {@link Merc20Contract}.
 */
export type MERC20Providers = MidnightProviders<MERC20CircuitKeys, PrivateStates>;

/**
 * A {@link Merc20Contract} that has been deployed to the network.
 */
export type DeployedMERC20Contract = FoundContract<MERC20PrivateState, MERC20Contract>;

/**
 * A type that represents the derived combination of public (or ledger), and private state.
 */
export type MERC20DerivedState = {
  readonly userBalance: bigint;
  readonly tokenName: string;
  readonly tokenSymbol: string;
  readonly tokenDecimals: bigint;
  readonly totalSupply: bigint;
};