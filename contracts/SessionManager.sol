// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@matterlabs/zksync-contracts/l2/system-contracts/interfaces/IAccount.sol";
import {IPaymaster, ExecutionResult, PAYMASTER_VALIDATION_SUCCESS_MAGIC} from "@matterlabs/zksync-contracts/l2/system-contracts/interfaces/IPaymaster.sol";
import {IPaymasterFlow} from "@matterlabs/zksync-contracts/l2/system-contracts/interfaces/IPaymasterFlow.sol";
import {TransactionHelper, Transaction} from "@matterlabs/zksync-contracts/l2/system-contracts/libraries/TransactionHelper.sol";

abstract contract SessionManager is IAccount, IPaymaster {
    struct Session {
        address pubKey;
        uint256 validAfter;
        uint256 validUtil;
    }

    // Session public sessionKeys;
    address public owner;
    IERC20 public ethToken;
    mapping(address => Session) public session;
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
        require(session[owner].pubKey != address(0), "Session is not created");
        require(
            msg.sender == session[owner].pubKey,
            "Only the session that inherits this contract can call this method."
        );
        _;
    }

    constructor(address _owner, address _ethToken) {
        owner = _owner;
        ethToken = IERC20(_ethToken);
    }

    function setSession(
        address pubKey,
        uint256 validAfter,
        uint256 validUtil
    ) external onlyOwner {
        Session memory sess;
        sess.pubKey = pubKey;
        sess.validAfter = validAfter;
        sess.validUtil = validUtil;
        session[owner] = sess;
        bool success = ethToken.approve(address(this), type(uint256).max);
        require(success, "Failed to approve");
    }

    function getSession()
        external
        view
        returns (address _pubKey, uint256 _validAfter, uint256 _validUtil)
    {
        _pubKey = session[owner].pubKey;
        _validAfter = session[owner].validAfter;
        _validUtil = session[owner].validUtil;
    }

    function getOwner() external view returns (address _owner) {
        _owner = owner;
    }
}
