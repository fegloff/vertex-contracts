import { ethers } from 'hardhat';
import { getContractsAddress,
  getSigner,
} from './helper';
import { 
  ENGINE_TYPE, 
  TOKENS 
} from './constants';


export async function addPerpProducts() {
  try {
    const {
      perpEngine: perpEngineAddress,
      orderBook: orderBookAddress,
      perpOracle: perpOracleAddress
    } = await getContractsAddress()
    
    const signer = await getSigner()

    const perpEngine = await ethers.getContractAt("PerpEngine", perpEngineAddress, signer);
    
    if (await perpEngine.isInitialized()) {
      const perpTokens = Object.values(TOKENS).filter(t => t.type === ENGINE_TYPE.PERP);
      
      const initialPrice = ethers.utils.parseUnits("1", 18);

      const perpOracle = await ethers.getContractAt("PerpOracle", perpOracleAddress, signer);
      
      const sizeIncrement = ethers.utils.parseUnits("0.1", 18); // Adjust as needed
      const minSize = ethers.utils.parseUnits("1", 18); // Adjust as needed
      const lpSpreadX18 = ethers.utils.parseUnits("0.001", 18); // 0.1% spread

      for (const token of perpTokens) { 
        try {
          await perpOracle.setCustomPrice(token.id, initialPrice);
          console.log(`Oracle: Set custom price for ${token.name}`);
        } catch (error) {
          console.error(`Oracle: Failed to set price for ${token.name}:`, error);
        }
        try {
          await perpEngine.addProduct(token.id, orderBookAddress, sizeIncrement, minSize, lpSpreadX18, token.risk);
          console.log(`Added product ${token.name} to PerpEngine`);
        } catch (error) {
          console.error(`Failed to add product ${token.name}:`, error);
        }
        
      }
      console.log("All PerpTokens added to the PerpEngine contract");
    } else {
      console.log(`Please initialize the PerpEngine Contract`)
    }
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}
