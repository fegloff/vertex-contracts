import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

const contractsDir = path.join(__dirname, "../contracts");

const deployContracts: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  // Specify the directory you want to deploy contracts from

  await deployContractsInDir(path.join(contractsDir, 'libraries'), deploy, get, deployer);
  await deployContractsInDir(path.join(contractsDir, 'interfaces'), deploy, get, deployer);
  await deployContractsInDir(path.join(contractsDir, 'util'), deploy, get, deployer);
  await deployContractsInDir(path.join(contractsDir, ''), deploy, get, deployer);
};

const deployContractsInDir = async (
  dirPath: string,
  deployFn: (
    name: string,
    options?: any
  ) => Promise<Record<string, any>>,
  getFn: (name: string) => Promise<Record<string, any> | undefined>,
  deployer: string
) => {
  const dirEntries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of dirEntries) {

    if (entry.isFile() && entry.name.endsWith(".sol")) {
      const contractName = path.parse(entry.name).name;

      try {
        let existingDeployment;

        try {
          existingDeployment = await getFn(contractName);
        } catch (error) {
          if (!error.message.includes("No deployment found for")) {
            throw error;
          }
        }

        if (existingDeployment) {
          console.log(
            `Contract ${contractName} already deployed at address: ${existingDeployment.address}`
          );
          continue;
        }

        const contractFactory = await hre.ethers.getContractFactory(contractName);
        const bytecode = await contractFactory.bytecode;

        if (bytecode === "0x") {
          console.warn(`Skipping interface ${contractName}`);
          continue;
        }

        const constructorParams = contractFactory.interface.deploy.inputs;

        if (constructorParams.length > 0) {
          console.warn(`Skipping contract ${contractName} with constructor parameters`);
          continue;
        }

        const deployment = await deployFn(contractName, {
          from: deployer,
          args: [], // Add any constructor arguments here
          log: true,
        });

        console.log(
          `Contract ${contractName} deployed at address: ${deployment.address}`
        );
      } catch (error) {
        if (error.message.includes("abstract and can't be deployed")) {
          console.warn(`Skipping abstract contract ${contractName}`);
        } else {
          console.error(`Error deploying contract ${contractName}:`, error);
        }
      }
    }
  }
};

const deployContractWithParams = async (
  contractName: string,
  deployFn: (
    name: string,
    options?: any
  ) => Promise<Record<string, any>>,
  getFn: (name: string) => Promise<Record<string, any> | undefined>,
  deployer: string,
  ...constructorArgs: any[]
) => {
  try {
    let existingDeployment;
    
    try {
      existingDeployment = await getFn(contractName);
    } catch (error) {
      if (!error.message.includes("No deployment found for")) {
        throw error;
      }
    }
    
    if (existingDeployment) {
      console.log(
        `Contract ${contractName} already deployed at address: ${existingDeployment.address}`
      );
      return;
    }

    const deployment = await deployFn(contractName, {
      from: deployer,
      args: constructorArgs,
      log: true,
    });

    console.log(
      `Contract ${contractName} deployed at address: ${deployment.address}`
    );
  } catch (error) {
    console.error(`Error deploying contract ${contractName}:`, error);
  }
};

async function main() {
  await deployContracts(hre);

  // Deploy contracts with constructor parameters
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  // await deployContractWithParams("MockERC20", deploy, get, deployer, "param1", "param2", 42);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });