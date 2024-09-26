import { ethers } from 'hardhat';
import { getContractsAddress, getSigner } from './helper';

export enum EngineType {
  SPOT,
  PERP
}

export async function registerProduct(productId: number) {
  try {
    const {
      clearinghouse: clearinghouseAddress,
    } = await getContractsAddress()
    
    const signer = await getSigner()
  
    const clearinghouse = await ethers.getContractAt("Clearinghouse", clearinghouseAddress, signer);

    const tx = await clearinghouse.registerProduct(productId)

    const receipt = await tx.wait()

    console.log(`Added product ${productId} to clearinghouse (${clearinghouseAddress})`, receipt.gasUsed);
  
  } catch (error) {
    console.error("Clearinghouse registerProduct failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}

export async function addEngine(engineAddress: string, engineType: EngineType) {
  try {
    const {
      clearinghouse: clearinghouseAddress,
      offchainExchange: offchainExchangeAddress,
    } = await getContractsAddress()
    
    const signer = await getSigner()
  
    const clearinghouse = await ethers.getContractAt("Clearinghouse", clearinghouseAddress, signer);

    const tx = await clearinghouse.addEngine(engineAddress, offchainExchangeAddress, engineType)
  
    const receipt = await tx.wait();
  
    console.log(`${engineType} Engine (${engineAddress}) added to clearinghouse (${clearinghouseAddress})`, receipt.gasUsed);

  } catch (error) {
    console.error("Clearinghouse addEngine failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
    throw(error)
  }
}

