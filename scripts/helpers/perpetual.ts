import { ethers } from 'hardhat';
import { getContractsAddress,
  getSigner,
} from './helper';
import { 
  ENGINE_TYPE, 
  TOKENS 
} from './constants';

export async function createPerpContracts() {
  try {
    const {
      perpetualFactory: perpetualFactoryAddress,
      perpEngine: perpEngineAddress,
      orderBook: orderBookAddress,
      perpOracle: perpOracleAddress,
    } = await getContractsAddress()
    
    const signer = await getSigner()

    const perpFactory = await ethers.getContractAt("PerpetualFactory", perpetualFactoryAddress, signer);
    const orderBook = await ethers.getContractAt("OrderBook", orderBookAddress, signer);
    const perpTokens = Object.values(TOKENS).filter(t => t.type === ENGINE_TYPE.PERP);
    
    for (const token of perpTokens) {
      const symbol = ethers.utils.formatBytes32String(token.symbol);
      const tx = await perpFactory.deployPerpetual(
        symbol,
        token.id,
        ethers.utils.formatBytes32String(`${token.symbol}-USD`),
        perpEngineAddress,
        perpOracleAddress
      );
      await tx.wait();
  
      const perpetualAddress = await perpFactory.getPerpetualAddress(symbol);
      console.log(`Perpetual contract for ${token.symbol} deployed to:`, perpetualAddress);
      
      const txOrderBook = await orderBook.addMarket(token.id, perpetualAddress, true);
      await txOrderBook.wait();
      console.log(`Order Book market ${token.symbol} added`);
    }
    
//     await perpEngine.addProduct(/* ... */);

// // Add to OrderBook
// const orderBookAddress = "0x..."; // Order book contract address
// const orderBook = await ethers.getContractAt("IOrderBook", orderBookAddress, signer);

// await orderBook.addMarket(productId, perpetualContractAddress, 

  } catch (error) {
    console.error("Initialization failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}
