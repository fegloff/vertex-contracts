import { ethers } from 'hardhat';
import {
  getContractsAddress,
  getSigner,
  isZeroAddress,
} from './helper';
import { 
  TOKENS,
  ENGINE_TYPE
} from './constants';
import { config } from '../../config'
import { SpotToken } from './types';

export async function addSpotProducts() {
  try {
    const {
      spotEngine: spotEngineAddress,
      orderBookFactory: orderBookFactoryAddress, 
      ...tokenAdress
    } = await getContractsAddress()
    
    const signer = await getSigner()


    const spotEngine = await ethers.getContractAt("SpotEngine", spotEngineAddress, signer);
    const orderBookFactory = await ethers.getContractAt("OrderBookFactory", orderBookFactoryAddress, signer);
    
    console.log('Products:::::', await spotEngine["getProductIds()"]())
    const isInitialized = await spotEngine.isInitialized();

    if (isInitialized) {
      const spotTokens = Object.values(TOKENS).filter(t => t.type === ENGINE_TYPE.SPOT && t.id !== TOKENS.SPOT_QUOTE.id) as SpotToken[];
      const sizeIncrement = ethers.utils.parseUnits("0.01", 18);
      const minSize = ethers.utils.parseUnits("1", 18);
      const lpSpreadX18 = ethers.utils.parseUnits("0.001", 18);
      for (const token of spotTokens) { 
        if (token.id === 0) {
          // spotEngine deployment adds QUOTE_TOKEN without orderbook
          continue;
        }
        const address = tokenAdress[token.addressKey]
        console.log(config.isHarmony, config.isLocal)
        const productConfig = {
          token: address,
          interestInflectionUtilX18: ethers.utils.parseUnits("0.8", 18),
          interestFloorX18: ethers.utils.parseUnits("0.01", 18),
          interestSmallCapX18: ethers.utils.parseUnits("0.04", 18),
          interestLargeCapX18: ethers.utils.parseUnits("1", 18)
        };
        await orderBookFactory.createOrderBook(token.id, address)
        const orderBookAddress = await orderBookFactory.getOrderBook(token.id)
        console.log(`Orderbook address for token ${token.id}: ${orderBookAddress}`)
        const tx = await spotEngine.addProduct(
          token.id,
          orderBookAddress,
          sizeIncrement,
          minSize,
          lpSpreadX18,
          productConfig,
          token.risk,
        );
        await tx.wait()
        console.log(`Added product ${token.name} to SpotEngine`);
      }
    } else {
      console.log(`Please initialize the SpotEngine Contract`)
    }
    console.log('Products update:::::', await spotEngine["getProductIds()"]())
  } catch (error) {
    console.error("SpotEngine addProduct failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}
