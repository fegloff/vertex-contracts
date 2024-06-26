import { ethers, deployments } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  // Assume ClearingHouse is already deployed
  const clearingHouseContract = await deployments.get("Clearinghouse");
  const clearinghouseAddress = clearingHouseContract.address;
  
  const endpointContract = await deployments.get("Endpoint");
  const endpointAddress = endpointContract.address;
  
  const mockSanctionsContract = await deployments.get("MockSanctions");
  const sanctionsAddress = mockSanctionsContract.address;

  const mockSequencerContract = await deployments.get("MockSequencer") 
  const sequencerAddress = mockSequencerContract.address;

  const offchainExchangeContract = await deployments.get("OffchainExchange")
  const offchainExchangeAddress = offchainExchangeContract.address; // '0x3b4C5009c3C1107F526867C5aB360bBD5A6D5692';
  
  const verifierContract = await deployments.get("Verifier")
  const verifierAddress = verifierContract.address; // '0xde04eE2172803813dDcAE6B0ABA66A7ecE2bD1F4';

  // Connect to contracts
  const Endpoint = await ethers.getContractFactory('Endpoint');
  const endpoint = Endpoint.attach(endpointAddress);

  // Prepare initialization parameters

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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });