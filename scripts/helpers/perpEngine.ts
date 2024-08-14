import { ethers } from 'hardhat';
import { getContractsAddress,
  getSigner,
  getTokenName,
  PERP_USDC_TOKEN_ID,
} from './helper';

export async function addPerpProduct() {
  try {
    const {
      perpEngine: perpEngineAddress,
      orderBook: orderBookAddress,
      perpOracle: perpOracleAddress
    } = await getContractsAddress()
    
    const signer = await getSigner()

    const perpEngine = await ethers.getContractAt("PerpEngine", perpEngineAddress, signer);
    
    if (await perpEngine.isInitialized()) {
      const initialPrice = ethers.utils.parseUnits("1", 18);

      const perpOracle = await ethers.getContractAt("PerpOracle", perpOracleAddress, signer);
      await perpOracle.setCustomPrice(PERP_USDC_TOKEN_ID, initialPrice)
      
      console.log(`Custom price set for ${getTokenName(PERP_USDC_TOKEN_ID)}, product ID:`, PERP_USDC_TOKEN_ID);
      const sizeIncrement = ethers.utils.parseUnits("0.1", 18); // Adjust as needed
      const minSize = ethers.utils.parseUnits("1", 18); // Adjust as needed
      const lpSpreadX18 = ethers.utils.parseUnits("0.001", 18); // 0.1% spread
    
      // Risk parameters
      // const riskStore = {
      //   longWeightInitial: ethers.utils.parseUnits("1", 18),
      //   shortWeightInitial: ethers.utils.parseUnits("1", 18),
      //   longWeightMaintenance: ethers.utils.parseUnits("0.5", 18),
      //   shortWeightMaintenance: ethers.utils.parseUnits("0.5", 18),
      //   priceX18: ethers.utils.parseUnits("1", 18)
      // };
      const riskStore = {
        longWeightInitial: ethers.utils.parseUnits("1", 9),
        shortWeightInitial: ethers.utils.parseUnits("1", 9),
        longWeightMaintenance: ethers.utils.parseUnits("1", 9),
        shortWeightMaintenance: ethers.utils.parseUnits("1", 9),
        priceX18: ethers.utils.parseUnits("1", 18)
      };
      
      const tx = await perpEngine.addProduct(
        PERP_USDC_TOKEN_ID,
        orderBookAddress,
        sizeIncrement,
        minSize,
        lpSpreadX18,
        riskStore
      )
      console.log("Initialization transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log(`PerpEngine adding product Id ${PERP_USDC_TOKEN_ID}  ...`, receipt.gasUsed)
    } else {
      console.log(`Please initialize the PerpEngine ContractPerpEngine`)
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}
