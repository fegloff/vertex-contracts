// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../Verifier.sol";

contract MockSequencer {
    uint64 public nSubmissions;
    mapping(uint64 => bytes32) public submittedTransactions;
    Verifier public verifier;

    event TransactionsSubmitted(uint64 indexed idx, uint256 count);

    constructor(address _verifier) {
        verifier = Verifier(_verifier);
    }

    function submitTransactionsChecked(
        uint64 idx,
        bytes[] calldata transactions,
        bytes32 e,
        bytes32 s
    ) external {
        require(idx == nSubmissions, "Invalid submission index");

        bytes32 digest = keccak256(abi.encode(idx));
        for (uint256 i = 0; i < transactions.length; ++i) {
            digest = keccak256(abi.encodePacked(digest, transactions[i]));
        }

        // Use the actual Verifier contract for signature verification
        verifier.requireValidSignature(digest, e, s, 7); // Assuming 7 is the signer bitmask

        for (uint256 i = 0; i < transactions.length; i++) {
            bytes32 txHash = keccak256(transactions[i]);
            submittedTransactions[nSubmissions + uint64(i)] = txHash;
        }

        nSubmissions += uint64(transactions.length);

        emit TransactionsSubmitted(idx, transactions.length);
    }

    function submitTransactionsCheckedWithGasLimit(
        uint64 idx,
        bytes[] calldata transactions,
        uint256 gasLimit
    ) external {
        require(idx == nSubmissions, "Invalid submission index");

        uint256 gasUsed = gasleft();

        for (uint256 i = 0; i < transactions.length; i++) {
            bytes32 txHash = keccak256(transactions[i]);
            submittedTransactions[nSubmissions + uint64(i)] = txHash;

            if (gasUsed - gasleft() > gasLimit) {
                verifier.revertGasInfo(i, gasUsed);
            }
        }

        nSubmissions += uint64(transactions.length);

        verifier.revertGasInfo(transactions.length, gasUsed - gasleft());

        emit TransactionsSubmitted(idx, transactions.length);
    }

    function getSubmittedTransaction(uint64 index) external view returns (bytes32) {
        return submittedTransactions[index];
    }
}