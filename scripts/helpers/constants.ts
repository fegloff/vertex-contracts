import { ethers } from "ethers";
import { config } from '../../config';

export enum ENGINE_TYPE {
  SPOT = 0,
  PERP = 1,
}

export const RISK_STORE = {
  low: {
    longWeightInitial: ethers.utils.parseUnits("0.9", 9),
    shortWeightInitial: ethers.utils.parseUnits("1.1", 9),
    longWeightMaintenance: ethers.utils.parseUnits("0.95", 9),
    shortWeightMaintenance: ethers.utils.parseUnits("1.05", 9),
    priceX18: ethers.utils.parseUnits("1", 9)
  },
  medium: {
    longWeightInitial: ethers.utils.parseUnits("0.8", 9),
    shortWeightInitial: ethers.utils.parseUnits("1.2", 9),
    longWeightMaintenance: ethers.utils.parseUnits("0.9", 9),
    shortWeightMaintenance: ethers.utils.parseUnits("1.1", 9),
    priceX18: ethers.utils.parseUnits("1", 9)
  },
  high: {
    longWeightInitial: ethers.utils.parseUnits("0.7", 9),
    shortWeightInitial: ethers.utils.parseUnits("1.3", 9),
    longWeightMaintenance: ethers.utils.parseUnits("0.8", 9),
    shortWeightMaintenance: ethers.utils.parseUnits("1.2", 9),
    priceX18: ethers.utils.parseUnits("1", 9)
  }
}

// USDC/USDT: Lower risk (stablecoins)
// ETH/WBTC: Medium risk (major cryptocurrencies)
// WONE/VRTX: Higher risk (less liquid assets)
export const TOKENS = {
  SPOT_QUOTE: { 
    id: 0, 
    symbol: 'USDC', 
    name: config.isLocal ? 'USDC_HARDHAT' : 'USDC_HARMONY', 
    type: ENGINE_TYPE.SPOT, 
    risk: RISK_STORE.low, 
    addressKey: "quoteToken"
  },
  SPOT_VRTX: { 
    id: 1,  
    symbol: 'VRTX', 
    name: config.isLocal ? 'VRTX_HARDHAT' : 'VRTX_HARMONY', 
    type: ENGINE_TYPE.SPOT, 
    risk: RISK_STORE.high, 
    addressKey: "vertexToken"
  },
  SPOT_WBTC: { 
    id: 3,  
    symbol: 'WBTC', 
    name: config.isLocal  ? 'WBTC_HARDHAT': 'WBTC_HARMONY', 
    type: ENGINE_TYPE.SPOT, 
    risk: RISK_STORE.medium, 
    addressKey: "wbtcToken"
  },
  SPOT_ETH: { 
    id: 5,  
    symbol: 'ETH', 
    name: config.isLocal ? 'ETH_HARDHAT' : 'ETH_HARMONY', 
    type: ENGINE_TYPE.SPOT, 
    risk: RISK_STORE.low, 
    addressKey: "ethToken"
  },
  SPOT_USTD: { 
    id: 7,  
    symbol: 'USDT', 
    name: config.isLocal ? 'USDT_HARDHAT' : 'USDT_HARMONY', 
    type: ENGINE_TYPE.SPOT, 
    risk: RISK_STORE.high, 
    addressKey: "usdtToken"
  },
  PERP_WBTC: { 
    id: 2,  
    symbol: 'WBTC', 
    name: 'PERP_WBTC', 
    type: ENGINE_TYPE.PERP, 
    risk: RISK_STORE.medium, 
    addressKey: "wbtcToken"
  },
  PERP_ETH: { 
    id: 4,  
    symbol: 'ETH', 
    name: 'PERP_ETH', 
    type: ENGINE_TYPE.PERP, 
    risk: RISK_STORE.medium, 
    addressKey: "ethToken"
  },
  PERP_WONE: { 
    id: 6,  
    symbol: 'WONE', 
    name: 'PERP_WONE', 
    type: ENGINE_TYPE.PERP, 
    risk: RISK_STORE.high, 
    addressKey: "woneToken"
  },
  PERP_USDT: { 
    id: 8,  
    symbol: 'USTD', 
    name: 'PERP_USDT', 
    type: ENGINE_TYPE.PERP, 
    risk: RISK_STORE.low, 
    addressKey: "usdtToken"
  },
};