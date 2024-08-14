import { ethers } from "hardhat";
import { getContractsAddress, getSigner, getTokenName, SPOT_QUOTE_TOKEN_ID } from "./helpers/helper";

async function deposit() {
  try {
    const {
      endpoint: endpointAddress,
      spotEngine: spotEngineAddress, 
    } = await getContractsAddress()
    
    const signer = await getSigner()

    const endpoint = await ethers.getContractAt("Endpoint", endpointAddress, signer);
  
    const spotEngine = await ethers.getContractAt("SpotEngine", spotEngineAddress);
    
    const productId = SPOT_QUOTE_TOKEN_ID
    
    const tokenAddress = await spotEngine.getToken(productId)
    
    const tokenName = getTokenName(SPOT_QUOTE_TOKEN_ID)

    const token = await ethers.getContractAt('MockUsdcToken', tokenAddress);

    const userAddress = await signer.getAddress()
    let balance = await token.balanceOf(userAddress);

    console.log(`Initial TOKEN (${tokenName}) balance for address ${userAddress}`, ethers.utils.formatUnits(balance, 6))
    
    let endpointBalance = await token.balanceOf(endpointAddress);
    console.log('Initial ENDPOINT balance', ethers.utils.formatUnits(endpointBalance, 6))

    const amountBN = ethers.utils.parseEther("5");

    // Approve the Endpoint contract to spend the required amount of tokens
    await token.connect(signer).approve(endpointAddress, amountBN);

    const subaccountNameBytes12 = ethers.utils.hexZeroPad(
      ethers.utils.toUtf8Bytes("default"),
      12
    );
  // Call the depositCollateral function
    await endpoint.depositCollateral(
      subaccountNameBytes12,
      productId,
      amountBN
    );

    balance = await token.balanceOf(userAddress);

    console.log(`Final TOKEN balance for address ${userAddress}`, ethers.utils.formatUnits(balance, 6))

    endpointBalance = await token.balanceOf(endpointAddress);
    
    console.log('Final ENDPOINT balance', ethers.utils.formatUnits(endpointBalance, 6))


  } catch (error) {
    console.error("Deposit operation failed:", error);
    if (error.transaction) {
      console.error("Failed transaction:", error.transaction);
    }
  }

}

async function main() {
  await deposit()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });