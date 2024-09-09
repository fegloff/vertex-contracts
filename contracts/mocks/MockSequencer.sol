// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IEndpoint.sol";
import "../interfaces/IOffchainExchange.sol";
import "../interfaces/clearinghouse/IClearinghouse.sol";

contract MockSequencer {
    uint64 public nSubmissions;
    IEndpoint public endpoint;
    IOffchainExchange public offchainExchange;
    IClearinghouse public clearinghouse;

    event TransactionProcessed(uint8 txType, bytes txData);
    event LogTransactionDetails(uint8 txType, uint256 transactionLength);
    event MockMatchAttempt(uint32 productId, int128 takerAmount, int128 baseDelta, int128 quoteDelta, int128 takerPriceX18);

    constructor(address _endpoint, address _offchainExchange, address _clearinghouse) {
        endpoint = IEndpoint(_endpoint);
        offchainExchange = IOffchainExchange(_offchainExchange);
        clearinghouse = IClearinghouse(_clearinghouse);
    }

    function submitTransactionsCheckedWithGasLimit(
        uint64 idx,
        bytes[] calldata transactions,
        uint256 gasLimit
    ) external {
        require(idx == nSubmissions, "Invalid submission index");

        uint256 initialGas = gasleft();

        for (uint256 i = 0; i < transactions.length; i++) {
            _processTransaction(transactions[i]);

            if (initialGas - gasleft() > gasLimit) {
                revert("Gas limit exceeded");
            }
        }
        nSubmissions += uint64(transactions.length);
    }

    function _processTransaction(bytes calldata transaction) internal {
        require(transaction.length > 0, "Transaction data is empty");
        uint8 txType = uint8(transaction[0]);
        emit LogTransactionDetails(txType, transaction.length);

        if (txType == uint8(IEndpoint.TransactionType.DepositCollateral)) {
            _processDepositCollateral(transaction);
            endpoint.executeSlowModeTransactionImmediately();
        } else if (txType == uint8(IEndpoint.TransactionType.MatchOrderAMM)) {
            _processMatchOrderAMM(transaction);
        } else if (txType == uint8(IEndpoint.TransactionType.ExecuteSlowMode)) {
            endpoint.executeSlowModeTransactionImmediately();
        } else if (txType == uint8(IEndpoint.TransactionType.WithdrawCollateral)) {
            _processWithdrawCollateral(transaction);
        } else if (txType == uint8(IEndpoint.TransactionType.SettlePnl)) {
            _processSettlePnl(transaction);
        } else if (txType == uint8(IEndpoint.TransactionType.SpotTick)) {
            _processSubmitTransactionsCheckedWithGasLimit(transaction);
        } else if (txType == uint8(IEndpoint.TransactionType.PerpTick)) {
            _processSubmitTransactionsCheckedWithGasLimit(transaction);
        } else {
            revert(string(abi.encodePacked("Unsupported transaction type: ", uint8ToString(txType))));
        }
        emit TransactionProcessed(txType, transaction);
    }

    function uint8ToString(uint8 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint8 temp = value;
        uint8 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint8(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    function _processSubmitTransactionsCheckedWithGasLimit(bytes calldata transaction) internal {
        // Decode the transaction data
        (uint64 idx, bytes[] memory transactions, uint256 gasLimit) = abi.decode(transaction[1:], (uint64, bytes[], uint256));
        endpoint.submitTransactionsCheckedWithGasLimit(idx, transactions, gasLimit);
    }

    function _processDepositCollateral(bytes calldata transaction) internal {
        (, IEndpoint.DepositCollateral memory deposit) = abi.decode(transaction[1:], (uint8, IEndpoint.DepositCollateral));
        endpoint.depositCollateralWithReferral(deposit.sender, deposit.productId, deposit.amount, "");
    }

    function _processMatchOrderAMM(bytes calldata transaction) internal {
        (, IEndpoint.MatchOrderAMM memory matchOrderAMM) = abi.decode(transaction[1:], (uint8, IEndpoint.MatchOrderAMM));
        emit MockMatchAttempt(
            matchOrderAMM.productId,
            matchOrderAMM.taker.order.amount,
            matchOrderAMM.baseDelta,
            matchOrderAMM.quoteDelta,
            matchOrderAMM.taker.order.priceX18
        );
        address takerLinkedSigner = endpoint.getLinkedSigner(matchOrderAMM.taker.order.sender);
        IOffchainExchange(offchainExchange).matchOrderAMM(matchOrderAMM, takerLinkedSigner);
    }

    function _processWithdrawCollateral(bytes calldata transaction) internal {
        (, IEndpoint.WithdrawCollateral memory withdraw) = abi.decode(transaction[1:], (uint8, IEndpoint.WithdrawCollateral));
        clearinghouse.withdrawCollateral(withdraw.sender, withdraw.productId, withdraw.amount, address(0));
    }

    function _processSettlePnl(bytes calldata transaction) internal {
        (, IEndpoint.SettlePnl memory settlePnl) = abi.decode(transaction[1:], (uint8, IEndpoint.SettlePnl));
        clearinghouse.settlePnl(settlePnl);
    }
}