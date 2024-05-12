import * as dotenv from 'dotenv'

dotenv.config()

export const config = {
  privateKey: process.env.PRIVATE_KEY ?? '',
  networkUrl: 'https://api.s0.t.hmny.io',
  chainId: 1666700000,
}