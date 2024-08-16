import { ethers, deployments, upgrades } from 'hardhat';
import * as path from "path";
import * as fs from "fs";
import * as hre from "hardhat";
import { config } from '../../config';
import { ethers as eths, Signer } from 'ethers';
import { ABI } from 'hardhat-deploy/types';
import { TOKENS } from './constants';
export interface Point {
  x: eths.BigNumber;
  y: eths.BigNumber;
}
// export const isLocalDeployment = config.isLocalDeployment;

const zeroAddress = ethers.constants.AddressZero;

export function isZeroAddress(address: string): boolean {
  return address === zeroAddress;
}

export const getTokenName = (id: number) => {
  const token = Object.values(TOKENS).find(t => t.id === id);
  if (!token) return null;
  return token.name;
};

export async function deployContractWithProxy(
  contractName: string,
  initArgs = [],
  initialize = true
) {
  const { get, save } = hre.deployments;

  try {

    const existingDeployment = await get(contractName).catch(() => undefined);

    if (existingDeployment) {
      console.log(`Contract ${contractName} already deployed at address:`,
        existingDeployment.address);
      console.log(`${contractName} implementation deployed to:`,
        await upgrades.erc1967.getImplementationAddress(existingDeployment.address));
      console.log(`${contractName} admin deployed to:`,
        await upgrades.erc1967.getAdminAddress(existingDeployment.address));

      const Contract = await ethers.getContractFactory(contractName);
      return Contract.attach(existingDeployment.address);
    }

    console.log(`Deploying ${contractName}...`);

    const Contract = await ethers.getContractFactory(contractName);

    let contract;

    if (initialize) {
      contract = await upgrades.deployProxy(Contract, initArgs, {
        initializer: 'initialize',
        kind: 'transparent'
      });
    } else {
      contract = await upgrades.deployProxy(Contract, [], {
        initializer: false,
        kind: 'transparent'
      });
    }

    await contract.deployed();

    const adminAddress = await upgrades.erc1967.getAdminAddress(contract.address)
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(contract.address)

    console.log(`${contractName} proxy deployed to:`, contract.address);
    console.log(`${contractName} implementation deployed to:`, implementationAddress);
    console.log(`${contractName} admin deployed to:`, adminAddress);

    await save(contractName, {
      abi: Contract.interface.format('json') as ABI,
      address: contract.address,
      implementation: implementationAddress,
      args: initArgs,
      metadata: JSON.stringify({
        proxyAdmin: adminAddress,
        isProxy: true,
        proxyType: 'transparent',
      }),
    });

    return contract;

  } catch (error) {
    if (error.message.includes("abstract and can't be deployed")) {
      console.warn(`Skipping abstract contract ${contractName}`);
    } else {
      console.error(`Error deploying contract ${contractName}:`, error);
    }
    return null;
  }
}

