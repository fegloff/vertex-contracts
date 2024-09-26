pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./OrderBook.sol";

contract OrderBookFactory is Ownable {
    mapping(uint32 => address) public orderBooks;
    uint32[] public productIds;

    event OrderBookCreated(uint32 indexed productId, address orderBook, address tokenAddress);

    function createOrderBook(uint32 productId, address tokenAddress) external onlyOwner {
        require(orderBooks[productId] == address(0), "OrderBook already exists for this product");

        OrderBook newOrderBook = new OrderBook(productId, tokenAddress);
        orderBooks[productId] = address(newOrderBook);
        productIds.push(productId);

        emit OrderBookCreated(productId, address(newOrderBook), tokenAddress);
    }

    function getOrderBook(uint32 productId) external view returns (address) {
        return orderBooks[productId];
    }

    function getAllOrderBooks() external view returns (address[] memory) {
        address[] memory allBooks = new address[](productIds.length);
        for (uint i = 0; i < productIds.length; i++) {
            allBooks[i] = orderBooks[productIds[i]];
        }
        return allBooks;
    }

    function getProductIds() external view returns (uint32[] memory) {
        return productIds;
    }

    function orderBookExists(uint32 productId) external view returns (bool) {
        return orderBooks[productId] != address(0);
    }
}