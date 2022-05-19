import { AnchorProvider } from "@project-serum/anchor";
import { token } from "@project-serum/anchor/dist/cjs/utils";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { getDeltafiDexV2, makeProvider } from "./anchor/anchor_utils";
import { DeltafiUser, SwapInfo } from "./anchor/type_definitions";
import { getMarketConfig, getProgramId, parsePoolInfoFromMintPair } from "./utils";

/**
 * API that creates a deltafi swap transaction
 * @param walletPubkey
 * @param connection
 * @param inputTokenSymbol
 * @param outputTokenSymbol
 * @param inputTokenAmount
 */
export async function createSwapTransaction(
  wallet: WalletContextState,
  connection: Connection,
  inputTokenMintPubkey: PublicKey,
  outputTokenMintPubkey: PublicKey,
  inputTokenAccountPubkey: PublicKey,
  outputTokenAccountPubkey: PublicKey,
  inputTokenAmount: string,
  deployment: string = "mainnet-prod"
): Transaction {
  const { publicKey: walletPubkey } = wallet;
  const inputTokenAmountBn: BigNumber = new BigNumber(inputTokenAmount);
  const poolPubkey: PublicKey = parsePoolInfoFromMintPair(deployment, inputTokenMintPubkey.toBase58(), outputTokenMintPubkey.toBase58());
  const program = getDeltafiDexV2(getProgramId(deployment), makeProvider(connection, wallet));
  const swapInfo: SwapInfo = await program.account.swapInfo.fetch(poolPubkey);
  const marketConfig = getMarketConfig(deployment);

  const [deltafiUserPubkey, deltafiUserBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from("User"),
      marketConfig.toBuffer(),
      walletPubkey.toBuffer(),
    ],
    program.programId,
  );
  
  const deltafiUser: DeltafiUser = await program.account.deltafiUser.fetchNullable(deltafiUserPubkey);
  const transactionCreateDeltafiUser: Transaction | undefined = (() => {
    if (!deltafiUser) {
      return program.transaction.createDeltafiUser(deltafiUserBump, {
        accounts: {
          marketConfig,
          owner: walletPubkey,
          deltafiUser: deltafiUserPubkey,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        },
      });
    }
  })();

  const swapAccounts = {
    marketConfig: marketConfig,
    swapInfo: poolPubkey,
    userSourceToken: inputTokenAccountPubkey,
    userDestinationToken: outputTokenAccountPubkey,
    swapSourceToken,
    swapDestinationToken,
    deltafiUser: deltafiUserPubkey,
    adminDestinationToken,
    pythPriceBase: swapInfo.pythPriceBase,
    pythPriceQuote: swapInfo.pythPriceQuote,
    userAuthority: userTransferAuthority.publicKey,
    tokenProgram: token.TOKEN_PROGRAM_ID,
  }

  const transactionSwap: Transaction = (() => {
    if (swapInfo.swapType.normalSwap) {
      return program.transaction.normalSwap()
    }
  })
}
