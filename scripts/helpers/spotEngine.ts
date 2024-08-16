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

export async function addSpotProducts() {
  try {
    const {
      spotEngine: spotEngineAddress, 
      orderBook: orderBookAddress,
      ...tokenAdress
    } = await getContractsAddress()
    
    const signer = await getSigner()

    console.log(spotEngineAddress, orderBookAddress)

    const spotEngine = await ethers.getContractAt("SpotEngine", spotEngineAddress, signer);
    const orderBook = await ethers.getContractAt("OrderBook", orderBookAddress, signer);
    
    const isInitialized = await spotEngine.isInitialized();

    if (isInitialized) {
      const spotTokens = Object.values(TOKENS).filter(t => t.type === ENGINE_TYPE.SPOT && t.id !== TOKENS.SPOT_QUOTE.id);
      const sizeIncrement = ethers.utils.parseUnits("0.01", 18);
      const minSize = ethers.utils.parseUnits("1", 18);
      const lpSpreadX18 = ethers.utils.parseUnits("0.001", 18);
      for (const token of spotTokens) { 
        const address = tokenAdress[token.addressKey]
        console.log(config.isHarmony, config.isLocal)
        const productConfig = {
          token: address,
          interestInflectionUtilX18: ethers.utils.parseUnits("0.8", 18),
          interestFloorX18: ethers.utils.parseUnits("0.01", 18),
          interestSmallCapX18: ethers.utils.parseUnits("0.04", 18),
          interestLargeCapX18: ethers.utils.parseUnits("1", 18)
        };
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
        if (!isZeroAddress(address)) {
          const isPerp = false;
          console.log(token.id, address)
          const txOrderBook = await orderBook.addMarket(token.id, address, isPerp);
          await txOrderBook.wait();
        }
      }
    } else {
      console.log(`Please initialize the SpotEngine Contract`)
    }
  } catch (error) {
    console.error("SpotEngine addProduct failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}
