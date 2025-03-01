import { it, describe, expect } from '@jest/globals';
import { MERC20Simulator } from './merc20-simulator.js';
import { NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { utils } from 'midnight-erc20-port-api';
import { pureCircuits } from '../index';

setNetworkId(NetworkId.Undeployed);

describe('MERC-20 smart contract', () => {
  it('generates initial ledger state deterministically', () => {
    const addy = getRandomAddress();
    const simulator0 = new MERC20Simulator(BigInt(1000), addy, 'TestToken', 'TTK', 18);
    const simulator1 = new MERC20Simulator(BigInt(1000), addy, 'TestToken', 'TTK', 18);
    // console.log("Ledger 0: ", simulator0.getLedger());
    // console.log("Ledger 1: ", simulator1.getLedger());

    // expect tokenName, decimals, totalSupply, and tokenSymbol to be the same
    expect(simulator0.getLedger().tokenName).toEqual(simulator1.getLedger().tokenName);
    expect(simulator0.getLedger().tokenDecimals).toEqual(simulator1.getLedger().tokenDecimals);
    expect(simulator0.getLedger().totalSupply).toEqual(simulator1.getLedger().totalSupply);
    expect(simulator0.getLedger().tokenSymbol).toEqual(simulator1.getLedger().tokenSymbol);
  });

  it('properly initializes ledger state', () => {
    const deployerSk = utils.randomBytes(32)
    const deployerAddressBytes = pureCircuits.compute_address(deployerSk);
    const deployerAddress = Buffer.from(deployerAddressBytes).toString('hex');
    const simulator = new MERC20Simulator(BigInt(1000), deployerAddress, 'TestToken', 'TTK', 18, deployerSk);
    const initialLedgerState = simulator.getLedger();
    expect(initialLedgerState.tokenName).toEqual('TestToken');
    expect(initialLedgerState.tokenSymbol).toEqual('TTK');
    expect(initialLedgerState.tokenDecimals).toEqual(BigInt(18));
    expect(initialLedgerState.totalSupply).toEqual(BigInt(1000));
    expect(simulator.balanceOf(deployerAddressBytes)).toEqual(BigInt(1000));
    const otherAddress = utils.randomBytes(32);
    expect(simulator.balanceOf(otherAddress)).toEqual(BigInt(0));
    expect(initialLedgerState.allowances.size()).toEqual(0n); // Empty allowances
  });

  it('performs a transfer correctly', () => {
    const deployerSk = utils.randomBytes(32);
    const deployerAddressBytes = pureCircuits.compute_address(deployerSk);
    const deployerAddress = Buffer.from(deployerAddressBytes).toString('hex');
    const recipientSk = utils.randomBytes(32);
    const recipientAddress = pureCircuits.compute_address(recipientSk);
    const simulator = new MERC20Simulator(BigInt(1000), deployerAddress, 'TestToken', 'TTK', 18, deployerSk);
    simulator.transfer(recipientAddress, BigInt(300));
    expect(simulator.balanceOf(deployerAddressBytes)).toEqual(BigInt(700));
    expect(simulator.balanceOf(recipientAddress)).toEqual(BigInt(300));
    expect(simulator.getLedger().totalSupply).toEqual(BigInt(1000)); // Total supply unchanged
  });

  it('approves and performs transferFrom correctly', () => {
    const deployerSk = utils.randomBytes(32);
    const deployerAddress = pureCircuits.compute_address(deployerSk);
    const deployerAddressString = Buffer.from(deployerAddress).toString('hex');
    const spenderSk = utils.randomBytes(32);
    const spenderAddress = pureCircuits.compute_address(spenderSk);
    const recipientAddress = utils.randomBytes(32);
    const simulator = new MERC20Simulator(BigInt(1000), deployerAddressString, 'TestToken', 'TTK', 18, deployerSk);

    // Approve spender
    simulator.approve(spenderAddress, BigInt(400));
    expect(simulator.allowance(deployerAddress, spenderAddress)).toEqual(BigInt(400));

    // Perform transferFrom
    simulator.setSk(spenderSk);
    simulator.transferFrom(deployerAddress, recipientAddress, BigInt(250));
    expect(simulator.balanceOf(deployerAddress)).toEqual(BigInt(750));
    expect(simulator.balanceOf(recipientAddress)).toEqual(BigInt(250));
    expect(simulator.allowance(deployerAddress, spenderAddress)).toEqual(BigInt(150));
  });
});

function getRandomAddress(): string {
  return Buffer.from(utils.randomBytes(32)).toString('hex');
}