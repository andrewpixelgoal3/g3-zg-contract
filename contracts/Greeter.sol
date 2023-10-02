//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract Greeter {
    string private greeting;
    address public ownerGreeter;
    modifier onlyOwnerGreeting() {
        require(
            msg.sender == ownerGreeter,
            "Only the account that inherits this contract can call this method."
        );
        _;
    }

    constructor(address _owner) {
        ownerGreeter = _owner;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public onlyOwnerGreeting {
        greeting = _greeting;
    }
}
