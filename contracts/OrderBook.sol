pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract OrderBook is Ownable {
    uint32 public productId;
    address public tokenAddress;
    
    struct Order {
        uint256 price;
        uint256 amount;
        address trader;
    }

    mapping(bool => Order[]) public orderBook; // isBuy => Orders
    uint256 public bestBid;
    uint256 public bestAsk;

    event OrderPlaced(uint32 indexed productId, address trader, bool isBuy, uint256 amount, uint256 price);
    event OrderCancelled(uint32 indexed productId, address trader, bool isBuy, uint256 amount, uint256 price);
    event Trade(uint32 indexed productId, address buyer, address seller, uint256 amount, uint256 price);

    bool constant BUY = true;
    bool constant SELL = false;

    constructor(uint32 _productId, address _tokenAddress) {
        productId = _productId;
        tokenAddress = _tokenAddress;
        bestBid = 0;
        bestAsk = type(uint256).max; // Set to max value initially
    }

    function placeOrder(bool isBuy, uint256 amount, uint256 price) external {
        require(amount > 0, "Amount must be greater than 0");
        require(price > 0, "Price must be greater than 0");

        if (isBuy) {
            if (price > bestBid) bestBid = price;
            orderBook[BUY].push(Order(price, amount, msg.sender));
        } else {
            if (price < bestAsk) bestAsk = price;
            orderBook[SELL].push(Order(price, amount, msg.sender));
        }

        emit OrderPlaced(productId, msg.sender, isBuy, amount, price);
        
        _matchOrders(isBuy);
    }

    function cancelOrder(bool isBuy, uint256 index) external {
        require(index < orderBook[isBuy].length, "Invalid order index");
        Order memory orderToCancel = orderBook[isBuy][index];
        require(orderToCancel.trader == msg.sender, "Not the order owner");

        emit OrderCancelled(productId, msg.sender, isBuy, orderToCancel.amount, orderToCancel.price);

        // Remove the order by swapping with the last element and popping
        orderBook[isBuy][index] = orderBook[isBuy][orderBook[isBuy].length - 1];
        orderBook[isBuy].pop();

        _updateBestPrices(isBuy);
    }

   function _matchOrders(bool isBuy) internal {
        Order[] storage buyOrders = orderBook[true];
        Order[] storage sellOrders = orderBook[false];

        uint256 buyIndex = 0;
        uint256 sellIndex = 0;

        while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
            Order storage buy = buyOrders[buyIndex];
            Order storage sell = sellOrders[sellIndex];

            if (buy.price < sell.price) {
                buyIndex++;
                continue;
            }

            uint256 matchAmount = buy.amount < sell.amount ? buy.amount : sell.amount;
            uint256 matchPrice = (buy.price + sell.price) / 2; // Mid-price matching

            emit Trade(productId, buy.trader, sell.trader, matchAmount, matchPrice);

            buy.amount -= matchAmount;
            sell.amount -= matchAmount;

            if (buy.amount == 0) {
                _removeOrder(buyOrders, buyIndex);
                // Don't increment buyIndex as we've removed an order
            } else {
                buyIndex++;
            }

            if (sell.amount == 0) {
                _removeOrder(sellOrders, sellIndex);
                // Don't increment sellIndex as we've removed an order
            } else {
                sellIndex++;
            }
        }

        _updateBestPrices(isBuy);
    }

    function _removeOrder(Order[] storage orders, uint256 index) internal {
        require(index < orders.length, "Index out of bounds");
        
        if (index != orders.length - 1) {
            orders[index] = orders[orders.length - 1];
        }
        orders.pop();
    }
    function _updateBestPrices(bool isBuy) internal {
        if (isBuy) {
            bestBid = orderBook[BUY].length > 0 ? orderBook[BUY][0].price : 0;
        } else {
            bestAsk = orderBook[SELL].length > 0 ? orderBook[SELL][0].price : type(uint256).max;
        }
    }

    function getOrderBook(bool isBuy) external view returns (Order[] memory) {
        return orderBook[isBuy];
    }

    function getBestPrices() external view returns (uint256, uint256) {
        return (bestBid, bestAsk);
    }
}