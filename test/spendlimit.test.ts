import {
  Wallet,
  Provider,
  Contract,
  utils,
  types,
  EIP712Signer,
} from "zksync-web3";
import * as ethers from "ethers";
import {
  deployAAFactory,
  deployAccount,
  deployGreeterAA,
  deployMockZkUSD,
  deployPaymaster,
} from "./utils/deploy";
import { sendTx } from "./utils/sendtx";
import { expect } from "chai";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import * as hre from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers/lib/utils";

const deployKey =
  "7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110";
const ETH_ADDRESS = "0x000000000000000000000000000000000000800A";
const SLEEP_TIME = 10; // 10 sec

let provider: Provider;
let wallet: Wallet;
let user: Wallet;

let factory: Contract;
let account: Contract;
let mockZkUsd: Contract;
let accountOwner: Contract;
let paymaster: Contract;
let greeterAA: Contract;

before(async () => {
  provider = Provider.getDefaultProvider();
  wallet = new Wallet(deployKey, provider);

  user = new Wallet(process.env.WALLET_PRIVATE_KEY || "", provider);
  mockZkUsd = await deployMockZkUSD(wallet);
  factory = await deployAAFactory(wallet);
  const { accountWithSmSigner, accountWithUserSigner } = await deployAccount(
    wallet,
    user,
    factory.address,
    mockZkUsd.address
  );
  console.log("run here 1");

  paymaster = await deployPaymaster(wallet, mockZkUsd.address);
  console.log("run here 2");

  greeterAA = await deployGreeterAA(wallet);
  console.log("run here 3");

  account = accountWithSmSigner;
  accountOwner = accountWithUserSigner;
  //   100 ETH transfered to Account
  await (
    await wallet.sendTransaction({
      to: account.address,
      value: ethers.utils.parseEther("100"),
    })
  ).wait();
  // 1000 mockZkusd to user
  await (
    await mockZkUsd.transfer(user.address, ethers.utils.parseEther("1000"))
  ).wait();
});

