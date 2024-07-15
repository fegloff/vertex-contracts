import { ethers } from 'hardhat';
import { getContractsAddress,
  getSigner,
  getTokenName,
  USDC_TOKEN_ID
} from './helper';
// npx hardhat run scripts/spotEngine.ts --network mainnet
// 

export async function addProduct() {
  try {
    const {
      spotEngine: spotEngineAddress, 
      offchainExchange: offchainExchangeAddress,
      usdcToken: token23Address
    } = await getContractsAddress()
    
    const signer = await getSigner()

    const usdcTokenName = getTokenName(USDC_TOKEN_ID)

    console.log(spotEngineAddress, offchainExchangeAddress)

    const spotEngine = await ethers.getContractAt("SpotEngine", spotEngineAddress, signer);
  
    const isInitialized = await spotEngine.isInitialized();

    console.log("SpotEngine initialized::::::::", isInitialized);

    // Define the parameters for addProduct
    const productId = USDC_TOKEN_ID;
    const book = offchainExchangeAddress; // offchainExchangeAddress; // Address of your OffchainExchange contract
    const sizeIncrement = ethers.utils.parseUnits("0.01", 18);
    const minSize = ethers.utils.parseUnits("1", 18);
    const lpSpreadX18 = ethers.utils.parseUnits("0.001", 18);
  
    const productConfig = {
      token: token23Address,
      interestInflectionUtilX18: ethers.utils.parseUnits("0.8", 18),
      interestFloorX18: ethers.utils.parseUnits("0.01", 18),
      interestSmallCapX18: ethers.utils.parseUnits("0.04", 18),
      interestLargeCapX18: ethers.utils.parseUnits("1", 18)
    };
  
    const riskStore = {
      longWeightInitial: ethers.utils.parseUnits("1", 9),
      shortWeightInitial: ethers.utils.parseUnits("1", 9),
      longWeightMaintenance: ethers.utils.parseUnits("1", 9),
      shortWeightMaintenance: ethers.utils.parseUnits("1", 9),
      priceX18: ethers.utils.parseUnits("1", 18)
    };
    
    const tx = await spotEngine.addProduct(
      productId,
      book,
      sizeIncrement,
      minSize,
      lpSpreadX18,
      productConfig,
      riskStore,
    );
  
    const receipt = await tx.wait();
  
    for (const event of receipt.events) {
      console.log(`Event: ${event.event}, Data: ${JSON.stringify(event.args)}`);
    }

    console.log(`${usdcTokenName} token added as a new product`);
  
  } catch (error) {
    console.error("SpotEngine addProduct failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}