export const deployContractsInDir = async (
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

        const existingDeployment = await getFn(contractName).catch(() => undefined);

        if (existingDeployment) {
          console.log(
            `Contract ${contractName} already deployed at address: ${existingDeployment.address}`
          );
          console.log(
            `const ${contractName}Address = "${existingDeployment.address}"`
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
          log: true
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

export const deployContractWithParams = async (
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

    const existingDeployment = await getFn(contractName).catch(() => undefined);

    if (existingDeployment) {
      console.log(
        `Contract ${contractName} already deployed at address: ${existingDeployment.address}`
      );
      console.log(
        `const ${contractName}Address = "${existingDeployment.address}"`
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
    return deployment.address
  } catch (error) {
    console.error(`Error deploying contract ${contractName}:`, error);
  }
};

export function generateTestPoints(): Point[] {
  const points: Point[] = [];
  for (let i = 1; i <= 8; i++) {
    const privateKey = ethers.utils.hexZeroPad(ethers.utils.hexlify(i), 32);
    const wallet = new ethers.Wallet(privateKey);

    // Get the uncompressed public key
    const publicKey = ethers.utils.computePublicKey(wallet.publicKey, false);

    // Remove '0x04' prefix from uncompressed public key
    const pubKeyWithoutPrefix = publicKey.slice(4);

    // Extract x and y coordinates
    const x = ethers.BigNumber.from('0x' + pubKeyWithoutPrefix.slice(0, 64));
    const y = ethers.BigNumber.from('0x' + pubKeyWithoutPrefix.slice(64));

    points.push({ x, y });
  }
  return points;
}

export function getSpread(): string {
  // For a basic test setup, let's assume we want to pair two spot products with two perpetual products. We'll use small, sequential numbers for our product IDs to keep things simple.
  // Let's say:

  // Spot product 1 is paired with Perpetual product 2
  // Spot product 3 is paired with Perpetual product 4

  // To encode this in the _spreads parameter, we would use:
  // 0x0102030400000000
  // Here's the breakdown:

  // 01: Spot product ID 1
  // 02: Perpetual product ID 2
  // 03: Spot product ID 3
  // 04: Perpetual product ID 4
  // The rest is padded with zeros
  return "0x0102030400000000";
}

export async function getSigner(): Promise<Signer> {
  const networkName = process.env.NETWORK || 'mainnet';
  const networkConfig = config[networkName as 'mainnet' | 'testnet' | 'hardhat' | 'localhost'];

  if (!networkConfig) {
    throw new Error(`Network configuration for ${networkName} not found`);
  }

  // Create a provider and signer
  const provider = new ethers.providers.JsonRpcProvider(networkConfig.networkUrl);
  const signer = new ethers.Wallet(networkConfig.privateKey, provider);

  return signer
}

export async function getContractsAddress() {
  const eRC20HelperContract = await deployments.get("ERC20Helper");
  const eRC20HelperAddress = eRC20HelperContract.address;

  const loggerContract = await deployments.get("Logger");
  const loggerAddress = loggerContract.address;

  const mathHelperContract = await deployments.get("MathHelper");
  const mathHelperAddress = mathHelperContract.address;

  const mathSD21x18Contract = await deployments.get("MathSD21x18");
  const mathSD21x18Address = mathSD21x18Contract.address;

  const riskHelperContract = await deployments.get("RiskHelper");
  const riskHelperAddress = riskHelperContract.address;

  const gasInfoContract = await deployments.get("GasInfo");
  const gasInfoAddress = gasInfoContract.address;

  const arbAirdropContract = await deployments.get("ArbAirdrop");
  const arbAirdropAddress = arbAirdropContract.address;

  const clearingHouseContract = await deployments.get("Clearinghouse");
  const clearinghouseAddress = clearingHouseContract.address;

  const clearinghouseLiqContract = await deployments.get("ClearinghouseLiq");
  const clearinghouseLiqAddress = clearinghouseLiqContract.address;

  const endpointContract = await deployments.get("Endpoint");
  const endpointAddress = endpointContract.address;

  const mockSanctionsListContract = await deployments.get("MockSanctionsList");
  const mockSanctionsListAddress = mockSanctionsListContract.address;

  const offchainExchangeContract = await deployments.get("OffchainExchange");
  const offchainExchangeAddress = offchainExchangeContract.address;

  const perpEngineContract = await deployments.get("PerpEngine");
  const perpEngineAddress = perpEngineContract.address;

  const spotEngineContract = await deployments.get("SpotEngine");
  const spotEngineAddress = spotEngineContract.address;

  const verifierContract = await deployments.get("Verifier");
  const verifierAddress = verifierContract.address;

  const sequencerContract = await deployments.get("MockSequencer");
  const sequencerAddress = sequencerContract.address;

  const sanctionsContract = await deployments.get("MockSanctions");
  const sanctionsAddress = sanctionsContract.address;

  const perpOracleContract = await deployments.get("PerpOracle");
  const perpOracleAddress = perpOracleContract.address;

  const perpetualContract = await deployments.get("Perpetual");
  const perpetualAddress = perpetualContract.address;

  const orderBookContract = await deployments.get("OrderBook");
  const orderBookAddress = orderBookContract.address;

  const perpetualFactoryContract = await deployments.get("PerpetualFactory");
  const perpetualFactoryAddress = perpetualFactoryContract.address;

  let quoteTokenAddress: string, 
    vertexTokenAddress: string, 
    wbtcTokenAddress: string, 
    ethTokenAddress: string,
    woneTokenAddress: string,
    usdtTokenAddress: string;
  if (!config.isHarmony) {
    const quoteToken = await deployments.get('MockQuoteToken')
    quoteTokenAddress = quoteToken.address
    const vertexTokenContract = await deployments.get("VertexToken");
    vertexTokenAddress = vertexTokenContract.address;
    const usdtToken = await deployments.get('MockUsdcToken')
    usdtTokenAddress = usdtToken.address
    wbtcTokenAddress = "0x0000000000000000000000000000000000000000";
    ethTokenAddress = "0x0000000000000000000000000000000000000000";
    woneTokenAddress = "0x0000000000000000000000000000000000000000";
  } else {
    quoteTokenAddress = "0xBC594CABd205bD993e7FfA6F3e9ceA75c1110da5";
    vertexTokenAddress = "0x0000000000000000000000000000000000000000";
    wbtcTokenAddress = "0x118f50d23810c5E09Ebffb42d7D3328dbF75C2c2";
    ethTokenAddress = "0x4cC435d7b9557d54d6EF02d69Bbf72634905Bf11";
    woneTokenAddress = "0xcF664087a5bB0237a0BAd6742852ec6c8d69A27";
    usdtTokenAddress = "0xF2732e8048f1a411C63e2df51d08f4f52E598005";
  }
  return {
    eRC20Helper: eRC20HelperAddress, // 0xf98A133d48365B9e20fdf2876714C49F56bf911f
    logger: loggerAddress, // 0x70802DB1d4b25eb8019867Df7b9d8D5e2794B4db
    mathHelper: mathHelperAddress, // 0x518136cB5f40F092916c7759aef6Bf265eB5fEbF
    mathSD21x18: mathSD21x18Address, // 0x7BA0271D916a7954773A1e4F3Eea4e39c7da4A81
    riskHelper: riskHelperAddress, // 0xF4F1BeA92a1da5836963428Bd85fBe1109a92609
    gasInfo: gasInfoAddress, // 0xA25A94bdF7b810b9c21D69A1453CE5FEF2f8cC9a
    arbAirdrop: arbAirdropAddress, // 0x912F828227c95dfEE24C948e5FA844774c9e2656
    clearinghouse: clearinghouseAddress, // 0x12AE98399eD4d5E40997488AE1528e5D7e0C0798
    clearinghouseLiq: clearinghouseLiqAddress, // 0x8Ca19C84B04b4Ec364681E0D102939CAE4053134
    endpoint: endpointAddress, // 0x5790A7d9d0a54B05bFeE43fDc43F0C02e7116289
    mockSanctionsList: mockSanctionsListAddress, // 0x7a0f60094F167D782cbb579a0b7146bF8E5e812D
    offchainExchange: offchainExchangeAddress, // 0x744116327e96adAe3c29A1599aFa772CC5d4265F
    perpEngine: perpEngineAddress, // 0xe11434D84D4E2a1084674566411E98aF8d48C5DF
    spotEngine: spotEngineAddress, // 0x0e072710f7c21149C2E7466239AcBCFa0B238c84
    verifier: verifierAddress, // 0x948d1ec536D9AbCbD97f5B318e6F2a4BEfd1f8F0
    sequencer: sequencerAddress, // 0xD3E86D822911bFB87eAcCa74fFC6658968BAe86E
    sanctions: sanctionsAddress, // 0xD571511D563265e03FfEBa875274bDd71E3E3d80
    perpOracle: perpOracleAddress,
    perpetual: perpetualAddress,
    orderBook: orderBookAddress,
    perpetualFactory: perpetualFactoryAddress,
    quoteToken: quoteTokenAddress,
    wbtcToken: wbtcTokenAddress,
    vertexToken: vertexTokenAddress,
    ethToken: ethTokenAddress,
    usdtToken: usdtTokenAddress,
    woneToken: woneTokenAddress,
  };
}





export { TOKENS };
// export const getTokenName = (id: number) => {
//   switch (id) {
//     case 0: 
//       return !isLocalDeployment() ? 'USDC_HARMONY' : 'USDC_HARDHAT'
//     case 1: 
//       return !isLocalDeployment() ? 'VRTX_HARMONY' : 'VRTX_HARDHAT'
//     case 3: 
//       return !isLocalDeployment() ? 'WBTC_HARMONY' : 'WBTC_HARDHAT'
//     case 2:
//       return 'PERP_WBTC';
//     case 4:
//       return 'PERP_ETH';
//     }
// }

// const getTokenName = (id: number) => {
//   const token = [...SPOT_TOKENS, ...PERP_TOKENS].find(t => t.id === id);
//   if (!token) return null;

//   const prefix = PERP_TOKENS.some(t => t.id === id) ? 'PERP_' : '';
//   const suffix = !isLocalDeployment() ? '_HARMONY' : '_HARDHAT';

//   return `${prefix}${token.name}${suffix}`;
// };


// export const SPOT_QUOTE_TOKEN_ID = 0
// export const SPOT_VRTX_TOKEN_ID = 1
// export const SPOT_WBTC_TOKEN_ID = 3

// export const PERP_WBTC_TOKEN_ID = 2
// export const PERP_ETH_TOKEN_ID = 4
