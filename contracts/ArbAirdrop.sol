// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "./interfaces/IArbAirdrop.sol";
import "./Endpoint.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title ArbAirdrop
 * @notice This contract implements an airdrop system using Merkle trees for efficient and secure distribution of tokens.
 * It allows the contract owner to register Merkle roots for each week and users to claim tokens by providing a valid Merkle proof.
 * The contract also integrates with a sanctions contract to prevent sanctioned addresses from claiming tokens.
 */
contract ArbAirdrop is OwnableUpgradeable, IArbAirdrop {
    address token;
    address sanctions;
    uint32 pastWeeks;

    event InitializationStep(uint256 step);
    mapping(uint32 => bytes32) merkleRoots;
    mapping(uint32 => mapping(address => uint256)) claimed;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract with the token and sanctions addresses
     * @param _token The address of the token to be airdropped
     * @param _sanctions The address of the sanctions contract
     */
    function initialize(address _token, address _sanctions)
        external
        initializer
    {
        emit InitializationStep(0);
        __Ownable_init();
        token = _token;
        sanctions = _sanctions;
        emit InitializationStep(1);
    }

    function isInitialized() public view returns (bool) {
        return _getInitializedVersion() > 0;
    }

    /**
     * @notice Registers a Merkle root for a specific week
     * @param week The week number
     * @param merkleRoot The Merkle root for the given week
     */
    function registerMerkleRoot(uint32 week, bytes32 merkleRoot)
        external
        onlyOwner
    {
        pastWeeks += 1;
        require(week == pastWeeks, "Invalid week provided.");
        merkleRoots[week] = merkleRoot;
    }

    /**
     * @notice Verifies the Merkle proof for a specific claim
     * @param week The week number
     * @param sender The address of the claimant
     * @param totalAmount The total amount of tokens to be claimed
     * @param proof The Merkle proof for the claim
     */
    function _verifyProof(
        uint32 week,
        address sender,
        uint256 totalAmount,
        bytes32[] calldata proof
    ) internal {
        require(claimed[week][sender] == 0, "Already claimed.");
        require(
            merkleRoots[week] != bytes32(0),
            "Week hasn't been registered."
        );
        require(
            !ISanctionsList(sanctions).isSanctioned(sender),
            "address is sanctioned."
        );
        bytes32 leaf = keccak256(
            bytes.concat(keccak256(abi.encode(sender, totalAmount)))
        );
        bool isValidLeaf = MerkleProof.verify(proof, merkleRoots[week], leaf);
        require(isValidLeaf, "Invalid proof.");
        claimed[week][sender] = totalAmount;
    }

    /**
     * @notice Claims tokens for a specific week
     * @param week The week number
     * @param totalAmount The total amount of tokens to be claimed
     * @param proof The Merkle proof for the claim
     */
    function _claim(
        uint32 week,
        uint256 totalAmount,
        bytes32[] calldata proof
    ) internal {
        _verifyProof(week, msg.sender, totalAmount, proof);
        SafeERC20.safeTransfer(IERC20(token), msg.sender, totalAmount);
        emit ClaimArb(msg.sender, week, totalAmount);
    }

    /**
     * @notice Claims tokens for multiple weeks in a single transaction
     * @param claimProofs An array of ClaimProof structs containing the week, total amount, and Merkle proof for each claim
     */
    function claim(ClaimProof[] calldata claimProofs) external {
        for (uint32 i = 0; i < claimProofs.length; i++) {
            _claim(
                claimProofs[i].week,
                claimProofs[i].totalAmount,
                claimProofs[i].proof
            );
        }
    }

    /**
     * @notice Retrieves the claimed amounts for a specific account
     * @param account The address of the account
     * @return An array of claimed amounts for each week
     */
    function getClaimed(address account)
        external
        view
        returns (uint256[] memory)
    {
        uint256[] memory result = new uint256[](pastWeeks + 1);
        for (uint32 week = 1; week <= pastWeeks; week++) {
            result[week] = claimed[week][account];
        }
        return result;
    }
}
