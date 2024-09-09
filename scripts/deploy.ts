import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import * as path from "path";
import * as hre from "hardhat";
import { deployContractsInDir,
  deployContractWithParams,
  deployContractWithProxy,
  getSigner,
  TOKENS,
} from "./helpers/helper";
import { config } from '../config'
import { ENGINE_TYPE } from "./helpers/constants";
import { SpotToken } from "./helpers/types";

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
 
  const endpointContract = await get("Endpoint");
  const endpointAddress = endpointContract.address;

  const offchainExchange = await get("OffchainExchange");
  const offchainExchangeAddress = offchainExchange.address;

  const clearingHouse = await get("Clearinghouse");
  const clearingHouseAddress = clearingHouse.address;
  

  await deployContractWithParams("MockSequencer", deploy, get, deployer, endpointAddress, offchainExchangeAddress, clearingHouseAddress);

  const initialSanctionedAddresses: string[] = [];

  console.log("Deploying MockSanctions...");

  await deployContractWithParams('MockSanctions', deploy, get, deployer, initialSanctionedAddresses);

  if (!config.isHarmony) {
    const spotTokens = Object.values(TOKENS).filter(t => t.type === ENGINE_TYPE.SPOT) as SpotToken[];
    
    for (const token of spotTokens) {
      if (token.symbol === "VRTX") {
        // Vertex token is deployed with Proxy
        continue
      }
      const result = await deploy(token.symbol, {
        from: deployer,
        contract: "MockERC20",
        args: [token.name, token.symbol, token.decimals, token.initialSupply],
        log: true,
      });
      
      console.log(`${token.symbol} deployed at: ${result.address}`);     
    }
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
  if (!config.isHarmony) { // already have the token deployed on Harmony's mainnet
    await deployContractWithProxy('VertexToken', [], false)
  }
  await oracleDeploy();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });