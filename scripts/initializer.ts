import { ethers, getNamedAccounts } from 'hardhat';
import { generateTestPoints, getContractsAddress, getSpread } from './helper';

async function endPointInitializer() {
  try {
    const {
      clearinghouse: clearinghouseAddress,
      endpoint: endpointAddress,
      sanctions: sanctionsAddress,
      sequencer: sequencerAddress,
      offchainExchange: offchainExchangeAddress,
      verifier: verifierAddress
    } = await getContractsAddress()

    const endpoint = await ethers.getContractAt('Endpoint', endpointAddress);

    if (!await endpoint.isInitialized()) {
      const initialPrices: string[] = [
        ethers.utils.parseUnits("0.00075", 18).toString(),  // $0.00075 or 0.075 cents cents for Product ID 0
        ethers.utils.parseUnits("0.00080", 18).toString(), // $0.00080 or 0.080 cents for Product ID 1
        ethers.utils.parseUnits("0.00001", 18).toString(),// $0.00001 or 0.001 cents cents for Product ID 2
      ];
      // Initialize Endpoint
      await endpoint.initialize(
        sanctionsAddress,
        sequencerAddress,
        offchainExchangeAddress,
        clearinghouseAddress,
        verifierAddress,
        initialPrices
      );
      console.log('Endpoint initialized');
    } else {
      console.log("Endpoint already initialized")
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
  }
}

async function clearinghouseInitializer() {
  try {
    const {
      clearinghouseLiq: clearinghouseLiqAddress,
      clearinghouse: clearinghouseAddress,
      endpoint: endpointAddress,
    } = await getContractsAddress()
    // contact address taken from here: https://www.custonomy.io/supported-tokens/usd-coin/usdc-on-harmony
    const oneusdcAddress = "0x985458E523dB3d53125813eD68c274899e9DfAb4"; // 1USDC
    const clearinghouse = await ethers.getContractAt("Clearinghouse", clearinghouseAddress);
    if (!await clearinghouse.isInitialized()) {
      const spread = getSpread()
      const tx = await clearinghouse.initialize(
        endpointAddress,
        oneusdcAddress,
        clearinghouseLiqAddress,
        spread
      );
      console.log("Initialization transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Clearinghouse initialization ...", receipt)
    } else {
      console.log("Clearinghouse already initialized")
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
  }
}

async function verifierInitializer() {
  const {
    verifier: verifierAddress
  } = await getContractsAddress()
  try {
    let owner = ""
    let state = []

    const verifier = await ethers.getContractAt("Verifier", verifierAddress)
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
  }
}

async function spotEngineInitializer() {
  try {
    const {
      clearinghouse: clearinghouseAddress,
      endpoint: endpointAddress,
      offchainExchange: offchainExchangeAddress,
      spotEngine: spotEngineAddress,
    } = await getContractsAddress()
    const { deployer } = await getNamedAccounts();
    // contact address taken from here: https://www.custonomy.io/supported-tokens/usd-coin/usdc-on-harmony
    const oneusdcAddress = "0x985458E523dB3d53125813eD68c274899e9DfAb4"; // 1USDC
    const spotEngine = await ethers.getContractAt("SpotEngine", spotEngineAddress);
    if (!await spotEngine.isInitialized()) {
      const tx = await spotEngine.initialize(
        clearinghouseAddress,
        offchainExchangeAddress,
        oneusdcAddress,
        endpointAddress,
        deployer
      );
      console.log("Initialization transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("SpotEngine initialization ...", receipt.gasUsed)
    } else {
      console.log("PerpEngine already initialized")
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
  }
}

async function perpEngineInitializer() {
  try {
    const {
      clearinghouse: clearinghouseAddress,
      endpoint: endpointAddress,
      offchainExchange: offchainExchangeAddress,
      perpEngine: perpEngineAddress,
    } = await getContractsAddress()
    const { deployer } = await getNamedAccounts();
    // contact address taken from here: https://www.custonomy.io/supported-tokens/usd-coin/usdc-on-harmony
    const oneusdcAddress = "0x985458E523dB3d53125813eD68c274899e9DfAb4"; // 1USDC
    const perpEngine = await ethers.getContractAt("PerpEngine", perpEngineAddress);
    if (!await perpEngine.isInitialized()) {
      const tx = await perpEngine.initialize(
        clearinghouseAddress,
        offchainExchangeAddress,
        oneusdcAddress,
        endpointAddress,
        deployer
      );
      console.log("Initialization transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("PerpEngine initialization ...", receipt.gasUsed)
    } else {
      console.log("PerpEngine already initialized")
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
  }
}

async function arbAirdropInitializer() {
  try {
    const {
      sanctions: sanctionsAddress,
      arbAirdrop: arbAirdropAddress,
    } = await getContractsAddress()
    // token address taken from https://explorer.harmony.one/address/0xcf664087a5bb0237a0bad6742852ec6c8d69a27a 
    const airdropTokenAddress = "0xcf664087a5bb0237a0bad6742852ec6c8d69a27a"
    const arbAirdrop = await ethers.getContractAt("ArbAirdrop", arbAirdropAddress);
    if (!await arbAirdrop.isInitialized()) {
      const tx = await arbAirdrop.initialize(
        airdropTokenAddress,
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
  }
}

async function main() {
  await verifierInitializer()
  await endPointInitializer()
  await clearinghouseInitializer()
  await spotEngineInitializer()
  await perpEngineInitializer()
  await arbAirdropInitializer()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });