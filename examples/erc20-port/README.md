# ERC-20 port (MERC-20) and DApp

This example implements a port of the Ethereum ERC-20 standard in 
Compact. The smart contract's ledger is fully unshielded, and the smart
contract retains a full mapping of all users' balances and allowances.

The `erc20-cli` directory contains a dApp that can be used to deploy
a MERC-20 contract and interact with it (such as sending tokens and 
viewing balances).