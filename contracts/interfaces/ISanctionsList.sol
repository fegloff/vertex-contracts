// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;
// pragma solidity ^0.8.13;

interface ISanctionsList {
    function isSanctioned(address addr) external view returns (bool);
}