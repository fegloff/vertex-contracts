// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    uint8 private immutable _decimals;
    uint256 public constant MAX_MINT_AMOUNT = 100 ether;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_
    ) ERC20(name_, symbol_) {
        require(initialSupply_ <= MAX_MINT_AMOUNT, "MockERC20: initial supply too large");
        _decimals = decimals_;
        _mint(msg.sender, initialSupply_);
    }

    /// @dev Unpermissioned minting for testing
    function mint(address account, uint256 amount) external {
        require(amount <= MAX_MINT_AMOUNT, "MockERC20: amount too large");
        _mint(account, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}
