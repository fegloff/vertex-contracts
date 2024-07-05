import { ethers, deployments } from 'hardhat';
import { config } from '../config';

export interface Point {
  x: ethers.BigNumber;
  y: ethers.BigNumber;
}

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

export async function getContractsAddress() {
  
  const clearingHouseContract = await deployments.get("Clearinghouse", { tag: config.tag });
  const clearinghouseAddress = clearingHouseContract.address;
  
  const endpointContract = await deployments.get("Endpoint", { tag: config.tag });
  const endpointAddress = endpointContract.address;
  
  const mockSanctionsContract = await deployments.get("MockSanctions", { tag: config.tag });
  const sanctionsAddress = mockSanctionsContract.address;

  const mockSequencerContract = await deployments.get("MockSequencer", { tag: config.tag }) 
  const sequencerAddress = mockSequencerContract.address;

  const offchainExchangeContract = await deployments.get("OffchainExchange", { tag: config.tag })
  const offchainExchangeAddress = offchainExchangeContract.address;

  const verifierContract = await deployments.get("Verifier", { tag: config.tag })
  const verifierAddress = verifierContract.address; // '0xde04eE2172803813dDcAE6B0ABA66A7ecE2bD1F4';
 
  return {
    eRC20Helper: "0x2a685441FBa7529c813244943f1E938b5F877318",
    logger: "0x50733026258406d6254ad85C6d7D74d44d1cf4EC",
    mathHelper: "0x502d493F8e55e3Cf20ca2160c95C2adEa4eB1F75",
    mathSD21x18: "0x5Cc143ac2ea61f19A2a064a8866d627274D4a80e",
    riskHelper: "0x39D888086009Ad47feb37EF4879259cB648b24aC",
    gasInfo: "0x5e7d93dbf797F2f19e59fEd67EEC9ECF6527aF8e",
    arbAirdrop: "0x0456ADC2aE5A5D83140cbd2830bfB22768979B53",
    clearinghouse: clearinghouseAddress, // 0x53D1413dfB1D8cdA269245751A895D726779c543
    clearinghouseLiq: "0xD7e62Ab834eAd29a75dc269C1c4468a0c6192a37",
    endpoint: endpointAddress, // 0x35AB09652662a248a017B963Da94d507397615b4
    mockSanctionsList: "0xe02622707db11075A54Cb55eEf15BD3e029E48AE",
    offchainExchange: offchainExchangeAddress, // 0x1B6Ac343382AEEdA5B65E616A241729c241c37c1
    perpEngine: "0xab580BdE8Ea0e3058deD895aa9E21084D6147f24",
    spotEngine: "0xE2CC80379C714c9833aA626b9609999FA862d7bE",
    verifier: verifierAddress, // 0x109622cE4Ed09E3131D3b0e3B94078E42a6E70f0
    mockERC20: "0xB428C64E196ce0dC3f455208337233A83969D229", // 0x578A26aBa2417A22501b8B06410Fb2fbfe635bc6
    sequencer: sequencerAddress, // 0xFF83f2190Fb75bD1676F424784b1F9481Ba6b6Fd
    sanctions: sanctionsAddress // 0xf5643FA87AB572eCa4d6CbDCC44500D76B282B3b
  };
}