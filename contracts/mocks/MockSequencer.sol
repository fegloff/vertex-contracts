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
    event ErrorOccurred(string functionName, string errorMessage);
    event DebugLog(string message, bytes data);
    event DetailedError(string functionName, bytes errorData);

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
            emit DebugLog("Processing transaction", transactions[i]);
            try this.processTransactionWithLogging(transactions[i]) {
                // Transaction processed successfully
            } catch Error(string memory reason) {
                emit ErrorOccurred("submitTransactionsCheckedWithGasLimit", reason);
                revert(string(abi.encodePacked("Transaction ", uint2str(i), " failed: ", reason)));
            } catch Panic(uint errorCode) {
                string memory panicReason = getPanicReason(errorCode);
                emit ErrorOccurred("submitTransactionsCheckedWithGasLimit", panicReason);
                revert(string(abi.encodePacked("Transaction ", uint2str(i), " failed with panic: ", panicReason)));
            } catch (bytes memory lowLevelData) {
                string memory errorMsg = decodeLowLevelError(lowLevelData);
                emit ErrorOccurred("submitTransactionsCheckedWithGasLimit", errorMsg);
                revert(string(abi.encodePacked("Transaction ", uint2str(i), " failed: ", errorMsg)));
            }
        }

        if (initialGas - gasleft() > gasLimit) {
            emit ErrorOccurred("submitTransactionsCheckedWithGasLimit", "Low level error");
            revert("Gas limit exceeded");
        }
        
        nSubmissions += uint64(transactions.length);
    }

    

    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    function getPanicReason(uint errorCode) internal pure returns (string memory) {
        if (errorCode == 0x01) return "Assertion failed";
        if (errorCode == 0x11) return "Arithmetic operation underflowed or overflowed";
        if (errorCode == 0x12) return "Division or modulo by zero";
        if (errorCode == 0x21) return "Tried to convert a value into an enum out of its range";
        if (errorCode == 0x22) return "Accessed storage byte array that is incorrectly encoded";
        if (errorCode == 0x31) return "Called pop() on an empty array";
        if (errorCode == 0x32) return "Array index out of bounds";
        if (errorCode == 0x41) return "Allocated too much memory or created an array which is too large";
        if (errorCode == 0x51) return "Called a zero-initialized variable of internal function type";
        return string(abi.encodePacked("Unknown panic code: ", uint2str(errorCode)));
    }

    function decodeLowLevelError(bytes memory lowLevelData) internal pure returns (string memory) {
        if (lowLevelData.length == 0) return "Unknown low-level error";
        
        // Try to decode revert reason
        if (lowLevelData.length > 4) {
            // Extract the error selector (first 4 bytes)
            bytes4 errorSelector;
            assembly {
                errorSelector := mload(add(lowLevelData, 32))
            }
            
            // Check if the error data matches the Error(string) signature
            if (errorSelector == bytes4(keccak256("Error(string)"))) {
                // Decode the error message
                bytes memory strBytes;
                assembly {
                    strBytes := add(lowLevelData, 36)  // 32 (length) + 4 (selector)
                }
                string memory reason = abi.decode(strBytes, (string));
                return string(abi.encodePacked("Error: ", reason));
            }
            // Check if the error data matches the Panic(uint256) signature
            else if (errorSelector == bytes4(keccak256("Panic(uint256)"))) {
                uint256 code;
                assembly {
                    code := mload(add(lowLevelData, 36))  // 32 (length) + 4 (selector)
                }
                return string(abi.encodePacked("Panic: ", getPanicReason(uint(code))));
            }
        }

        // If we can't decode, return the hex representation
        return string(abi.encodePacked("Low-level error: 0x", bytesToHex(lowLevelData)));
    }

    function bytesToHex(bytes memory buffer) internal pure returns (string memory) {
        bytes memory converted = new bytes(buffer.length * 2);
        bytes memory _base = "0123456789abcdef";

        for (uint256 i = 0; i < buffer.length; i++) {
            converted[i * 2] = _base[uint8(buffer[i]) / 16];
            converted[i * 2 + 1] = _base[uint8(buffer[i]) % 16];
        }

        return string(converted);
    }

    function processTransactionWithLogging(bytes calldata transaction) external {
        require(msg.sender == address(this), "External call not allowed");
        
        uint8 txType = uint8(transaction[0]);
        emit LogTransactionDetails(txType, transaction.length);

        if (txType == uint8(IEndpoint.TransactionType.DepositCollateral)) {
            _processDepositCollateral(transaction);
        } else if (txType == uint8(IEndpoint.TransactionType.MatchOrderAMM)) {
            _processMatchOrderAMM(transaction);
        } else if (txType == uint8(IEndpoint.TransactionType.ExecuteSlowMode)) {
            _processExecuteSlowMode(transaction);
        } else if (txType == uint8(IEndpoint.TransactionType.WithdrawCollateral)) {
            _processWithdrawCollateral(transaction);
        } else if (txType == uint8(IEndpoint.TransactionType.SettlePnl)) {
            _processSettlePnl(transaction);
        } else if (txType == uint8(IEndpoint.TransactionType.SpotTick)) {
            _processSubmitTransactionsCheckedWithGasLimit(transaction);
        } else if (txType == uint8(IEndpoint.TransactionType.PerpTick)) {
            _processSubmitTransactionsCheckedWithGasLimit(transaction);
        } else {
            emit DebugLog("Unsupported transaction type", transaction);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 
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

    function _processExecuteSlowMode(bytes calldata transaction) internal {
        emit DebugLog("Processing _processExecuteSlowMode", transaction); 
        try endpoint.executeSlowModeTransactionImmediately() {
        } catch Error(string memory reason) {
            emit ErrorOccurred("_processExecuteSlowMode", reason);
            revert(reason);
        } catch (bytes memory lowLevelData) {
            emit ErrorOccurred("_processExecuteSlowMode", "Low level error");
            emit DebugLog("Low level error data _processSubmitTransactionsCheckedWithGasLimit", lowLevelData);
            revert("Process Execute slow mode failed with low level error");
        }
    }

    function _processSubmitTransactionsCheckedWithGasLimit(bytes calldata transaction) internal {
        emit DebugLog("Processing _processSubmitTransactionsCheckedWithGasLimit", transaction); 
        (uint64 idx, bytes[] memory transactions, uint256 gasLimit) = abi.decode(transaction[1:], (uint64, bytes[], uint256));
        try endpoint.submitTransactionsCheckedWithGasLimit(idx, transactions, gasLimit) {
        } catch Error(string memory reason) {
            emit ErrorOccurred("_processSubmitTransactionsCheckedWithGasLimit", reason);
            revert(reason);
        } catch (bytes memory lowLevelData) {
            emit ErrorOccurred("_processSubmitTransactionsCheckedWithGasLimit", "Low level error");
            emit DebugLog("Low level error data _processSubmitTransactionsCheckedWithGasLimit", lowLevelData);
            revert("Submit Transaction Checked with gas limite failed with low level error");
        }
    }

    function _processDepositCollateral(bytes calldata transaction) internal {
        emit DebugLog("Processing DepositCollateral", transaction);
        (, IEndpoint.DepositCollateral memory deposit) = abi.decode(transaction[1:], (uint8, IEndpoint.DepositCollateral));
        try endpoint.depositCollateralWithReferral(deposit.sender, deposit.productId, deposit.amount, "") {
        } catch Error(string memory reason) {
            emit ErrorOccurred("_processDepositCollateral", reason);
            revert(reason);
        } catch (bytes memory lowLevelData) {
            emit ErrorOccurred("_processDepositCollateral", "Low level error");
            emit DebugLog("Low level error data _processDepositCollateral", lowLevelData);
            revert("Deposit collateral failed with low level error");
        }
    }

    function _processMatchOrderAMM(bytes calldata transaction) internal {
         emit DebugLog("Processing MatchOrderAMM", transaction);
        (, IEndpoint.MatchOrderAMM memory matchOrderAMM) = abi.decode(transaction[1:], (uint8, IEndpoint.MatchOrderAMM));
        emit MockMatchAttempt(
            matchOrderAMM.productId,
            matchOrderAMM.taker.order.amount,
            matchOrderAMM.baseDelta,
            matchOrderAMM.quoteDelta,
            matchOrderAMM.taker.order.priceX18
        );
        address takerLinkedSigner = endpoint.getLinkedSigner(matchOrderAMM.taker.order.sender);
        try offchainExchange.matchOrderAMM(matchOrderAMM, takerLinkedSigner) {
            emit DebugLog("MatchOrderAMM successful", "");
        } catch Error(string memory reason) {
            emit ErrorOccurred("_processMatchOrderAMM", reason);
            revert(reason);
        } catch (bytes memory lowLevelData) {
            emit ErrorOccurred("_processMatchOrderAMM", "Low level error");
            
            revert("Match order AMM failed with low level error");
        }
    }

    function _processWithdrawCollateral(bytes calldata transaction) internal {
        emit DebugLog("Processing _processWithdrawCollateral", transaction); 
        (, IEndpoint.WithdrawCollateral memory withdraw) = abi.decode(transaction[1:], (uint8, IEndpoint.WithdrawCollateral));
        try  clearinghouse.withdrawCollateral(withdraw.sender, withdraw.productId, withdraw.amount, address(0)) {
        } catch Error(string memory reason) {
            emit ErrorOccurred("_processWithdrawCollateral", reason);
            revert(reason);
        } catch (bytes memory lowLevelData) {
            emit ErrorOccurred("_processWithdrawCollateral", "Low level error");
            emit DebugLog("Low level error data _processWithdrawCollateral", lowLevelData);
            revert("Withdraw collateral failed with low level error");
        }
    }

    function _processSettlePnl(bytes calldata transaction) internal {
        emit DebugLog("Processing _processSettlePnl", transaction); 
        (, IEndpoint.SettlePnl memory settlePnl) = abi.decode(transaction[1:], (uint8, IEndpoint.SettlePnl));
        try  clearinghouse.settlePnl(settlePnl) {

        } catch Error(string memory reason) {
            emit ErrorOccurred("_processSettlePnl", reason);
            revert(reason);
        } catch (bytes memory lowLevelData) {
            emit ErrorOccurred("_processSettlePnl", "Low level error");
            emit DebugLog("Low level error data _processSettlePnl", lowLevelData);
            revert("Withdraw collateral failed with low level error");
        }
    }
}