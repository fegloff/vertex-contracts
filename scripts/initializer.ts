import { ethers, getNamedAccounts } from 'hardhat';
import { generateTestPoints, getContractsAddress, getSigner, getSpread, getTokenName, PERP_USDC_TOKEN_ID } from './helpers/helper';
import { Signer } from 'ethers';
import { addEngine, EngineType } from './helpers/clearinghouse';
import { addProduct } from './helpers/spotEngine';
import { addPerpProduct } from './helpers/perpEngine';

export async function offchainExchangeInitializer(signer: Signer) {
  try {
    const {
      clearinghouse: clearinghouseAddress,
      endpoint: endpointAddress,
      offchainExchange: offchainExchangeAddress,
    } = await getContractsAddress()

    const offchainExchange = await ethers.getContractAt('OffchainExchange', offchainExchangeAddress, signer);

    if (!await offchainExchange.isInitialized()) {
      // Initialize Endpoint
      const tx = await offchainExchange.initialize(
        clearinghouseAddress,
        endpointAddress
      );
      console.log("Initialization transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log('OffchainExchange initialized...', receipt.gasUsed);

    } else {
      console.log("OffchainExchange already initialized")
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}

export async function endPointInitializer(signer: Signer) {
  try {
    const {
      clearinghouse: clearinghouseAddress,
      endpoint: endpointAddress,
      sanctions: sanctionsAddress,
      sequencer: sequencerAddress,
      offchainExchange: offchainExchangeAddress,
      verifier: verifierAddress
    } = await getContractsAddress()

    const endpoint = await ethers.getContractAt('Endpoint', endpointAddress, signer);

    if (!await endpoint.isInitialized()) {
      const initialPrices: string[] = [
        ethers.utils.parseUnits("0.00075", 18).toString(),  // $0.00075 or 0.075 cents cents for Product ID 0
        ethers.utils.parseUnits("0.00080", 18).toString(), // $0.00080 or 0.080 cents for Product ID 1
        ethers.utils.parseUnits("0.00001", 18).toString(),// $0.00001 or 0.001 cents cents for Product ID 2
      ];
      // Initialize Endpoint
      const tx = await endpoint.initialize(
        sanctionsAddress,
        sequencerAddress,
        offchainExchangeAddress,
        clearinghouseAddress,
        verifierAddress,
        initialPrices
      );
      console.log("Initialization transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log('Endpoint initialized...', receipt.gasUsed);

    } else {
      console.log("Endpoint already initialized")
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}

async function clearinghouseInitializer(signer: Signer) {
  try {
    const {
      clearinghouseLiq: clearinghouseLiqAddress,
      clearinghouse: clearinghouseAddress,
      endpoint: endpointAddress,
      quoteToken: token0Address
    } = await getContractsAddress()
    const clearinghouse = await ethers.getContractAt("Clearinghouse", clearinghouseAddress, signer);
    if (!await clearinghouse.isInitialized()) {
      const spread = getSpread()
      const tx = await clearinghouse.initialize(
        endpointAddress,
        token0Address,
        clearinghouseLiqAddress,
        spread
      );
      console.log("Initialization transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Clearinghouse initialization ...", receipt.gasUsed)
    } else {
      console.log("Clearinghouse already initialized")
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}

async function verifierInitializer(signer: Signer) {
  const {
    verifier: verifierAddress
  } = await getContractsAddress()
  try {
    let owner = ""
    let state = []

    const verifier = await ethers.getContractAt("Verifier", verifierAddress, signer)

    if (!await verifier.isInitialized()) {
      console.log("Checking owner...");
      owner = await verifier.owner();
      console.log("Contract owner:", owner);

      console.log("Checking getContractState...");
      state = await verifier.getContractState();
      console.log("Contract state:", state);

      const points = generateTestPoints();

      points.forEach((point, index) => {
        console.log(`Point ${index}: x = ${point.x.toHexString()}, y = ${point.y.toHexString()}`);
      });

      const tx = await verifier.initialize(points);
      console.log("Initialization transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Initialization transaction mined");

      for (const log of receipt.logs) {
        try {
          const parsed = verifier.interface.parseLog(log);
          console.log("Event:", parsed.name, parsed.args);
        } catch (e) {
          console.log("Could not parse log:", log);
        }
      }

      console.log("Checking owner...");
      owner = await verifier.owner();
      console.log("Contract owner:", owner);

      console.log("Checking getContractState...");
      state = await verifier.getContractState();
      console.log("Contract state:", state);
    } else {
      console.log("Verifier already initialized")
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}

export async function vertexTokenInitializer(signer: Signer) {
  try {
    const {
      vertexToken: vertexTokenAddress,
      sanctions: sanctionsAddress,
    } = await getContractsAddress()

    const vertexToken = await ethers.getContractAt('VertexToken', vertexTokenAddress, signer);

    if (!await vertexToken.isInitialized()) {
      const tx = await vertexToken.initialize(
        sanctionsAddress
      );
      console.log("Initialization transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log('VertexToken initialized...', receipt.gasUsed);

    } else {
      console.log("VertexToken already initialized")
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}

// contact address taken from here: https://www.custonomy.io/supported-tokens/usd-coin/usdc-on-harmony
// const oneusdcAddress = "0x985458E523dB3d53125813eD68c274899e9DfAb4"; // 1USDC
async function spotEngineInitializer(signer: Signer) {
  try {
    const {
      clearinghouse: clearinghouseAddress,
      endpoint: endpointAddress,
      offchainExchange: offchainExchangeAddress,
      spotEngine: spotEngineAddress,
      quoteToken: token0Address
    } = await getContractsAddress()
    const { deployer } = await getNamedAccounts();
    
    const spotEngine = await ethers.getContractAt("SpotEngine", spotEngineAddress, signer);
    if (!await spotEngine.isInitialized()) {
      const tx = await spotEngine.initialize(
        clearinghouseAddress,
        offchainExchangeAddress,
        token0Address,
        endpointAddress,
        deployer
      );
      console.log("Initialization transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("SpotEngine initialization ...", receipt.gasUsed)
    } else {
      console.log(`SpotEngine (${spotEngineAddress}) already initialized"`)
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}

// token address taken from https://explorer.harmony.one/address/0xcf664087a5bb0237a0bad6742852ec6c8d69a27a 
//const airdropTokenAddress = "0xcf664087a5bb0237a0bad6742852ec6c8d69a27a"

async function arbAirdropInitializer(signer: Signer) {
  try {
    const {
      sanctions: sanctionsAddress,
      arbAirdrop: arbAirdropAddress,
      quoteToken: token0Address
    } = await getContractsAddress()

    const arbAirdrop = await ethers.getContractAt("ArbAirdrop", arbAirdropAddress, signer);
    if (!await arbAirdrop.isInitialized()) {
      const tx = await arbAirdrop.initialize(
        token0Address,
        sanctionsAddress
      );
      console.log("Initialization transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("ArbAirdrop initialization ...", receipt.gasUsed)
    } else {
      console.log("ArbAirdrop already initialized")
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}


async function main() {
  try {
    const {
      spotEngine: spotEngineAddress,
      perpEngine: perpEngineAddress,
    } = await getContractsAddress()
    
    const signer = await getSigner()
  
    await verifierInitializer(signer)
    await clearinghouseInitializer(signer)
    await arbAirdropInitializer(signer)
  
    await addEngine(spotEngineAddress, EngineType.SPOT)
    await addEngine(perpEngineAddress, EngineType.PERP)

    // requires clearinghouse addEngine
    await offchainExchangeInitializer(signer)
    await endPointInitializer(signer)
    await vertexTokenInitializer(signer)
    await addProduct()
    await addPerpProduct()
    
  } catch (e) {
    console.log(e)
    console.error('Excecution stop due to previous error')
  }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });