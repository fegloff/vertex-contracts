import { ethers } from "hardhat";
import { getContractsAddress, getSigner, logSlowModeInfo, setupEventListeners } from "./helpers/helper";
import { SECONDS_PER_DAY, TransactionType } from "./helpers/constants";
import { Contract, Signer } from "ethers";
import { Balance } from "./helpers/types";

async function test() {
  let cleanup: (() => void) | undefined;

  try {
    const { 
      endpoint: endpointAddress, 
      spotEngine: spotEngineAddress, 
      clearinghouse: clearinghouseAddress, 
      sequencer: sequencerAddress, 
      offchainExchange: offchainExchangeAddress
    } = await getContractsAddress();
    
    const signer = await getSigner();

    const [endpoint, spotEngine, sequencer, clearinghouse, offchainExchange] = await Promise.all([
      ethers.getContractAt("Endpoint", endpointAddress, signer),
      ethers.getContractAt("SpotEngine", spotEngineAddress, signer),
      ethers.getContractAt("MockSequencer", sequencerAddress, signer),
      ethers.getContractAt("Clearinghouse", clearinghouseAddress, signer),
      ethers.getContractAt("OffchainExchange", offchainExchangeAddress, signer)
    ]);

    cleanup = setupEventListeners([
      { name: 'endpoint', contract: endpoint },
      { name: 'sequencer', contract: sequencer },
      { name: 'offchainExchange', contract: offchainExchange },
      { name: 'clearinghouse', contract: clearinghouse },
      { name: 'spotEngine', contract: spotEngine }
    ]);
    
    let lastUpdateTime;
    try {
      lastUpdateTime = await endpoint.getTime();
    } catch (error) {
      console.log("Time not initialized. Attempting to initialize...");
      try {
        await initializeTime(sequencer, endpoint, clearinghouse, spotEngine);
        lastUpdateTime = await endpoint.getTime();
      } catch (initError) {
        console.error("Failed to initialize time:", initError);
        return; // Exit the function if time initialization fails
      }
    }

    console.log('Time updated:', lastUpdateTime.toString());

    console.log("nSubmissions before:", await endpoint.nSubmissions());

    const subaccountBytes32 = ethers.utils.hexZeroPad(await signer.getAddress(), 32);
    const productId = 9;
    const depositAmount = ethers.utils.parseUnits("10", 18);
    const amountUint128 = ethers.utils.hexZeroPad(depositAmount.toHexString(), 16);
    const referralCode = "-1";

    console.log("Subaccount bytes32:", subaccountBytes32);

    const tokenAddress = await spotEngine.getToken(productId);
    const token = await ethers.getContractAt("IERC20", tokenAddress, signer);

    await logBalances(token, signer, endpointAddress, clearinghouseAddress, spotEngine, endpoint, subaccountBytes32, productId);
    await logSlowModeInfo(endpoint);

    await approveAndDeposit(token, endpoint, endpointAddress, depositAmount, subaccountBytes32, productId, amountUint128, referralCode);
    console.log("After deposit - Subaccount balance:", (await spotEngine.getBalance(productId, subaccountBytes32)).toString());
    console.log("After deposit - Subaccount ID:", (await endpoint.getSubaccountId(subaccountBytes32)).toString());
    
    await logSlowModeInfo(endpoint);

    sequencer.on("DetailedError", (functionName, errorData) => {
      console.log(`Detailed error in ${functionName}:`, errorData);
    });
  
    sequencer.on("ErrorOccurred", (functionName, errorMessage) => {
        console.log(`Error in ${functionName}:`, errorMessage);
    });

    await executeTransaction(sequencer, endpoint, clearinghouse, spotEngine, TransactionType.ExecuteSlowMode, { subaccountBytes32, productId });
    // Check subaccount registration and balance after deposit
    const subaccountId = await endpoint.getSubaccountId(subaccountBytes32);
    console.log("Subaccount ID after executeTransaction:", subaccountId.toString());

    const balance = await spotEngine.getBalance(productId, subaccountBytes32);
    console.log("Balance after executeTransaction:", balance.toString());

    await logSlowModeInfo(endpoint);

    const balanceAfterDeposit = await spotEngine.getBalance(productId, subaccountBytes32);
    console.log("Balance after deposit:", balanceAfterDeposit.toString());

    await submitMatchOrderAMMTransaction(endpoint, sequencer, spotEngine, subaccountBytes32, productId, signer);

    console.log('After calling submitMatchOrderAMMTransaction');
    
    // Log final balances and info
    await logBalances(token, signer, endpointAddress, clearinghouseAddress, spotEngine, endpoint, subaccountBytes32, productId);
    
    await logSlowModeInfo(endpoint);

  } catch (error) {
    console.error("Error in test function:", error);
  } finally {
    console.log("Waiting for events...");
    await new Promise(resolve => setTimeout(resolve, 20000));  
    if (cleanup) {
      cleanup();
    }
    console.log("Script complete.");
  }
}

async function createSwapAMMTransaction(subaccountBytes32, productId, amount) {
  const swapAMMTransaction = ethers.utils.solidityPack(
    ["uint8", "bytes"],
    [
      TransactionType.SwapAMM,
      ethers.utils.defaultAbiCoder.encode(
        ["tuple(bytes32,uint32,int128,int128,int128,bytes)"],
        [[
          subaccountBytes32,
          productId,
          amount,
          0, // baseDelta (can be 0 for now)
          0, // quoteDelta (can be 0 for now)
          "0x" // referralCode (empty for now)
        ]]
      )
    ]
  );

  return swapAMMTransaction;
}

async function createMatchOrderAMMTransaction(endpoint: Contract, signer: Signer, subaccountBytes32, productId, amount, currentTimestamp) {
  // Set expiration to 1 hour from now
  const expirationTime = currentTimestamp + 3600;
  console.log("Expiration time:", expirationTime);

  // Create SpotTick transaction
  const lastUpdateTime = await endpoint.getTime();
  const dt = Math.min(currentTimestamp - lastUpdateTime, 6 * SECONDS_PER_DAY); // Cap at 6 days to be safe
  console.log("Time delta (dt):", dt);

  const currentPrice = await endpoint.getPriceX18(productId);
  console.log("Current price:", currentPrice.toString(), await signer.getAddress());

  const nonce = await endpoint.getNonce(await signer.getAddress());
  console.log("Current nonce:", nonce.toString());

  const matchOrderAMMTransaction = ethers.utils.solidityPack(
    ["uint8", "bytes"],
    [
      TransactionType.MatchOrderAMM,
      ethers.utils.defaultAbiCoder.encode(
        ["tuple(uint32,int128,int128,tuple(tuple(bytes32,int128,int128,uint64,uint64),bytes))"],
        [[
          productId,
          amount,
          0, // quoteDelta
          [
            [
              subaccountBytes32,
              currentPrice,
              amount,
              expirationTime, 
              nonce
            ],
            await signer.getAddress()
          ]
        ]]
      )
    ]
  );

  return matchOrderAMMTransaction;
}