describe("Spending limit", function () {
  it.only("Set Limit: Should add ETH spendinglimit correctly", async () => {
    let tx = await account.populateTransaction.setSpendingLimit(
      ETH_ADDRESS,
      ethers.utils.parseEther("10"),
      { value: ethers.BigNumber.from(0) }
    );
    const txReceipt = await sendTx(provider, account, user, tx);
    await txReceipt.wait();
  });
  it.only("Set greeting: Should setGreeting correctly", async () => {
    const w = Wallet.createRandom();
    const s = Date.now();
    const u = new Date();
    u.setDate(u.getDate() + 1);
    const _u = u.getTime();
    const validAfter = Math.floor(s / 1000);
    const validUntil = Math.floor(_u / 1000);
    const pubKey = await w.getAddress();
    let tx;
    try {
      tx = await accountOwner.populateTransaction.setSession(
        pubKey,
        validAfter.toString(),
        validUntil.toString(),
        {
          value: ethers.BigNumber.from(0),
        }
      );
    } catch (error) {
      console.log("error1: ", error);
    }
    tx = {
      ...tx,
      from: user.address,
      chainId: (await provider.getNetwork()).chainId,
      nonce: await provider.getTransactionCount(user.address),
      type: 113,
      customData: {
        gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
      } as types.Eip712Meta,
    };
    tx.gasPrice = await provider.getGasPrice();
    if (tx.gasLimit == undefined) {
      tx.gasLimit = await provider.estimateGas(tx);
    }
    const signedTxHash = EIP712Signer.getSignedDigest(tx);
    const signature = ethers.utils.arrayify(
      ethers.utils.joinSignature(user._signingKey().signDigest(signedTxHash))
    );
    tx.customData = {
      ...tx.customData,
      customSignature: signature,
    };
    await (await provider.sendTransaction(utils.serialize(tx))).wait();
    const session = await account.getSession();
    expect(session._pubKey).to.eq(w.address);
    const salt = ethers.constants.HashZero;
    const AbiCoder = new ethers.utils.AbiCoder();
    const account_address = utils.create2Address(
      factory.address,
      await factory.aaBytecodeHash(),
      salt,
      AbiCoder.encode(["address"], [user.address])
    );
    let deployer: Deployer = new Deployer(hre, wallet);
    const accountArtifact = await deployer.loadArtifact("Account");
    const accountSession = new ethers.Contract(
      account_address,
      accountArtifact.abi,
      user
    );
    //set greeting
    let tx1 = await accountSession.populateTransaction.setGreeting("Andrew", {
      value: ethers.BigNumber.from(0),
    });
    tx1 = {
      ...tx1,
      from: account.address,
      chainId: (await provider.getNetwork()).chainId,
      nonce: await provider.getTransactionCount(account.address),
      type: 113,
      customData: {
        gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
      } as types.Eip712Meta,
    };
    tx1.gasPrice = await provider.getGasPrice();
    if (tx1.gasLimit == undefined) {
      tx1.gasLimit = await provider.estimateGas(tx1);
    }
    const signedTxHash1 = EIP712Signer.getSignedDigest(tx1);
    const signature1 = ethers.utils.arrayify(
      ethers.utils.joinSignature(w._signingKey().signDigest(signedTxHash1))
    );
    tx1.customData = {
      ...tx1.customData,
      customSignature: signature1,
    };

    await (await provider.sendTransaction(utils.serialize(tx1))).wait();
  });
  it.only("Set greeting: Should setGreeting with paymaster correctly", async () => {
    const w = Wallet.createRandom();
    const s = Date.now();
    const u = new Date();
    u.setDate(u.getDate() + 1);
    const _u = u.getTime();
    const validAfter = Math.floor(s / 1000);
    const validUntil = Math.floor(_u / 1000);
    const pubKey = await w.getAddress();
    let tx = await accountOwner.populateTransaction.setSession(
      pubKey,
      validAfter.toString(),
      validUntil.toString(),
      {
        value: ethers.BigNumber.from(0),
      }
    );
    tx = {
      ...tx,
      from: user.address,
      chainId: (await provider.getNetwork()).chainId,
      nonce: await provider.getTransactionCount(user.address),
      type: 113,
      customData: {
        gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
      } as types.Eip712Meta,
    };
    tx.gasPrice = await provider.getGasPrice();
    if (tx.gasLimit == undefined) {
      tx.gasLimit = await provider.estimateGas(tx);
    }
    const signedTxHash = EIP712Signer.getSignedDigest(tx);
    const signature = ethers.utils.arrayify(
      ethers.utils.joinSignature(user._signingKey().signDigest(signedTxHash))
    );
    tx.customData = {
      ...tx.customData,
      customSignature: signature,
    };
    await (await provider.sendTransaction(utils.serialize(tx))).wait();
    const session = await account.getSession();
    expect(session._pubKey).to.eq(w.address);
    const balanceOfUser = await mockZkUsd.balanceOf(user.address);
    console.log("balanceOfUser: ", balanceOfUser.toString());

    const allowance: ethers.BigNumber = await mockZkUsd.allowance(
      user.address,
      account.address
    );

    // expect(allowance.toNumber()).gt(0);
    //set paymaster allow contract
    const selector = keccak256(toUtf8Bytes("setGreeting(string)")).substring(
      0,
      10
    );
    console.log(selector);
    let allowContractTxh = await account.populateTransaction.setAllowContract(
      greeterAA.address,
      selector,
      {
        value: ethers.BigNumber.from(0),
      }
    );
    allowContractTxh = {
      ...allowContractTxh,
      from: user.address,
      chainId: (await provider.getNetwork()).chainId,
      nonce: await provider.getTransactionCount(user.address),
      type: 113,
      customData: {
        gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
      } as types.Eip712Meta,
    };
    allowContractTxh.gasPrice = await provider.getGasPrice();
    if (allowContractTxh.gasLimit == undefined) {
      allowContractTxh.gasLimit = await provider.estimateGas(allowContractTxh);
    }
    const signedTxHashAllowContract =
      EIP712Signer.getSignedDigest(allowContractTxh);
    const signatureAllowContract = ethers.utils.arrayify(
      ethers.utils.joinSignature(
        user._signingKey().signDigest(signedTxHashAllowContract)
      )
    );
    allowContractTxh.customData = {
      ...allowContractTxh.customData,
      customSignature: signatureAllowContract,
    };
    await (
      await provider.sendTransaction(utils.serialize(allowContractTxh))
    ).wait();
    expect(await account.getAllowContract(greeterAA.address, selector)).to.eq(
      true
    );
    await (
      await paymaster.setAllowContract(greeterAA.address, selector)
    ).wait();
    expect(await paymaster.getAllowContract(greeterAA.address, selector)).to.eq(
      true
    );
    //set greeting
    let tx1 = await greeterAA.populateTransaction.setGreeting("AndrewPixel", {
      value: ethers.BigNumber.from(0),
    });
    const paymasterParams = utils.getPaymasterParams(paymaster.address, {
      type: "ApprovalBased",
      token: mockZkUsd.address,
      // set minimalAllowance as we defined in the paymaster contract
      minimalAllowance: ethers.BigNumber.from(0),
      // empty bytes as testnet paymaster does not use innerInput
      innerInput: new Uint8Array(),
    });
    tx1 = {
      ...tx1,
      from: account.address,
      chainId: (await provider.getNetwork()).chainId,
      nonce: await provider.getTransactionCount(account.address),
      type: 113,
      customData: {
        gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
        paymasterParams,
      } as types.Eip712Meta,
    };
    tx1.gasPrice = await provider.getGasPrice();
    if (tx1.gasLimit == undefined) {
      tx1.gasLimit = await provider.estimateGas(tx1);
    }
    const signedtxHash1 = EIP712Signer.getSignedDigest(tx1);
    const signature1 = ethers.utils.arrayify(
      ethers.utils.joinSignature(w._signingKey().signDigest(signedtxHash1))
    );
    tx1.customData = {
      ...tx1.customData,
      customSignature: signature1,
    };
    await (await provider.sendTransaction(utils.serialize(tx1))).wait();
  });
});
