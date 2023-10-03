// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SessionManager {
    struct Session {
        address pubKey;
        uint256 validAfter;
        uint256 validUtil;
    }

    Session public sessionKeys;
    address public owner;
    modifier onlyFromAccount() {
        require(
            msg.sender == address(this),
            "Only the account that inherits this contract can call this method."
        );
        _;
    }

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only the account that inherits this contract can call this method."
        );
        _;
    }

    modifier onlySession() {
        require(sessionKeys.pubKey != address(0), "Session is not created");
        require(
            msg.sender == sessionKeys.pubKey,
            "Only the session that inherits this contract can call this method."
        );
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    function setSession(
        address pubKey,
        uint256 validAfter,
        uint256 validUtil
    ) external onlyOwner {
        sessionKeys.pubKey = pubKey;
        sessionKeys.validAfter = validAfter;
        sessionKeys.validUtil = validUtil;
    }

    function getSession()
        external
        view
        returns (address _pubKey, uint256 _validAfter, uint256 _validUtil)
    {
        _pubKey = sessionKeys.pubKey;
        _validAfter = sessionKeys.validAfter;
        _validUtil = sessionKeys.validUtil;
    }
}
