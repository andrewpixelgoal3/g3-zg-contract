import {
  Wallet,
  Provider,
  Contract,
  utils,
  types,
  EIP712Signer,
} from "zksync-web3";
import * as ethers from "ethers";
import { deployAAFactory, deployAccount } from "./utils/deploy";
import { sendTx } from "./utils/sendtx";

const deployKey =
  "7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110";
const ETH_ADDRESS = "0x000000000000000000000000000000000000800A";
const SLEEP_TIME = 10; // 10 sec

let provider: Provider;
let wallet: Wallet;
let user: Wallet;

let factory: Contract;
let account: Contract;

before(async () => {
  provider = Provider.getDefaultProvider();
  wallet = new Wallet(deployKey, provider);

  user = new Wallet(process.env.WALLET_PRIVATE_KEY || "", provider);
  factory = await deployAAFactory(wallet);
  account = await deployAccount(wallet, user, factory.address);
  //   100 ETH transfered to Account
  await (
    await wallet.sendTransaction({
      to: account.address,
      value: ethers.utils.parseEther("100"),
    })
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
    let tx = await account.populateTransaction.setSession(
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
    await provider.sendTransaction(utils.serialize(tx));
    //set greeting
    let tx1 = await account.populateTransaction.setGreeting("Andrew", {
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
      tx1.gasLimit = await provider.estimateGas(tx);
    }
    const signedTxHash1 = EIP712Signer.getSignedDigest(tx1);
    const signature1 = ethers.utils.arrayify(
      ethers.utils.joinSignature(w._signingKey().signDigest(signedTxHash1))
    );
    tx1.customData = {
      ...tx1.customData,
      customSignature: signature1,
    };
    await provider.sendTransaction(utils.serialize(tx1));
  });
});
