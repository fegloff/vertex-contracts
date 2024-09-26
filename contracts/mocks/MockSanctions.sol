// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MockSanctions is Ownable {
    mapping(address => bool) private sanctionedAddresses;

    event AddressStatusChanged(address indexed _address, bool isSanctioned);

    constructor(address[] memory _initialSanctionedAddresses) {
        for (uint i = 0; i < _initialSanctionedAddresses.length; i++) {
            sanctionedAddresses[_initialSanctionedAddresses[i]] = true;
        }
    }

    function isSanctioned(address addr) external view returns (bool) {
        return sanctionedAddresses[addr];
    }

    function setSanctionStatus(address addr, bool status) external onlyOwner {
        sanctionedAddresses[addr] = status;
        emit AddressStatusChanged(addr, status);
    }

    function batchSetSanctionStatus(address[] calldata addrs, bool[] calldata statuses) external onlyOwner {
        require(addrs.length == statuses.length, "Arrays length mismatch");
        for (uint i = 0; i < addrs.length; i++) {
            sanctionedAddresses[addrs[i]] = statuses[i];
            emit AddressStatusChanged(addrs[i], statuses[i]);
        }
    }
}