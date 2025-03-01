import React, { useCallback, useEffect, useState } from 'react';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import {
  Backdrop,
  CircularProgress,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  IconButton,
  Skeleton,
  Typography,
  TextField,
  Grid,
  Button,
  Divider,
  Box,
  Modal,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import PaymentIcon from '@mui/icons-material/Payment';
import CopyIcon from '@mui/icons-material/ContentPasteOutlined';
import StopIcon from '@mui/icons-material/HighlightOffOutlined';
import { type MERC20DerivedState, type DeployedMERC20API } from 'midnight-erc20-port-api';
import { useDeployedBoardContext } from '../hooks';
import { type BoardDeployment } from '../contexts';
import { type Observable } from 'rxjs';
import { EmptyCardContent } from './Board.EmptyCardContent';
import { type deploymentArgs } from '../contexts/BrowserDeployedBoardManager';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

/** The props required by the {@link Board} component. */
export interface BoardProps {
  /** The observable bulletin board deployment. */
  boardDeployment$?: Observable<BoardDeployment>;
}

/** Enum to track which operation panel is currently active */
enum OperationPanel {
  TRANSFER,
  APPROVE,
  TRANSFER_FROM,
  BALANCE_OF,
  ALLOWANCE,
}

/**
 * Provides the UI for a deployed ERC20 token contract; allowing users to check balances,
 * transfer tokens, and manage approvals.
 */
export const Board: React.FC<Readonly<BoardProps>> = ({ boardDeployment$ }) => {
  const boardApiProvider = useDeployedBoardContext();
  const [boardDeployment, setBoardDeployment] = useState<BoardDeployment>();
  const [deployedBoardAPI, setDeployedBoardAPI] = useState<DeployedMERC20API>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [boardState, setBoardState] = useState<MERC20DerivedState>();
  const [isWorking, setIsWorking] = useState(!!boardDeployment$);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);

  // New state for ERC20 operations
  const [activePanel, setActivePanel] = useState<OperationPanel>(OperationPanel.TRANSFER);
  const [transferTo, setTransferTo] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [approveSpender, setApproveSpender] = useState<string>('');
  const [approveAmount, setApproveAmount] = useState<string>('');
  const [transferFromSender, setTransferFromSender] = useState<string>('');
  const [transferFromRecipient, setTransferFromRecipient] = useState<string>('');
  const [transferFromAmount, setTransferFromAmount] = useState<string>('');
  const [balanceAddress, setBalanceAddress] = useState<string>('');
  const [balanceResult, setBalanceResult] = useState<string>();
  const [allowanceOwner, setAllowanceOwner] = useState<string>('');
  const [allowanceSpender, setAllowanceSpender] = useState<string>('');
  const [allowanceResult, setAllowanceResult] = useState<string>();

  // State for deployment modal
  const [tokenName, setTokenName] = useState<string>('');
  const [tokenSymbol, setTokenSymbol] = useState<string>('');
  const [tokenDecimals, setTokenDecimals] = useState<string>('18');
  const [totalSupply, setTotalSupply] = useState<string>('');
  const [mintAddress, setMintAddress] = useState<string>('');
  const [deploymentError, setDeploymentError] = useState<string>('');

  // Two simple callbacks that call `resolve(...)` to either deploy or join an ERC20 token
  // contract. Since the `DeployedBoardContext` will create a new board and update the UI, we
  // don't have to do anything further once we've called `resolve`.
  const onCreateBoard = useCallback(
    (args: deploymentArgs) => boardApiProvider.resolve(undefined, args),
    [boardApiProvider],
  );
  const onJoinBoard = useCallback(
    (contractAddress: ContractAddress) => boardApiProvider.resolve(contractAddress),
    [boardApiProvider],
  );

  // Handle opening the deployment modal
  const handleOpenDeployModal = useCallback(() => {
    setCreateModalOpen(true);
    setDeploymentError('');
  }, []);

  // Handle deployment form submission
  const handleDeploySubmit = useCallback(() => {
    setDeploymentError('');

    if (!tokenName || !tokenSymbol || !tokenDecimals || !totalSupply || !mintAddress) {
      setDeploymentError('All fields are required');
      return;
    }

    try {
      // Validate input types
      const decimals = BigInt(tokenDecimals);
      const supply = BigInt(totalSupply);

      const args: deploymentArgs = {
        tokenName,
        tokenSymbol,
        tokenDecimals: decimals,
        totalSupply: supply,
        mintAddress,
      };

      onCreateBoard(args);
      setCreateModalOpen(false);

      // Reset form fields
      setTokenName('');
      setTokenSymbol('');
      setTokenDecimals('18');
      setTotalSupply('');
      setMintAddress('');
    } catch (error) {
      setDeploymentError(error instanceof Error ? error.message : String(error));
    }
  }, [tokenName, tokenSymbol, tokenDecimals, totalSupply, mintAddress, onCreateBoard]);

  // Callback to handle token transfer
  const onTransfer = useCallback(async () => {
    if (!transferTo || !transferAmount) {
      return;
    }

    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        await deployedBoardAPI.transfer(transferTo, BigInt(transferAmount));
        setTransferTo('');
        setTransferAmount('');
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, transferTo, transferAmount]);

  // Callback to handle token approval
  const onApprove = useCallback(async () => {
    if (!approveSpender || !approveAmount) {
      return;
    }

    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        await deployedBoardAPI.approve(approveSpender, BigInt(approveAmount));
        setApproveSpender('');
        setApproveAmount('');
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, approveSpender, approveAmount]);

  // Callback to handle transferFrom
  const onTransferFrom = useCallback(async () => {
    if (!transferFromSender || !transferFromRecipient || !transferFromAmount) {
      return;
    }

    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        await deployedBoardAPI.transferFrom(transferFromSender, transferFromRecipient, BigInt(transferFromAmount));
        setTransferFromSender('');
        setTransferFromRecipient('');
        setTransferFromAmount('');
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, transferFromSender, transferFromRecipient, transferFromAmount]);

  // Callback to check balance
  const onCheckBalance = useCallback(async () => {
    if (!balanceAddress) {
      return;
    }

    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        const balance = await deployedBoardAPI.balanceOf(balanceAddress);
        setBalanceResult(balance.toString());
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, balanceAddress]);

  // Callback to check allowance
  const onCheckAllowance = useCallback(async () => {
    if (!allowanceOwner || !allowanceSpender) {
      return;
    }

    try {
      if (deployedBoardAPI) {
        setIsWorking(true);
        const allowance = await deployedBoardAPI.allowance(allowanceOwner, allowanceSpender);
        setAllowanceResult(allowance.toString());
      }
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsWorking(false);
    }
  }, [deployedBoardAPI, allowanceOwner, allowanceSpender]);

  const onCopyContractAddress = useCallback(async () => {
    if (deployedBoardAPI) {
      await navigator.clipboard.writeText(deployedBoardAPI.deployedContractAddress);
    }
  }, [deployedBoardAPI]);

  // Subscribes to the `boardDeployment$` observable so that we can receive updates on the deployment.
  useEffect(() => {
    if (!boardDeployment$) {
      return;
    }

    const subscription = boardDeployment$.subscribe(setBoardDeployment);

    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment$]);

  // Subscribes to the `state$` observable on a `DeployedMERC20API` if we receive one
  useEffect(() => {
    if (!boardDeployment) {
      return;
    }
    if (boardDeployment.status === 'in-progress') {
      return;
    }

    setIsWorking(false);

    if (boardDeployment.status === 'failed') {
      setErrorMessage(
        boardDeployment.error.message.length ? boardDeployment.error.message : 'Encountered an unexpected error.',
      );
      return;
    }

    setDeployedBoardAPI(boardDeployment.api);
    const subscription = boardDeployment.api.state$.subscribe(setBoardState);
    return () => {
      subscription.unsubscribe();
    };
  }, [boardDeployment, setIsWorking, setErrorMessage, setDeployedBoardAPI]);

  // Render the appropriate operation panel based on activePanel state
  const renderOperationPanel = () => {
    switch (activePanel) {
      case OperationPanel.TRANSFER:
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Transfer Tokens
            </Typography>
            <TextField
              label="Recipient Address"
              variant="outlined"
              fullWidth
              InputLabelProps={{ shrink: true, style: { color: 'black' } }}
              margin="dense"
              value={transferTo}
              onChange={(e) => {
                setTransferTo(e.target.value);
              }}
            />
            <TextField
              label="Amount"
              variant="outlined"
              InputLabelProps={{ shrink: true, style: { color: 'black' } }}
              fullWidth
              margin="dense"
              value={transferAmount}
              onChange={(e) => {
                setTransferAmount(e.target.value);
              }}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={onTransfer}
              disabled={!transferTo || !transferAmount}
              sx={{ mt: 1 }}
            >
              Transfer
            </Button>
          </Box>
        );

      case OperationPanel.APPROVE:
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Approve Spending
            </Typography>
            <TextField
              label="Spender Address"
              variant="outlined"
              fullWidth
              InputLabelProps={{ shrink: true, style: { color: 'black' } }}
              margin="dense"
              value={approveSpender}
              onChange={(e) => {
                setApproveSpender(e.target.value);
              }}
            />
            <TextField
              label="Amount"
              variant="outlined"
              fullWidth
              margin="dense"
              InputLabelProps={{ shrink: true, style: { color: 'black' } }}
              value={approveAmount}
              onChange={(e) => {
                setApproveAmount(e.target.value);
              }}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={onApprove}
              disabled={!approveSpender || !approveAmount}
              sx={{ mt: 1 }}
            >
              Approve
            </Button>
          </Box>
        );

      case OperationPanel.TRANSFER_FROM:
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Transfer From
            </Typography>
            <TextField
              label="From Address"
              variant="outlined"
              fullWidth
              InputLabelProps={{ shrink: true, style: { color: 'black' } }}
              margin="dense"
              value={transferFromSender}
              onChange={(e) => {
                setTransferFromSender(e.target.value);
              }}
            />
            <TextField
              label="To Address"
              variant="outlined"
              InputLabelProps={{ shrink: true, style: { color: 'black' } }}
              fullWidth
              margin="dense"
              value={transferFromRecipient}
              onChange={(e) => {
                setTransferFromRecipient(e.target.value);
              }}
            />
            <TextField
              label="Amount"
              variant="outlined"
              InputLabelProps={{ shrink: true, style: { color: 'black' } }}
              fullWidth
              margin="dense"
              value={transferFromAmount}
              onChange={(e) => {
                setTransferFromAmount(e.target.value);
              }}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={onTransferFrom}
              disabled={!transferFromSender || !transferFromRecipient || !transferFromAmount}
              sx={{ mt: 1 }}
            >
              Transfer From
            </Button>
          </Box>
        );

      case OperationPanel.BALANCE_OF:
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Check Balance
            </Typography>
            <TextField
              label="Address"
              variant="outlined"
              fullWidth
              InputLabelProps={{ shrink: true, style: { color: 'black' } }}
              margin="dense"
              value={balanceAddress}
              onChange={(e) => {
                setBalanceAddress(e.target.value);
              }}
            />
            <Button variant="contained" fullWidth onClick={onCheckBalance} disabled={!balanceAddress} sx={{ mt: 1 }}>
              Check Balance
            </Button>
            {balanceResult && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Balance: {balanceResult} {boardState?.tokenSymbol}
              </Typography>
            )}
          </Box>
        );

      case OperationPanel.ALLOWANCE:
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Check Allowance
            </Typography>
            <TextField
              label="Owner Address"
              variant="outlined"
              fullWidth
              margin="dense"
              InputLabelProps={{ shrink: true, style: { color: 'black' } }}
              value={allowanceOwner}
              onChange={(e) => {
                setAllowanceOwner(e.target.value);
              }}
            />
            <TextField
              label="Spender Address"
              variant="outlined"
              fullWidth
              margin="dense"
              InputLabelProps={{ shrink: true, style: { color: 'black' } }}
              value={allowanceSpender}
              onChange={(e) => {
                setAllowanceSpender(e.target.value);
              }}
            />
            <Button
              variant="contained"
              fullWidth
              onClick={onCheckAllowance}
              disabled={!allowanceOwner || !allowanceSpender}
              sx={{ mt: 1 }}
            >
              Check Allowance
            </Button>
            {allowanceResult && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Allowance: {allowanceResult} {boardState?.tokenSymbol}
              </Typography>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Card sx={{ position: 'relative', width: 400, minWidth: 400, minHeight: 450 }} color="primary">
      {!boardDeployment$ && (
        <EmptyCardContent onCreateBoardCallback={handleOpenDeployModal} onJoinBoardCallback={onJoinBoard} />
      )}

      {boardDeployment$ && (
        <React.Fragment>
          <Backdrop
            sx={{ position: 'absolute', color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={isWorking}
          >
            <CircularProgress data-testid="board-working-indicator" />
          </Backdrop>
          <Backdrop
            sx={{ position: 'absolute', color: '#ff0000', zIndex: (theme) => theme.zIndex.drawer + 1 }}
            open={!!errorMessage}
          >
            <StopIcon fontSize="large" />
            <Typography component="div" data-testid="board-error-message">
              {errorMessage}
            </Typography>
          </Backdrop>
          <CardHeader
            avatar={boardState ? <AccountBalanceWalletIcon /> : <Skeleton variant="circular" width={20} height={20} />}
            titleTypographyProps={{ color: 'primary' }}
            title={toShortFormatContractAddress(deployedBoardAPI?.deployedContractAddress) ?? 'Loading...'}
            action={
              deployedBoardAPI?.deployedContractAddress ? (
                <IconButton title="Copy contract address" onClick={onCopyContractAddress}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              ) : (
                <Skeleton variant="circular" width={20} height={20} />
              )
            }
          />
          <Divider />
          <CardContent className="text-black">
            {boardState ? (
              <Grid container spacing={1} className="text-black">
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Token Name:</Typography>
                  <Typography variant="body2" gutterBottom>
                    {boardState.tokenName}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Symbol:</Typography>
                  <Typography variant="body2" gutterBottom>
                    {boardState.tokenSymbol}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Decimals:</Typography>
                  <Typography variant="body2" gutterBottom>
                    {boardState.tokenDecimals.toString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Total Supply:</Typography>
                  <Typography variant="body2" gutterBottom>
                    {boardState.totalSupply.toString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Your Balance:</Typography>
                  <Typography variant="body1" gutterBottom color="primary">
                    {boardState.userBalance.toString()} {boardState.tokenSymbol}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  {renderOperationPanel()}
                </Grid>
              </Grid>
            ) : (
              <Skeleton variant="rectangular" width="100%" height={280} />
            )}
          </CardContent>
          <CardActions sx={{ justifyContent: 'center' }}>
            {deployedBoardAPI ? (
              <React.Fragment>
                <IconButton
                  title="Transfer"
                  onClick={() => {
                    setActivePanel(OperationPanel.TRANSFER);
                  }}
                  color={activePanel === OperationPanel.TRANSFER ? 'primary' : 'default'}
                >
                  <PaymentIcon />
                </IconButton>
                <IconButton
                  title="Approve"
                  onClick={() => {
                    setActivePanel(OperationPanel.APPROVE);
                  }}
                  color={activePanel === OperationPanel.APPROVE ? 'primary' : 'default'}
                >
                  <CurrencyExchangeIcon />
                </IconButton>
                <IconButton
                  title="Transfer From"
                  onClick={() => {
                    setActivePanel(OperationPanel.TRANSFER_FROM);
                  }}
                  color={activePanel === OperationPanel.TRANSFER_FROM ? 'primary' : 'default'}
                >
                  <PaymentIcon />
                </IconButton>
                <IconButton
                  title="Check Balance"
                  onClick={() => {
                    setActivePanel(OperationPanel.BALANCE_OF);
                  }}
                  color={activePanel === OperationPanel.BALANCE_OF ? 'primary' : 'default'}
                >
                  <AccountBalanceWalletIcon />
                </IconButton>
                <IconButton
                  title="Check Allowance"
                  onClick={() => {
                    setActivePanel(OperationPanel.ALLOWANCE);
                  }}
                  color={activePanel === OperationPanel.ALLOWANCE ? 'primary' : 'default'}
                >
                  <CurrencyExchangeIcon />
                </IconButton>
              </React.Fragment>
            ) : (
              <Skeleton variant="rectangular" width={250} height={20} />
            )}
          </CardActions>
        </React.Fragment>
      )}

      {/* ERC20 Token Deployment Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
        }}
        aria-labelledby="modal-create-token"
        aria-describedby="modal-create-erc20-token-contract"
      >
        <Box sx={modalStyle}>
          <Typography id="modal-create-token" variant="h6" component="h2" sx={{ mb: 2 }}>
            Create New ERC20 Token
          </Typography>

          {deploymentError && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }} data-testid="deployment-error">
              {deploymentError}
            </Typography>
          )}

          <TextField
            label="Token Name"
            fullWidth
            InputLabelProps={{ shrink: true, style: { color: 'black' } }}
            value={tokenName}
            onChange={(e) => {
              setTokenName(e.target.value);
            }}
            placeholder="e.g. My Token"
            data-testid="token-name-input"
            required
          />

          <TextField
            label="Token Symbol"
            fullWidth
            margin="dense"
            InputLabelProps={{ shrink: true, style: { color: 'black' } }}
            value={tokenSymbol}
            onChange={(e) => {
              setTokenSymbol(e.target.value);
            }}
            placeholder="e.g. MTK"
            data-testid="token-symbol-input"
            required
          />

          <TextField
            label="Decimals"
            fullWidth
            margin="dense"
            value={tokenDecimals}
            InputLabelProps={{ shrink: true, style: { color: 'black' } }}
            onChange={(e) => {
              setTokenDecimals(e.target.value);
            }}
            placeholder="18"
            helperText="Standard is 18"
            data-testid="token-decimals-input"
            required
          />

          <TextField
            label="Total Supply"
            fullWidth
            margin="dense"
            value={totalSupply}
            InputLabelProps={{ shrink: true, style: { color: 'black' } }}
            onChange={(e) => {
              setTotalSupply(e.target.value);
            }}
            placeholder="1000000"
            data-testid="token-supply-input"
            required
          />

          <TextField
            label="Mint Address"
            fullWidth
            margin="dense"
            value={mintAddress}
            onChange={(e) => {
              setMintAddress(e.target.value);
            }}
            placeholder="0x..."
            helperText="Address that will receive the initial token supply"
            data-testid="mint-address-input"
            required
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                setCreateModalOpen(false);
              }}
              data-testid="cancel-deploy-btn"
              sx={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={handleDeploySubmit} data-testid="submit-deploy-btn" sx={{ flex: 1 }}>
              Deploy Token
            </Button>
          </Box>
        </Box>
      </Modal>
    </Card>
  );
};

/** @internal */
const toShortFormatContractAddress = (contractAddress: ContractAddress | undefined): JSX.Element | undefined =>
  // Returns a new string made up of the first, and last, 8 characters of a given contract address.
  contractAddress ? (
    <span data-testid="board-address">
      0x{contractAddress?.replace(/^[A-Fa-f0-9]{6}([A-Fa-f0-9]{8}).*([A-Fa-f0-9]{8})$/g, '$1...$2')}
    </span>
  ) : undefined;
