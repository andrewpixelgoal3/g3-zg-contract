import { utils, Wallet, Provider } from "zksync-web3";
import * as ethers from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "";
export default async function (hre: HardhatRuntimeEnvironment) {
  // Private key of the account used to deploy
  var provider = new Provider(hre.network.config.url);

  const wallet = new Wallet(WALLET_PRIVATE_KEY, provider);
  let deployer: Deployer = new Deployer(hre, wallet);
  const factoryArtifact = await deployer.loadArtifact("AAFactory");
  const accountArtifact = await deployer.loadArtifact("Account");

  const bytecodeHash = utils.hashBytecode(accountArtifact.bytecode);
  const factory = await deployer.deploy(
    factoryArtifact,
    [bytecodeHash],
    undefined,
    [accountArtifact.bytecode]
  );

  console.log(`AA factory address: ${factory.address}`);
}
