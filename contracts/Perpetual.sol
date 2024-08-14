// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/engine/IPerpEngine.sol";

interface IPerpOracle {
    function getPrice(uint32 productId, bytes32 tokenPair) external view returns (uint256);
    function createTokenPair(string memory base, string memory quote) external pure returns (bytes32);
}


contract Perpetual {
    IPerpEngine public perpEngine;
    IPerpOracle public oracle;
    uint32 public productId;
    bytes32 public tokenPair;

    constructor(
        uint32 _productId,
        bytes32 _tokenPair,
        address _perpEngine,
        address _oracle
    ) {
        productId = _productId;
        tokenPair = _tokenPair;
        perpEngine = IPerpEngine(_perpEngine);
        oracle = IPerpOracle(_oracle);
    }

    function openPosition(bytes32 subaccount, int128 amount) external {
        require(amount != 0, "Amount must be non-zero");
        uint256 price = oracle.getPrice(productId, tokenPair);
        int128 notional = amount * int128(int256(price)) / 1e18;
        perpEngine.updateBalance(productId, subaccount, amount, -notional);
    }

    function closePosition(bytes32 subaccount, int128 amount) external {
        require(amount != 0, "Amount must be non-zero");
        uint256 price = oracle.getPrice(productId, tokenPair);
        int128 notional = amount * int128(int256(price)) / 1e18;
        perpEngine.updateBalance(productId, subaccount, -amount, notional);
    }

    function getPositionPnl(bytes32 subaccount) external view returns (int128) {
        return perpEngine.getPositionPnl(productId, subaccount);
    }

    function getCurrentPrice() external view returns (uint256) {
        return oracle.getPrice(productId, tokenPair);
    }
}


// contract Perpetual {
//     uint32 public productId;
//     bytes32 public tokenPair;
//     IPerpOracle public oracle;
//     IERC20 public collateralToken;

//     struct Position {
//         int256 size;
//         uint256 entryPrice;
//         uint256 collateral;
//     }

//     mapping(address => Position) public positions;

//     event PositionUpdated(address user, int256 size, uint256 entryPrice, uint256 collateral);

//     constructor(
//         uint32 _productId,
//         address _oracle,
//         address _collateralToken,
//         bytes32 _tokenPair
//     ) {
//         productId = _productId;
//         oracle = IPerpOracle(_oracle);
//         collateralToken = IERC20(_collateralToken);
//         tokenPair = _tokenPair;
//     }

//     function openPosition(int256 size, uint256 collateralAmount) external {
//         require(size != 0, "Size cannot be zero");
//         require(collateralAmount > 0, "Collateral must be positive");
        
//         uint256 currentPrice = oracle.getPrice(productId, tokenPair);
        
//         require(collateralToken.transferFrom(msg.sender, address(this), collateralAmount), "Collateral transfer failed");

//         positions[msg.sender] = Position({
//             size: size,
//             entryPrice: currentPrice,
//             collateral: collateralAmount
//         });

//         emit PositionUpdated(msg.sender, size, currentPrice, collateralAmount);
//     }

//     function closePosition() external {
//         Position memory position = positions[msg.sender];
//         require(position.size != 0, "No open position");
        
//         uint256 currentPrice = oracle.getPrice(productId, tokenPair);
//         int256 pnl = calculatePnL(position.size, position.entryPrice, currentPrice);
        
//         uint256 toReturn = position.collateral;
//         if (pnl > 0) {
//             toReturn += uint256(pnl);
//         } else if (pnl < 0 && uint256(-pnl) < position.collateral) {
//             toReturn -= uint256(-pnl);
//         } else {
//             toReturn = 0;
//         }

//         delete positions[msg.sender];
        
//         require(collateralToken.transfer(msg.sender, toReturn), "Collateral return failed");

//         emit PositionUpdated(msg.sender, 0, 0, 0);
//     }

//     function calculatePnL(int256 size, uint256 entryPrice, uint256 currentPrice) internal pure returns (int256) {
//         return size * (int256(currentPrice) - int256(entryPrice)) / 1e18;
//     }

//     function getPosition(address user) external view returns (int256 size, uint256 entryPrice, uint256 collateral) {
//         Position memory pos = positions[user];
//         return (pos.size, pos.entryPrice, pos.collateral);
//     }

//     function getCurrentPrice() external view returns (uint256) {
//         return oracle.getPrice(productId, tokenPair);
//     }
// }

// interface IPerpEngine {
//     function getProductInfo(uint32 productId) external view returns (
//         uint256 sizeIncrement,
//         uint256 minSize,
//         uint256 lpSpreadX18,
//         address book
//     );
    
//     function updateState(uint32 productId, uint256 openInterestDelta) external;
// }

// interface IOracle {
//     function getPrice(uint32 productId, bytes32 tokenPair) external view returns (uint256);
// }

// contract Perpetual is ReentrancyGuard {
//     struct Balance {
//         int256 amount;  // Keeps int256 as it can be positive (long) or negative (short)
//         uint256 longQuoteBalance;
//         uint256 shortQuoteBalance;
//         uint256 lastCumulativeFundingX18;
//     }
    
//     struct State {
//         uint256 cumulativeFundingLongX18;
//         uint256 cumulativeFundingShortX18;
//         uint256 availableSettle;
//         uint256 openInterest;
//     }

//     uint32 public immutable productId;
//     IPerpEngine public immutable perpEngine;
//     IOracle public immutable oracle;
//     IERC20 public immutable collateralToken;
//     bytes32 public immutable priceFeedIdentifier;

