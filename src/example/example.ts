import { clusterApiUrl, Connection, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { exit } from "process";
import {
  createSwapTransaction,
  getDeltafiUser,
  createWithdrawTransaction,
  createDepositTransaction,
} from "../anchor/transaction_utils";
import {
  exponentiate,
  getDeploymentConfig,
  getOrCreateAssociatedAccountInfo,
  getPoolConfig,
  getTokenConfig,
  readKeypair,
} from "./utils";
import { Command } from "commander";
import * as https from "https";
import { getSwapOutResult } from "../calculations/swapOutAmount";
import { getDeltafiDexV2, makeProvider } from "../anchor/anchor_utils";
import { BN } from "@project-serum/anchor";
import { getSymbolToPythPriceData } from "../anchor/pyth_utils";
import BigNumber from "bignumber.js";

// the example transaction logic
// this function established 2 transaction, first sell USDC for USDT and second sell USDT for USDC
// because we have to wallet keypair in code base, we just sign the transaction generated by the API
// directly with the wallet keypair
// in actually application, we should use wallet sdk for the signature
const doSwap = async (keypairFilePath: string, network: string) => {
  if (network !== "testnet" && network !== "mainnet-beta") {
    console.error("wrong network!");
    exit(1);
  }

  const deployConfig = getDeploymentConfig(network === "mainnet-beta" ? "mainnet-prod" : "testnet");
  const poolConfig = getPoolConfig(deployConfig, "USDC-USDT");
  console.info("pool config:", poolConfig);

  const connection = new Connection(clusterApiUrl(deployConfig.network), "confirmed");
  const program = getDeltafiDexV2(
    new PublicKey(deployConfig.programId),
    makeProvider(connection, {}),
  );

  const keyPair = readKeypair(keypairFilePath);
  const swapInfo = await program.account.swapInfo.fetch(new PublicKey(poolConfig.swapInfo));
  const deltafiUser = await getDeltafiUser(program, swapInfo.configKey, keyPair.publicKey);
  const symbolToPythPriceData = await getSymbolToPythPriceData(
    connection,
    deployConfig.tokenInfoList,
  );

  const usdcTokenConfig = getTokenConfig(deployConfig, "USDC");
  const usdtTokenConfig = getTokenConfig(deployConfig, "USDT");

  // get USDC/USDT token account from the wallet
  const usdcTokenAccount = (
    await getOrCreateAssociatedAccountInfo(
      connection,
      keyPair,
      new PublicKey(usdcTokenConfig.mint),
      keyPair.publicKey,
    )
  ).address;
  const usdtTokenAccount = (
    await getOrCreateAssociatedAccountInfo(
      connection,
      keyPair,
      new PublicKey(usdtTokenConfig.mint),
      keyPair.publicKey,
    )
  ).address;

  const swapoutResult = await getSwapOutResult(
    symbolToPythPriceData,
    swapInfo,
    usdcTokenConfig,
    usdtTokenConfig,
    "1",
    0.1,
  );
  console.info(swapoutResult);

  // example transaction 1: sell USDC for USDT
  console.info("transaction 1: sell 1 USDC for USDT");
  try {
    const { transaction, signers } = await createSwapTransaction(
      poolConfig,
      program,
      swapInfo,
      deltafiUser,
      keyPair.publicKey,
      usdcTokenAccount,
      usdtTokenAccount,
      new BN(exponentiate(new BigNumber("1"), usdcTokenConfig.decimals).toFixed(0)),
      new BN(
        exponentiate(
          new BigNumber(swapoutResult.amountOutWithSlippage),
          usdtTokenConfig.decimals,
        ).toFixed(0),
      ),
      { sellBase: {} },
    );

    transaction.recentBlockhash = (await connection.getLatestBlockhash("max")).blockhash;
    transaction.feePayer = keyPair.publicKey;

    // may use wallet sdk for signature in application
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      ...signers,
      keyPair,
    ]);
    console.info("transaction USDC -> USDT succeeded with signature: " + signature);
  } catch (e) {
    console.error("transaction USDC -> USDT failed with error: " + e);
    exit(1);
  }

  // example transaction 2: sell USDT for USDC
  console.info("transaction 2: sell 1 USDT for USDC");
  const swapoutResult2 = await getSwapOutResult(
    symbolToPythPriceData,
    swapInfo,
    usdtTokenConfig,
    usdcTokenConfig,
    "1",
    0.1,
  );
  console.info(swapoutResult2);

  try {
    const { transaction, signers } = await createSwapTransaction(
      poolConfig,
      program,
      swapInfo,
      deltafiUser,
      keyPair.publicKey,
      usdtTokenAccount,
      usdcTokenAccount,
      new BN(exponentiate(new BigNumber("1"), usdtTokenConfig.decimals).toFixed(0)),
      new BN(
        exponentiate(
          new BigNumber(swapoutResult.amountOutWithSlippage),
          usdcTokenConfig.decimals,
        ).toFixed(0),
      ),
      { sellQuote: {} },
    );

    transaction.recentBlockhash = (await connection.getLatestBlockhash("max")).blockhash;
    transaction.feePayer = keyPair.publicKey;

    // may use wallet sdk for signature in application
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      ...signers,
      keyPair,
    ]);
    console.info("transaction USDT -> USDC succeeded with signature: " + signature);
  } catch (e) {
    console.error("transaction USDT -> USDC failed with error: " + e);
    exit(1);
  }
};

