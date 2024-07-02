import { ethers, deployments } from 'hardhat';
import { generateTestPoints, getContractsAddress, Point } from './helper';

async function endPointInitializer() {
  const {
    clearinghouse: clearinghouseAddress,
    endpoint: endpointAddress,
    sanctions: sanctionsAddress,
    sequencer: sequencerAddress,
    offchainExchange: offchainExchangeAddress,
    verifier: verifierAddress
   } = await getContractsAddress()

  const endpoint = await ethers.getContractAt('Endpoint', endpointAddress);

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
}

async function verifierInitializer() {
  const {
    verifier: verifierAddress
  } = await getContractsAddress()
  try {
    let owner = ""
    let state = []

    const verifier = await ethers.getContractAt("Verifier", verifierAddress)

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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });