import { Wallet, Contract, utils } from "zksync-web3";
import * as hre from "hardhat";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { ethers } from "ethers";

const ETH_ADDRESS = "0x000000000000000000000000000000000000800A";
export async function deployAAFactory(wallet: Wallet): Promise<Contract> {
  let deployer: Deployer = new Deployer(hre, wallet);
  const factoryArtifact = await deployer.loadArtifact("AAFactory");
  const accountArtifact = await deployer.loadArtifact("Account");

  const bytecodeHash = utils.hashBytecode(accountArtifact.bytecode);
  return await deployer.deploy(factoryArtifact, [bytecodeHash], undefined, [
    accountArtifact.bytecode,
  ]);
}

export async function deployAccount(
  wallet: Wallet,
  owner: Wallet,
  factory_address: string,
  mockZkUsd: string
): Promise<{
  accountWithSmSigner: Contract;
  accountWithUserSigner: Contract;
}> {
  let deployer: Deployer = new Deployer(hre, wallet);
  const factoryArtifact = await hre.artifacts.readArtifact("AAFactory");
  const factory = new ethers.Contract(
    factory_address,
    factoryArtifact.abi,
    wallet
  );

  const salt = ethers.constants.HashZero;
  try {
    await (await factory.deployAccount(salt, owner.address, mockZkUsd)).wait();
  } catch (error) {
    console.log("Error: ", error);
  }
  const AbiCoder = new ethers.utils.AbiCoder();
  const account_address = utils.create2Address(
    factory.address,
    await factory.aaBytecodeHash(),
    salt,
    AbiCoder.encode(["address", "address"], [owner.address, mockZkUsd])
  );
  const accountArtifact = await deployer.loadArtifact("Account");

  return {
    accountWithSmSigner: new ethers.Contract(
      account_address,
      accountArtifact.abi,
      wallet
    ),
    accountWithUserSigner: new ethers.Contract(
      account_address,
      accountArtifact.abi,
      owner
    ),
  };
}

export async function deployMockZkUSD(wallet: Wallet) {
  let deployer: Deployer = new Deployer(hre, wallet);
  const mockZkUsdArtifact = await deployer.loadArtifact("MockToken");
  return await deployer.deploy(
    mockZkUsdArtifact,
    [ethers.utils.parseEther("1000000")],
    undefined,
    []
  );
}

export async function deployPaymaster(wallet: Wallet, mockZkusd: string) {
  let deployer: Deployer = new Deployer(hre, wallet);
  const payMasterGreeter = await deployer.loadArtifact("PaymasterGreeter");
  return await deployer.deploy(payMasterGreeter, [mockZkusd], undefined, []);
}

export async function deployGreeterAA(wallet: Wallet) {
  let deployer: Deployer = new Deployer(hre, wallet);
  const greeterAA = await deployer.loadArtifact("GreeterAA");
  return await deployer.deploy(greeterAA, []);
}