const doDeposit = async (keypairFilePath: string, network: string) => {
  if (network !== "testnet" && network !== "mainnet-beta") {
    console.error("wrong network!");
    exit(1);
  }

  const deployConfig = getDeploymentConfig(network === "mainnet-beta" ? "mainnet-prod" : "testnet");
  const poolConfig = getPoolConfig(deployConfig, "USDC-USDT");
  console.info("pool config:", poolConfig);

  const usdcTokenConfig = getTokenConfig(deployConfig, "USDC");
  const usdtTokenConfig = getTokenConfig(deployConfig, "USDT");

  const keyPair = readKeypair(keypairFilePath);
  const connection = new Connection(clusterApiUrl(deployConfig.network), "confirmed");

  const program = getDeltafiDexV2(
    new PublicKey(deployConfig.programId),
    makeProvider(connection, {}),
  );

  // get USDC/USDT token account from the wallet
  const usdcTokenAccount = (
    await getOrCreateAssociatedAccountInfo(
      connection,
      keyPair,
      new PublicKey(usdcTokenConfig.mint),
      keyPair.publicKey,
    )
  ).address;
  const usdtTokenAccount = (
    await getOrCreateAssociatedAccountInfo(
      connection,
      keyPair,
      new PublicKey(usdtTokenConfig.mint),
      keyPair.publicKey,
    )
  ).address;

  const poolPubkey = new PublicKey(poolConfig.swapInfo);
  const swapInfo = await program.account.swapInfo.fetch(poolPubkey);

  const [lpPublicKey] = await PublicKey.findProgramAddress(
    [
      Buffer.from("LiquidityProvider"),
      new PublicKey(poolConfig.swapInfo).toBuffer(),
      keyPair.publicKey.toBuffer(),
    ],
    program.programId,
  );
  const lpUser = await program.account.liquidityProvider.fetchNullable(lpPublicKey);

  try {
    const { transaction, signers } = await createDepositTransaction(
      poolConfig,
      program,
      swapInfo,
      usdcTokenAccount,
      usdtTokenAccount,
      keyPair.publicKey,
      lpUser,
      new BN(1000000),
      new BN(1000000),
      new BN(0),
      new BN(0),
    );

    transaction.recentBlockhash = (await connection.getLatestBlockhash("max")).blockhash;
    transaction.feePayer = keyPair.publicKey;

    const signature = await sendAndConfirmTransaction(connection, transaction, [
      ...signers,
      keyPair,
    ]);
    console.info("deposit succeeded with signature: " + signature);
  } catch (e) {
    console.error("deposit failed with error: " + e);
    exit(1);
  }
};

const doWithdraw = async (keypairFilePath: string, network: string) => {
  if (network !== "testnet" && network !== "mainnet-beta") {
    console.error("wrong network!");
    exit(1);
  }

  const deployConfig = getDeploymentConfig(network === "mainnet-beta" ? "mainnet-prod" : "testnet");
  const poolConfig = getPoolConfig(deployConfig, "USDC-USDT");
  console.info("pool config:", poolConfig);

  const usdcTokenConfig = getTokenConfig(deployConfig, "USDC");
  const usdtTokenConfig = getTokenConfig(deployConfig, "USDT");

  const keyPair = readKeypair(keypairFilePath);
  const connection = new Connection(clusterApiUrl(deployConfig.network), "confirmed");

  const program = getDeltafiDexV2(
    new PublicKey(deployConfig.programId),
    makeProvider(connection, {}),
  );

  // get USDC/USDT token account from the wallet
  const usdcTokenAccount = (
    await getOrCreateAssociatedAccountInfo(
      connection,
      keyPair,
      new PublicKey(usdcTokenConfig.mint),
      keyPair.publicKey,
    )
  ).address;
  const usdtTokenAccount = (
    await getOrCreateAssociatedAccountInfo(
      connection,
      keyPair,
      new PublicKey(usdtTokenConfig.mint),
      keyPair.publicKey,
    )
  ).address;

  const poolPubkey = new PublicKey(poolConfig.swapInfo);
  const swapInfo = await program.account.swapInfo.fetch(poolPubkey);

  try {
    const { transaction } = await createWithdrawTransaction(
      poolConfig,
      program,
      swapInfo,
      usdcTokenAccount,
      usdtTokenAccount,
      keyPair.publicKey,
      new BN(1000000),
      new BN(1000000),
      new BN(0),
      new BN(0),
    );

    transaction.recentBlockhash = (await connection.getLatestBlockhash("max")).blockhash;
    transaction.feePayer = keyPair.publicKey;

    const signature = await sendAndConfirmTransaction(connection, transaction, [keyPair]);
    console.info("withdraw succeeded with signature: " + signature);
  } catch (e) {
    console.error("withdraw failed with error: " + e);
    exit(1);
  }
};

const getConfig = async () => {
  const options = {
    hostname: "app.deltafi.trade",
    port: 443,
    path: "/api/config",
    method: "GET",
  };

  const req = https.request(options, (res) => {
    res.on("data", (data) => {
      // pretty print the config json
      console.log(JSON.stringify(JSON.parse(Buffer.from(data).toString()), null, 2));
    });
  });

  req.on("error", (error) => {
    console.error(error);
  });

  req.end();
};

const main = () => {
  const program = new Command();
  program
    .command("swap")
    .option("-k --keypair <wallet keypair for example transactions>")
    .option("-n --network <mainnet-beta or testnet>")
    .action(async (option) => {
      doSwap(option.keypair, option.network);
    });

  program
    .command("deposit")
    .option("-k --keypair <wallet keypair for example transactions>")
    .option("-n --network <mainnet-beta or testnet>")
    .action(async (option) => {
      doDeposit(option.keypair, option.network);
    });

  program
    .command("withdraw")
    .option("-k --keypair <wallet keypair for example transactions>")
    .option("-n --network <mainnet-beta or testnet>")
    .action(async (option) => {
      doWithdraw(option.keypair, option.network);
    });

  program.command("get-config").action(getConfig);

  program.parse(process.argv);
};

main();
