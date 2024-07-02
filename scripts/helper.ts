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
    eRC20Helper: "0x4E0951490aacdb77D33dA9e8567A3881a3Fc1096",
    logger: "0x2c58486b9397aD16f31E39b9C8154C08578C58d5",
    mathHelper: "0x659110544aee6a0937dAc5E97C9d05307939d22D",
    mathSD21x18: "0x986E6588226d51b8e990498408a8721fbE2479B3",
    riskHelper: "0x02977daeC3E233C193BBd05d60aA5BD969da344f",
    gasInfo: "0x0AC5531C101C74f036F912B4a8B4B0746dB7B740",
    arbAirdrop: "0x01E96f05aD08898953eB8e1B80ceEFd41ca5AC4C",
    clearinghouse: clearinghouseAddress, // 0x1dD343aDB90548B7AF93aBB9086b26e6F9c0F280
    clearinghouseLiq: "0x6cB2097B62C2Fc4f959091Adfe3a7A7747869534",
    endpoint: endpointAddress, // 0xE485ed4D9441EA7bf3e22fA4c3d688D6efcBF009
    mockSanctionsList: "0x061fbe11817beda36123839f4563d0bD0e28E0Fe",
    offchainExchange: offchainExchangeAddress,
    perpEngine: "0x098bE1c9D8E05b4071a8836E9803BfA4CE4D1E60",
    spotEngine: "0xa747FcD33CB06e6B6a4839f3FF3Cc9053E4E5021",
    verifier: verifierAddress,
    mockERC20: "0xB428C64E196ce0dC3f455208337233A83969D229",
    sequencer: sequencerAddress,
    sanctions: sanctionsAddress
  };
}