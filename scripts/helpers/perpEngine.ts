import { ethers } from 'hardhat';
import { getContractsAddress,
  getSigner,
} from './helper';
import { 
  ENGINE_TYPE, 
  TOKENS 
} from './constants';
import { config } from '../../config'


export async function addPerpProducts() {
  try {
    const {
      perpEngine: perpEngineAddress,
      orderBookFactory: orderBookFactoryAddress,
      perpetualFactory: perpetualFactoryAddress,
      perpOracle: perpOracleAddress,
    } = await getContractsAddress()
    
    const signer = await getSigner()
    const perpFactory = await ethers.getContractAt("PerpetualFactory", perpetualFactoryAddress, signer);
    const perpEngine = await ethers.getContractAt("PerpEngine", perpEngineAddress, signer);
    const orderBookFactory = await ethers.getContractAt("OrderBookFactory", orderBookFactoryAddress, signer);
    console.log('Products:::::', await perpEngine["getProductIds()"]())
    if (await perpEngine.isInitialized()) {
      const perpTokens = Object.values(TOKENS).filter(t => t.type === ENGINE_TYPE.PERP);
      
      const initialPrice = ethers.utils.parseUnits("1", 18);

      const perpOracle = await ethers.getContractAt("PerpOracle", perpOracleAddress, signer);
      
      const sizeIncrement = ethers.utils.parseUnits("0.1", 18); // Adjust as needed
      const minSize = ethers.utils.parseUnits("1", 18); // Adjust as needed
      const lpSpreadX18 = ethers.utils.parseUnits("0.001", 18); // 0.1% spread
      const useChainlink = false; // config.isHarmony; 
      for (const token of perpTokens) { 
        if (!useChainlink) {
          try {
            const priceTx = await perpOracle.setCustomPrice(token.id, initialPrice);
            await priceTx.wait()
            const customPrice = await perpOracle.getCustomPrice(token.id)
            console.log(`Oracle: Set custom price for ${token.name}: ${customPrice}`);
          } catch (error) {
            console.error(`Oracle: Failed to set price for ${token.name}:`, error);
          }
        }
        try {
          const symbol = ethers.utils.formatBytes32String(token.symbol);
          const perpTx = await perpFactory.deployPerpetual(
            symbol,
            token.id,
            ethers.utils.formatBytes32String(`${token.symbol}-USD`),
            perpEngineAddress,
            perpOracleAddress
          );
          await perpTx.wait()
          const perpetualAddress = await perpFactory.getPerpetualAddress(symbol);
          console.log(`Perpetual address for ${token.id}: ${perpetualAddress}`)
          const bookTx = await orderBookFactory.createOrderBook(token.id, perpetualAddress)
          await bookTx.wait()
          const orderBookAddress = await orderBookFactory.getOrderBook(token.id)
          console.log(`Orderbook created for ${token.id}: ${orderBookAddress}`)
          const addTx = await perpEngine.addProduct(token.id, orderBookAddress, sizeIncrement, minSize, lpSpreadX18, token.risk);
          await addTx.wait()
          console.log(`Added product ${token.name} to PerpEngine`);
        } catch (error) {
          console.error(`Failed to add product ${token.name}:`, error);
        }
      }
      console.log("All PerpTokens added to the PerpEngine contract");
    } else {
      console.log(`Please initialize the PerpEngine Contract`)
    }
    console.log('Products update:::::', await perpEngine["getProductIds()"]())
  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}
