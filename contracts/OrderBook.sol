pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract OrderBook is Ownable {
    struct Market {
        address contractAddress;
        bool isPerp;
    }

    mapping(uint32 => Market) public markets;

    event MarketAdded(uint32 productId, address contractAddress, bool isPerp);

    function addMarket(uint32 productId, address contractAddress, bool isPerp) external onlyOwner {
        require(markets[productId].contractAddress == address(0), "Market already exists");
        
        markets[productId] = Market(contractAddress, isPerp);
        
        emit MarketAdded(productId, contractAddress, isPerp);
    }

    function getMarket(uint32 productId) external view returns (address, bool) {
        Market memory market = markets[productId];
        return (market.contractAddress, market.isPerp);
    }
}