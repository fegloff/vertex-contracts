import * as dotenv from 'dotenv'

dotenv.config()

export const config = {
  mainnet: {
    privateKey: process.env.PRIVATE_KEY ?? '',
    networkUrl: 'https://api.harmony.one',
    chainId: 1666600000,
  },
  testnet: {
    privateKey: process.env.PRIVATE_KEY ?? '',
    networkUrl: 'https://api.s0.t.hmny.io',
    chainId: 1666700000,
  }
}
console.log(config)