async function submitMatchOrderAMMTransaction(endpoint, sequencer, spotEngine, subaccountBytes32, productId, signer) {
  try {
    const latestBlock = await ethers.provider.getBlock('latest');
    const currentTimestamp = latestBlock.timestamp;
    console.log("Current timestamp:", currentTimestamp);

    const spotTickTransaction = ethers.utils.solidityPack(
      ["uint8", "bytes"],
      [
        TransactionType.SpotTick,
        ethers.utils.defaultAbiCoder.encode(
          ["tuple(uint128,int128[])"],
          [[
            currentTimestamp,
            [ethers.utils.parseUnits("0.5", 18)]
          ]]
        )
      ]
    );

    const balance: Balance = await spotEngine.getBalance(productId, subaccountBytes32);
    console.log("Balance before transaction:", balance);

    const amount = balance.amount.div(10);
    console.log("Order amount:", amount.toString());
  

    console.log('Creating SwapAMM transaction');
    const swapAMMTransaction = await createSwapAMMTransaction(subaccountBytes32, productId, amount);


    console.log("MatchOrderAMM Transaction Details:");
    console.log("Product ID:", productId);
    console.log("Amount:", amount.toString());
    console.log("Subaccount:", subaccountBytes32);

    const transactions = [swapAMMTransaction]; // spotTickTransaction, 
    const idx = await endpoint.nSubmissions();
    const gasLimit = 10000000;

    // Check if the subaccount is registered
    const subaccountId = await endpoint.getSubaccountId(subaccountBytes32);
    console.log("Subaccount ID before transaction:", subaccountId.toString());

    const balanceBeforeTx = await spotEngine.getBalance(productId, subaccountBytes32);
    console.log("Balance before transaction:", balanceBeforeTx.toString());

    const tx = await endpoint.submitTransactionsCheckedWithGasLimit( 
      idx,
      transactions,
      gasLimit,
      { gasLimit: gasLimit }
    );
    const receipt = await tx.wait();
    console.log("Transaction submitted successfully");
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check the balance after the transaction
    const balanceAfterTx = await spotEngine.getBalance(productId, subaccountBytes32);
    console.log("Balance after transaction:", balanceAfterTx.toString());

  } catch (error) {
    if (error.body) {
      console.error("Error submitting MatchOrderAMM transaction:", error.body);
    } else {
      console.error("Error submitting MatchOrderAMM transaction:", error);
    }
  }
}

async function logBalances(
  token: Contract, 
  signer: Signer, 
  endpointAddress: string, 
  clearinghouseAddress: string, 
  spotEngine: Contract, 
  endpoint: Contract, 
  subaccountBytes32: string, 
  productId: number) {
  const [signerBalance, endpointBalance, clearinghouseBalance, subaccountBalance, subaccountId] = await Promise.all([
    token.balanceOf(signer.getAddress()),
    token.balanceOf(endpointAddress),
    token.balanceOf(clearinghouseAddress),
    spotEngine.getBalance(productId, subaccountBytes32),
    endpoint.getSubaccountId(subaccountBytes32)
  ]);

  console.log("Initial balances:");
  console.log("Token balance of signer:", signerBalance.toString());
  console.log("Token balance of endpoint:", endpointBalance.toString());
  console.log("Token balance of clearinghouse:", clearinghouseBalance.toString());
  console.log("Subaccount balance:", subaccountBalance.toString());
  console.log("Subaccount ID:", subaccountId.toString());
}

async function approveAndDeposit(
  token: Contract, 
  endpoint: Contract, 
  endpointAddress: string, 
  depositAmount: any, 
  subaccountBytes32: string, 
  productId: number, 
  amountUint128: string, 
  referralCode: string) {
  await (await token.approve(endpointAddress, depositAmount)).wait();
  console.log("Approval transaction confirmed");

  const txDeposit = await endpoint['depositCollateralWithReferral(bytes32,uint32,uint128,string)'](
    subaccountBytes32,
    productId,
    amountUint128,
    referralCode
  );

  const receipt = await txDeposit.wait();
  console.log("Deposit transaction confirmed in block:", receipt.blockNumber);
  console.log("Deposit transaction status:", receipt.status);
}

