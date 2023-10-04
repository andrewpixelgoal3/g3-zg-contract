// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {IPaymaster, ExecutionResult, PAYMASTER_VALIDATION_SUCCESS_MAGIC} from "@matterlabs/zksync-contracts/l2/system-contracts/interfaces/IPaymaster.sol";
import {IPaymasterFlow} from "@matterlabs/zksync-contracts/l2/system-contracts/interfaces/IPaymasterFlow.sol";
import {TransactionHelper, Transaction} from "@matterlabs/zksync-contracts/l2/system-contracts/libraries/TransactionHelper.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@matterlabs/zksync-contracts/l2/system-contracts/Constants.sol";
import "./IAccount.sol";

contract PaymasterGreeter is IPaymaster, Ownable {
    bytes4 GREETER_SET_GREETING_AA =
        bytes4(keccak256(bytes("setGreeting(string)")));

    address public allowedToken;
    mapping(address => mapping(bytes4 => bool)) private allowedContract;

    modifier onlyBootloader() {
        require(
            msg.sender == BOOTLOADER_FORMAL_ADDRESS,
            "Only bootloader can call this method"
        );
        // Continue execution if called from the bootloader.
        _;
    }

    constructor(address _erc20) {
        allowedToken = _erc20;
    }

    function setAllowContract(
        address allowContract,
        bytes4 selector
    ) public onlyOwner {
        allowedContract[allowContract][selector] = true;
    }

    function getAllowContract(
        address allowContract,
        bytes4 selector
    ) external view returns (bool) {
        return allowedContract[allowContract][selector];
    }

    function validateAndPayForPaymasterTransaction(
        bytes32,
        bytes32,
        Transaction calldata _transaction
    )
        external
        payable
        onlyBootloader
        returns (bytes4 magic, bytes memory context)
    {
        // By default we consider the transaction as accepted.
        magic = PAYMASTER_VALIDATION_SUCCESS_MAGIC;
        require(
            _transaction.paymasterInput.length >= 4,
            "The standard paymaster input must be at least 4 bytes long"
        );

        bytes4 paymasterInputSelector = bytes4(
            _transaction.paymasterInput[0:4]
        );
        if (paymasterInputSelector == IPaymasterFlow.approvalBased.selector) {
            // While the transaction data consists of address, uint256 and bytes data,
            // the data is not needed for this paymaster
            address contractAddress = address(uint160(_transaction.to));
            bytes4 contractSelector = bytes4(_transaction.data[0:4]);
            if (allowedContract[contractAddress][contractSelector]) {
                if (contractSelector == GREETER_SET_GREETING_AA) {
                    uint fee = 1 * 10 ** 18;
                    address accountAddress = address(
                        uint160(_transaction.from)
                    );
                    IAccount account = IAccount(accountAddress);
                    address owner = account.getOwner();
                    _transferTokenFromAAToOwner(owner, accountAddress, fee);
                    _transferToken(accountAddress, fee);
                }
            }

            // Note, that while the minimal amount of ETH needed is tx.gasPrice * tx.gasLimit,
            // neither paymaster nor account are allowed to access this context variable.
            uint256 requiredETH = _transaction.gasLimit *
                _transaction.maxFeePerGas;

            // The bootloader never returns any data, so it can safely be ignored here.
            (bool success, ) = payable(BOOTLOADER_FORMAL_ADDRESS).call{
                value: requiredETH
            }("");
            require(
                success,
                "Failed to transfer tx fee to the bootloader. Paymaster balance might not be enough."
            );
        } else {
            revert("Unsupported paymaster flow");
        }
    }

    function _transferToken(address userAddress, uint amount) internal {
        address thisAddress = address(this);

        try
            IERC20(allowedToken).transferFrom(userAddress, thisAddress, amount)
        {} catch (bytes memory revertReason) {
            // If the revert reason is empty or represented by just a function selector,
            // we replace the error with a more user-friendly message
            if (revertReason.length <= 4) {
                revert("Failed to transferFrom from users' account");
            } else {
                assembly {
                    revert(add(0x20, revertReason), mload(revertReason))
                }
            }
        }
    }

    function _transferTokenFromAAToOwner(
        address aa,
        address owner,
        uint amount
    ) internal {
        try IERC20(allowedToken).transferFrom(owner, aa, amount) {} catch (
            bytes memory revertReason
        ) {
            // If the revert reason is empty or represented by just a function selector,
            // we replace the error with a more user-friendly message
            if (revertReason.length <= 4) {
                revert("Failed to transferFrom from users' account");
            } else {
                assembly {
                    revert(add(0x20, revertReason), mload(revertReason))
                }
            }
        }
    }

    function postTransaction(
        bytes calldata _context,
        Transaction calldata _transaction,
        bytes32,
        bytes32,
        ExecutionResult _txResult,
        uint256 _maxRefundedGas
    ) external payable override onlyBootloader {}

    receive() external payable {}
}
