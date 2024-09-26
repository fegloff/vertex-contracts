// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract PerpOracle is Ownable {
    bool public useChainlink;
    mapping(bytes32 => address) public chainlinkFeeds;
    mapping(uint32 => uint256) public customPrices;
    mapping(uint32 => uint256) public lastUpdateTimestamp;

    event PriceUpdated(uint32 productId, uint256 price);
    event OracleModeChanged(bool useChainlink);
    event ChainlinkFeedSet(bytes32 tokenPair, address feedAddress);

    constructor(bool _useChainlink) Ownable() {
        useChainlink = _useChainlink;
    }

    function setOracleMode(bool _useChainlink) external onlyOwner {
        useChainlink = _useChainlink;
        emit OracleModeChanged(_useChainlink);
    }

    function setChainlinkFeed(bytes32 tokenPair, address feedAddress) external onlyOwner {
        require(feedAddress != address(0), "Invalid feed address");
        chainlinkFeeds[tokenPair] = feedAddress;
        emit ChainlinkFeedSet(tokenPair, feedAddress);
    }

    function setCustomPrice(uint32 productId, uint256 price) external onlyOwner {
        require(price > 0, "Price must be positive");
        customPrices[productId] = price;
        lastUpdateTimestamp[productId] = block.timestamp;
        emit PriceUpdated(productId, price);
    }

    function getPrice(uint32 productId, bytes32 tokenPair) external view returns (uint256) {
        if (useChainlink) {
            return getChainlinkPrice(tokenPair);
        } else {
            return getCustomPrice(productId);
        }
    }

    function getChainlinkPrice(bytes32 tokenPair) public view returns (uint256) {
        address feedAddress = chainlinkFeeds[tokenPair];
        require(feedAddress != address(0), "Chainlink feed not set for this token pair");
        
        AggregatorV3Interface feed = AggregatorV3Interface(feedAddress);
        (
            /* uint80 roundID */,
            int256 price,
            /* uint startedAt */,
            uint256 timeStamp,
            /* uint80 answeredInRound */
        ) = feed.latestRoundData();
        
        require(price > 0, "Invalid price from Chainlink");
        require(timeStamp > 0, "Round not complete");
        
        return uint256(price);
    }

    function getCustomPrice(uint32 productId) public view returns (uint256) {
        uint256 price = customPrices[productId];
        require(price > 0, "Custom price not set for this product");
        
        uint256 randomVariation = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, productId))) % 501;
        bool increase = randomVariation % 2 == 0;
        
        uint256 variation = price * randomVariation / 10000; // 0-5% variation
        
        if (increase) {
            return price + variation;
        } else {
            return (price > variation) ? price - variation : price / 2;
        }
    }

    function getLastUpdateTimestamp(uint32 productId) external view returns (uint256) {
        if (useChainlink) {
            // For Chainlink, we don't store the timestamp ourselves
            return 0; // You might want to handle this differently
        } else {
            return lastUpdateTimestamp[productId];
        }
    }

    // Helper function to create a token pair bytes32
    function createTokenPair(string memory base, string memory quote) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(base, "/", quote));
    }
}