async function executeTransaction(
  sequencer: Contract, 
  endpoint: Contract, 
  clearinghouse: Contract, 
  spotEngine: Contract, 
  txType: number, 
  txData: any = {}) {  
  
  console.log(`Executing transaction type ${txType}`);
  let tx, receipt;
  
  if (txType === TransactionType.ExecuteSlowMode) {
    const tx = await endpoint.executeSlowModeTransactionImmediately();
    const receipt = await tx.wait();
    console.log(`Slow mode transaction executed:`, receipt.transactionHash);
  } else {
    let encodedTx: string;

    if (txType === TransactionType.SpotTick) {
      console.log('Enconded for SpotTick')
      encodedTx = ethers.utils.defaultAbiCoder.encode(
        ['uint8', 'tuple(uint128,int128[])'],
        [txType, [txData.time, txData.utilizationRatiosX18]]
      );
    } else if (txType === TransactionType.PerpTick) {
      console.log('Enconded for PerpTick')
      encodedTx = ethers.utils.defaultAbiCoder.encode(
        ['uint8', 'tuple(uint128,int128[])'],
        [txType, [txData.time, txData.avgPriceDiffs]]
      );
    } else if (txData.type) {
      console.log('Enconded for everything else')
      encodedTx = ethers.utils.defaultAbiCoder.encode(
          ['uint8', txData.type],
          [txType, txData]
      );
    } else {
        // If txData.type is not provided, just encode the txType
        encodedTx = ethers.utils.defaultAbiCoder.encode(['uint8'], [txType]);
    }

    tx = await sequencer.submitTransactionsCheckedWithGasLimit(
        await sequencer.nSubmissions(),
        [encodedTx],
        1000000 // Gas limit
    );
  
    receipt = await tx.wait();
    console.log(`Transaction type ${txType} processed:`, receipt.transactionHash);
  }
  
  if ([TransactionType.DepositCollateral, 
      TransactionType.MatchOrderAMM,
      TransactionType.WithdrawCollateral,
      TransactionType.ExecuteSlowMode].includes(txType)) {
    if (txData.subaccountBytes32) {
        const subaccountId = await endpoint.getSubaccountId(txData.subaccountBytes32);
        console.log("Subaccount ID after transaction:", subaccountId.toString());

        if (txData.productId !== undefined) {
            const balance = await spotEngine.getBalance(txData.productId, txData.subaccountBytes32);
            console.log("Balance after transaction:", balance.toString());
        }
    } else {
        console.log("No subaccount data provided for this transaction type");
    }
  }
  return receipt;
}

async function initializeTime(sequencer, endpoint, clearinghouse, spotEngine) {
  try {
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTimestamp = currentBlock.timestamp;

    // Execute SpotTick
    await executeTransaction(sequencer, endpoint, clearinghouse, spotEngine, TransactionType.SpotTick, {
      time: currentTimestamp,
      utilizationRatiosX18: [ethers.utils.parseUnits("0.5", 18)] // Example utilization ratio
    });

    // Execute PerpTick
    await executeTransaction(sequencer, endpoint, clearinghouse, spotEngine, TransactionType.PerpTick, {
      time: currentTimestamp,
      avgPriceDiffs: [ethers.utils.parseUnits("0", 18)] // Example avg price diff
    });

    // Verify time initialization
    const initializedTime = await endpoint.getTime();
    console.log("Initialized time:", initializedTime.toString());

    if (initializedTime.eq(0)) {
      throw new Error("Time not initialized properly");
    }

    console.log("Time initialized successfully");

  } catch (error) {
    if (error.reason) console.error("Error reason:", error.reason);
    if (error.code) console.error("Error code:", error.code);
    if (error.data) console.error("Error data:", error.data);
  }
}

async function main() {
  await test()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

  // async function generateSignature(idx: any, transactions: string[]): Promise<{ e: string, s: string, v: number }> {
  //   const digest = ethers.utils.keccak256(
  //     ethers.utils.defaultAbiCoder.encode(
  //       ['uint64', 'bytes[]'],
  //       [idx, transactions]
  //     )
  //   );
    
  //   const wallet = new ethers.Wallet(config.localhost.privateKey);
  //   const signature = await wallet.signMessage(ethers.utils.arrayify(digest));
    
  //   const sig = ethers.utils.splitSignature(signature);
    
  //   return {
  //     e: sig.r,
  //     s: sig.s,
  //     v: sig.v
  //   };
  // }
  
  // function setupEventListeners(contracts: { name: string; contract: Contract }[]) {
//   const cleanupFunctions: (() => void)[] = [];

//   contracts.forEach(({ name, contract }) => {
//     // const events = contract.interface.events;
//     console.log(`Setting up listeners for ${name}...`);
//     contract.on('*', (event) => {
//       console.log(`:::::::::::${name}.${event.event} emitted:`, ...event.args.slice(0, -1));
//     });

//     cleanupFunctions.push(() => contract.removeAllListeners());
  
//   });

//   console.log("Event listeners setup complete.");

//   return () => {
//     console.log("Cleaning up event listeners...");
//     cleanupFunctions.forEach(cleanup => cleanup());
//   };
// }