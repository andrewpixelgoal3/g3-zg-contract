//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./SessionManager.sol";

contract Greeter is SessionManager {
    string private greeting;
    address public ownerGreeter;
    modifier onlyOwnerGreeting() {
        require(
            msg.sender == ownerGreeter,
            "Only the account that inherits this contract can call this method."
        );
        _;
    }

    constructor(address _owner) SessionManager(_owner) {
        ownerGreeter = _owner;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public onlyOwner {
        greeting = _greeting;
    }
}
