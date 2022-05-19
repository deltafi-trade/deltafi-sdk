import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createSwapTransaction } from "./client";
import { getConnection, sendSignedTransaction } from "./utils";

const exampleDeployment = "testnet";

const exampleKeyPair = Keypair.fromSecretKey(
  Uint8Array.from([
    213, 125, 55, 246, 235, 165, 230, 97, 173, 235, 79, 26, 171, 231, 156, 144, 82, 29, 86, 100, 41,
    137, 100, 52, 12, 207, 55, 183, 70, 150, 163, 145, 119, 185, 161, 160, 111, 85, 138, 184, 202,
    112, 148, 93, 161, 250, 124, 70, 132, 205, 255, 150, 83, 16, 90, 16, 51, 25, 180, 6, 255, 193,
    199, 66,
  ]),
);

const exampleUSDCMint = new PublicKey("3itb8x9GX7bxQ6eFfQT3E7CstkjaESizBpHNWB5wxjYY");
const exampleUSDTMint = new PublicKey("Hi4jco598zF6g4VM3uYfDaTvZFoMtX6TaTZZ9QdiVLUq");

const exampleUSDCTokenAccount = new PublicKey("J9ZWtE2vrSvEqLYsW3yEzAGSMvw2tFiVBNteQ6e565zy");
const exampleUSDTTokenAccount = new PublicKey("G5JJmV4qAtEE2dDJABn4iZ2W4RhdNM3xCDHw5SP1pafK");

const exampleTransactions = async () => {
  const exampleConnection = getConnection(exampleDeployment);
  const transactionUSDCforUSDT = await createSwapTransaction(
    exampleKeyPair.publicKey,
    exampleConnection,
    exampleUSDCMint,
    exampleUSDTMint,
    exampleUSDCTokenAccount,
    exampleUSDTTokenAccount,
    "12.3",
    "10",
    exampleDeployment,
  );

  transactionUSDCforUSDT.sign(exampleKeyPair);

  try {
    const signature = await sendSignedTransaction({
      signedTransaction: transactionUSDCforUSDT,
      connection: exampleConnection,
    });

    console.log("transaction succeeded with signature: " + signature);
  } catch(e) {
    console.info("transaction failed with error: " + e);
  }
  
};

exampleTransactions();

console.log("jello");
