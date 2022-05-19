import { PublicKey } from "@solana/web3.js";
import fullDeployConfigV2 from "./anchor/fullDeployConfigV2.json";

function getDeploymentConfig(deployment: string) {
  const deploymentConfig = fullDeployConfigV2[deployment];
  if (!deploymentConfig) {
    throw Error("Invalid deployment: " + deployment);
  }
  return deploymentConfig;
}

export function getProgramId(deployment: string) {
  const deploymentConfig = getDeploymentConfig(deployment);
  return new PublicKey(deploymentConfig.programId);
}

export function getMarketConfig(deployment: string) {
  const deploymentConfig = getDeploymentConfig(deployment);
  return new PublicKey(deploymentConfig.marketConfig);
}

export function parsePoolInfoFromMintPair(
  deployment: string,
  inputTokenMintAddress: string,
  outPutTokenMintAddress: string
) {
  const deploymentConfig = fullDeployConfigV2[deployment];
  if (!deploymentConfig) {
    throw Error("Invalid deployment: " + deployment);
  }

  const inputTokenSymbol: string = deploymentConfig.tokenInfoList.find(
    (tokenInfo) => {
      tokenInfo.mint === inputTokenMintAddress;
    }
  )?.symbol;

  const outputTokenSymbol: string = deploymentConfig.tokenInfoList.find(
    (tokenInfo) => {
      tokenInfo.mint === outPutTokenMintAddress;
    }
  )?.symbol;

  const poolAddress = deploymentConfig.poolInfoList.find((poolInfo) => {
    (poolInfo.base === inputTokenSymbol &&
      poolInfo.quote === outputTokenSymbol) ||
      (poolInfo.base === outputTokenSymbol &&
        poolInfo.quote === inputTokenSymbol);
  });

  if (!poolAddress) {
    throw Error(
      "Invalid token pair: " + inputTokenMintAddress + " " + outPutTokenMintAddress
    );
  }

  return new PublicKey(poolAddress);
}
