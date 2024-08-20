import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import * as path from "path";
import * as hre from "hardhat";
import { deployContractsInDir,
  deployContractWithParams,
  deployContractWithProxy,
  TOKENS,
} from "./helpers/helper";
import { config } from '../config'

export const contractsDir = path.join(__dirname, "../contracts");

const deployContracts: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  // Specify the directory you want to deploy contracts from
  await deployContractsInDir(path.join(contractsDir, 'libraries'), deploy, get, deployer);
  await deployContractsInDir(path.join(contractsDir, 'util'), deploy, get, deployer);
  await deployContractsInDir(path.join(contractsDir, ''), deploy, get, deployer);
};

async function mocksDeploy() {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;
  
  const verifierContract = await get("Verifier")
  const verifierAddress = verifierContract.address; // '0xde04eE2172803813dDcAE6B0ABA66A7ecE2bD1F4';
 
  await deployContractWithParams("MockSequencer", deploy, get, deployer, verifierAddress);

  const initialSanctionedAddresses: string[] = [];

  console.log("Deploying MockSanctions...");

  await deployContractWithParams('MockSanctions', deploy, get, deployer, initialSanctionedAddresses);

  if (!config.isHarmony) {
    const tokenName0 = TOKENS.SPOT_QUOTE.name
    const tokenName23 = TOKENS.SPOT_USTD.name//  SPOT_VRTX.name
    await deployContractWithParams('MockQuoteToken', deploy, get, deployer, tokenName0, "USDC", 6);
    await deployContractWithParams('MockUsdcToken', deploy, get, deployer, tokenName23, "USDC", 6); 
  }
}

async function oracleDeploy() {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;
  
  console.log("Deploying contracts with the account:", deployer);
  
  const useChainlink = false; // config.isHarmony; 

  await deployContractWithParams("PerpOracle", deploy, get, deployer, useChainlink);

}


async function main() {
  await deployContracts(hre)
  await mocksDeploy();
  await deployContractWithProxy('VertexToken', [], false)
  await oracleDeploy();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });