//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract GreeterAA {
    string private greeting;

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }
}