//     mapping(bytes32 => Balance) public balances;
//     State public state;
    
//     constructor(uint32 _productId, address _perpEngine, address _oracle, address _collateralToken, bytes32 _priceFeedIdentifier) {
//         productId = _productId;
//         perpEngine = IPerpEngine(_perpEngine);
//         oracle = IOracle(_oracle);
//         collateralToken = IERC20(_collateralToken);
//         priceFeedIdentifier = _priceFeedIdentifier;
//     }
    
//     function openPosition(bytes32 subaccount, int256 amount) external nonReentrant {
//         require(amount != 0, "Amount must be non-zero");
        
//         (uint256 sizeIncrement, uint256 minSize, , ) = perpEngine.getProductInfo(productId);
//         require(abs(amount) >= minSize, "Amount below minimum size");
//         require(abs(amount) % sizeIncrement == 0, "Invalid amount increment");
        
//         Balance storage balance = balances[subaccount];
        
//         uint256 price = oracle.getPrice(productId, priceFeedIdentifier);
//         uint256 notional = uint256(abs(amount)) * price / 1e18;
        
//         if (amount > 0) {
//             balance.amount += amount;
//             balance.longQuoteBalance += notional;
//         } else {
//             balance.amount += amount;
//             balance.shortQuoteBalance += notional;
//         }
        
//         state.openInterest += uint256(abs(amount));
//         perpEngine.updateState(productId, uint256(abs(amount)));
        
//         _updateFunding(subaccount);
        
//         // Transfer collateral
//         require(collateralToken.transferFrom(msg.sender, address(this), notional), "Collateral transfer failed");
//     }
    
//     function closePosition(bytes32 subaccount) external nonReentrant {
//         Balance storage balance = balances[subaccount];
//         require(balance.amount != 0, "No position to close");
        
//         uint256 price = oracle.getPrice(productId, priceFeedIdentifier);
//         uint256 notional = uint256(abs(balance.amount)) * price / 1e18;
        
//         int256 pnl;
//         if (balance.amount > 0) {
//             pnl = int256(notional) - int256(balance.longQuoteBalance);
//             balance.longQuoteBalance = 0;
//         } else {
//             pnl = int256(balance.shortQuoteBalance) - int256(notional);
//             balance.shortQuoteBalance = 0;
//         }
        
//         state.openInterest -= uint256(abs(balance.amount));
//         perpEngine.updateState(productId, uint256(abs(balance.amount)));
        
//         balance.amount = 0;
        
//         _updateFunding(subaccount);
        
//         if (pnl > 0) {
//             state.availableSettle = (state.availableSettle > uint256(pnl)) ? state.availableSettle - uint256(pnl) : 0;
//             require(collateralToken.transfer(msg.sender, uint256(pnl)), "Profit transfer failed");
//         } else if (pnl < 0) {
//             require(collateralToken.transferFrom(msg.sender, address(this), uint256(-pnl)), "Loss payment failed");
//         }
//     }

//     function _updateFunding(bytes32 subaccount) internal {
//         Balance storage balance = balances[subaccount];
//         uint256 fundingPayment;

//         if (balance.amount > 0) {
//             fundingPayment = ((state.cumulativeFundingLongX18 - balance.lastCumulativeFundingX18) * uint256(balance.amount)) / 1e18;
//             balance.longQuoteBalance = (balance.longQuoteBalance > fundingPayment) ? balance.longQuoteBalance - fundingPayment : 0;
//             balance.lastCumulativeFundingX18 = state.cumulativeFundingLongX18;
//         } else if (balance.amount < 0) {
//             fundingPayment = ((state.cumulativeFundingShortX18 - balance.lastCumulativeFundingX18) * uint256(-balance.amount)) / 1e18;
//             balance.shortQuoteBalance = (balance.shortQuoteBalance > fundingPayment) ? balance.shortQuoteBalance - fundingPayment : 0;
//             balance.lastCumulativeFundingX18 = state.cumulativeFundingShortX18;
//         }
//     }

//     function updateGlobalFunding() external {
//         uint256 price = oracle.getPrice(productId, priceFeedIdentifier);
//         int256 fundingRate = calculateFundingRate(price);

//         if (fundingRate > 0) {
//             state.cumulativeFundingLongX18 += uint256(fundingRate);
//         } else {
//             state.cumulativeFundingShortX18 += uint256(-fundingRate);
//         }
//     }

//     function calculateFundingRate(uint256 price) internal view returns (int256) {
//         // Implement your funding rate calculation logic here
//         // This is a placeholder implementation
//         int256 targetPrice = int256(price);
//         int256 indexPrice = int256(oracle.getPrice(productId, priceFeedIdentifier));
//         return (targetPrice - indexPrice) * 1e18 / int256(price) / 24; // 1/24th of the percentage difference
//     }

//     function getBalance(bytes32 subaccount) external view returns (int256 amount, uint256 longQuoteBalance, uint256 shortQuoteBalance) {
//         Balance memory balance = balances[subaccount];
//         return (balance.amount, balance.longQuoteBalance, balance.shortQuoteBalance);
//     }

//     function getState() external view returns (uint256 cumulativeFundingLongX18, uint256 cumulativeFundingShortX18, uint256 availableSettle, uint256 openInterest) {
//         return (state.cumulativeFundingLongX18, state.cumulativeFundingShortX18, state.availableSettle, state.openInterest);
//     }
    
//     function abs(int256 x) internal pure returns (uint256) {
//         return x >= 0 ? uint256(x) : uint256(-x);
//     }
// }