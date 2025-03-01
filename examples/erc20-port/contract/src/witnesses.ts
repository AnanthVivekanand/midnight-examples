import { Ledger } from './managed/erc20/contract/index.cjs';
import { WitnessContext } from '@midnight-ntwrk/compact-runtime';

export type MERC20PrivateState = {
  readonly secretKey: Uint8Array;
};

export const createMERC20PrivateState = (secretKey: Uint8Array) => ({
  secretKey,
});

export const witnesses = {
  get_secret_key: ({ privateState }: WitnessContext<Ledger, MERC20PrivateState>): [MERC20PrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
};
