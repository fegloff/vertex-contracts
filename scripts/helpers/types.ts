import { ethers } from "ethers";
import { ENGINE_TYPE } from "./constants";

export type SpotToken = {
  id: number;
  symbol: string;
  name: string;
  type: ENGINE_TYPE;
  risk: any; // You might want to define this more precisely
  addressKey: string;
  decimals: number;
  initialSupply: ethers.BigNumber;
};

export type PerpToken = {
  id: number;
  symbol: string;
  name: string;
  type: ENGINE_TYPE;
  risk: any; // You might want to define this more precisely
  addressKey: string;
};

export type TokensType = {
  [key: string]: SpotToken | PerpToken;
};

export interface Balance {
  amount: ethers.BigNumber;
  lastCumulativeMultiplierX18: ethers.BigNumber;
}
