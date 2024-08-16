// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Perpetual.sol";

contract PerpetualFactory {
    mapping(bytes32 => address) public deployedContracts;
    
    event PerpetualDeployed(bytes32 tokenSymbol, address contractAddress);

    function deployPerpetual(
        bytes32 tokenSymbol,
        uint32 productId,
        bytes32 tokenPair,
        address perpEngine,
        address oracle
    ) external {
        require(deployedContracts[tokenSymbol] == address(0), "Contract already deployed for this token");

        Perpetual newPerpetual = new Perpetual(productId, tokenPair, perpEngine, oracle);
        deployedContracts[tokenSymbol] = address(newPerpetual);

        emit PerpetualDeployed(tokenSymbol, address(newPerpetual));
    }

    function getPerpetualAddress(bytes32 tokenSymbol) external view returns (address) {
        return deployedContracts[tokenSymbol];
    }
}