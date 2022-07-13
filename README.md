# SarosSwap

A DeFi Super-Network Built on Solana

# Installation

Use your environment's package manager to install saros-sdk into your project.

```bash
yarn add @saros-finance/sdk

```

```bash
npm install @saros-finance/sdk

```

# Usage

```javascript
import sarosSdk, {
  getSwapAmountSaros,
  swapSaros,
  createPool,
  getPoolInfo,
  depositAllTokenTypes,
  withdrawAllTokenTypes,
  convertBalanceToWei,
  getTokenMintInfo,
  getTokenAccountInfo,
  getInfoTokenByMint,
  genConnectionSolana,
} from '@saros-finance/sdk';
import { GraphQLClient, gql } from 'graphql-request';

import BN from 'bn.js';
import { PublicKey } from '@solana/web3.js';

const { SarosFarmService, SarosStakeServices } = sarosSdk;

const TOKEN_PROGRAM_ID = new PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);
const SAROS_SWAP_PROGRAM_ADDRESS_V1 = new PublicKey(
  'SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr'
);
const SAROS_FARM_ADDRESS = new PublicKey(
  'SFarmWM5wLFNEw1q5ofqL7CrwBMwdcqQgK6oQuoBGZJ'
);

const FEE_OWNER = 'FDbLZ5DRo61queVRH9LL1mQnsiAoubQEnoCRuPEmH9M8';

const mintAddressUsdt = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const mintAddressUsdc = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SLIPPAGE = 0.5;

const connection = genConnectionSolana();

const accountSol = '5UrM9csUEDBeBqMZTuuZyHRNhbRW4vQ1MgKJDrKU1U2v'; // owner address

const payerAccount = { publicKey: new PublicKey(accountSol) };

// Pool example on saros C98 to USDC

const USDC_TOKEN = {
  id: 'usd-coin',
  mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: 'usdc',
  name: 'USD Coin',
  icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  decimals: '6',
  addressSPL: 'FXRiEosEvHnpc3XZY1NS7an2PB1SunnYW1f5zppYhXb3',
};

const C98_TOKEN = {
  id: 'coin98',
  mintAddress: 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9',
  symbol: 'C98',
  name: 'Coin98',
  icon: 'https://coin98.s3.ap-southeast-1.amazonaws.com/Coin/c98-512.svg',
  decimals: '6',
  addressSPL: 'EKCdCBjfQ6t5FBfDC2zvmr27PgfVVZU37C8LUE4UenKb',
};

const poolParams = {
  address: '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty',
  tokens: {
    C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9: {
      ...C98_TOKEN,
    },
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
      ...USDC_TOKEN,
    },
  },
  tokenIds: [
    'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  ],
};

const farmParam = {
  lpAddress: 'HVUeNVH93PAFwJ67ENJwPWFU9cWcM57HEAmkFLFTcZkj',
  poolAddress: 'FW9hgAiUsFYpqjHaGCGw4nAvejz4tAp9qU7kFpYr1fQZ',
  poolLpAddress: '2wUvdZA8ZsY714Y5wUL9fkFmupJGGwzui2N74zqJWgty',
  rewards: [
    {
      address: 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9',
      poolRewardAddress: 'AC3FyChJwuU7EY9h4BqzjcN8CtGD7YRrAbeRdjcqe1AW',
      rewardPerBlock: 6600000,
      rewardTokenAccount: 'F6aHSR3ChwCXD67wrX2ZBHMkmmU9Gfm9QQmiTBrKvsmJ',
      id: 'coin98'
    },
  ],
  token0: 'C98A4nkJXhpVZNAZdHUA95RpTF3T4whtQubL3YobiUX9',
  token1: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  token0Id: 'coin98',
  token1Id: 'usd-coin'
};

const onSwap = async () => {
  const fromTokenAccount = C98_TOKEN.addressSPL;
  const toTokenAccount = USDC_TOKEN.addressSPL;
  const fromMint = C98_TOKEN.mintAddress;
  const toMint = USDC_TOKEN.mintAddress;
  const fromAmount = 1;
  // getSwapAmountSaros to calculate output pool saros
  const estSwap = await getSwapAmountSaros(
    connection,
    fromMint,
    toMint,
    fromAmount,
    SLIPPAGE,
    poolParams
  );

  const { amountOutWithSlippage } = estSwap;
  const result = await swapSaros(
    connection,
    fromTokenAccount.toString(),
    toTokenAccount.toString(),
    parseFloat(fromAmount),
    parseFloat(amountOutWithSlippage),
    null,
    new PublicKey(poolParams.address),
    SAROS_SWAP_PROGRAM_ADDRESS_V1,
    accountSol,
    fromMint,
    toMint
  );

  const { isError } = result;
  if (isError) {
    return console.log(`${result.mess}`);
  }
  return `Your transaction hash ${result.hash}`;
};

const onCreatePool = async () => {
  const token0Mint = USDC_TOKEN.mintAddress;
  const token1Mint = C98_TOKEN.mintAddress;
  const token0Account = USDC_TOKEN.addressSPL;
  const token1Account = C98_TOKEN.addressSPL;

  const isStableCoin =
    (token0Mint === mintAddressUsdt && token1Mint === mintAddressUsdc) ||
    (token0Mint === mintAddressUsdc && token1Mint === mintAddressUsdt);

  const curveType = isStableCoin ? 1 : 0;
  const curveParameter = isStableCoin ? 1 : 0;
  const convertFromAmount = convertBalanceToWei(1, USDC_TOKEN.decimals);
  const convertToAmount = convertBalanceToWei(1, C98_TOKEN.decimals);

  const response = await createPool(
    connection,
    accountSol,
    new PublicKey(FEE_OWNER),
    new PublicKey(token0Mint),
    new PublicKey(token1Mint),
    new PublicKey(token0Account),
    new PublicKey(token1Account),
    convertFromAmount,
    convertToAmount,
    curveType,
    new BN(curveParameter),
    TOKEN_PROGRAM_ID,
    SAROS_SWAP_PROGRAM_ADDRESS_V1
  );

  const { isError } = response;

  if (isError) {
    return console.log(`${response.mess}`);
  }

  return `Your transaction hash ${response.hash}`;
};

const onAddLiqPool = async () => {
  const poolAccountInfo = await getPoolInfo(
    connection,
    new PublicKey(poolParams.address)
  );

  const token0Mint = C98_TOKEN.mintAddress;
  const token1Mint = USDC_TOKEN.mintAddress;
  const token0Account = C98_TOKEN.addressSPL;
  const token1Account = USDC_TOKEN.addressSPL;
  const newPoolLpMintInfo = await getTokenMintInfo(
    connection,
    poolAccountInfo.lpTokenMint
  );

  const lpTokenSupply = newPoolLpMintInfo.supply
    ? newPoolLpMintInfo.supply.toNumber()
    : 0;

  const convertFromAmount = convertBalanceToWei(1, USDC_TOKEN.decimals);
  const newPoolToken0AccountInfo = await getTokenAccountInfo(
    connection,
    poolAccountInfo.token0Account
  );

  const lpTokenAmount =
    (parseFloat(convertFromAmount) * lpTokenSupply) /
    newPoolToken0AccountInfo.amount.toNumber();

  const result = await depositAllTokenTypes(
    connection,
    accountSol,
    new PublicKey(accountSol),
    new PublicKey(token0Account),
    new PublicKey(token1Account),
    lpTokenAmount,
    new PublicKey(poolParams.address),
    SAROS_SWAP_PROGRAM_ADDRESS_V1,
    token0Mint,
    token1Mint,
    SLIPPAGE
  );

  const { isError } = result;

  if (isError) {
    return console.log(`${result.mess}`);
  }

  return `Your transaction hash ${result.hash}`;
};

const onRemoveLiqPool = async () => {
  const poolAccountInfo = await getPoolInfo(
    connection,
    new PublicKey(poolParams.address)
  );

  const lpTokenSupply = poolAccountInfo.supply
    ? poolAccountInfo.supply.toNumber()
    : 0;

  const lpTokenMint = poolAccountInfo.lpTokenMint.toString();
  const newPoolToken0AccountInfo = await getTokenAccountInfo(
    connection,
    poolAccountInfo.token0Account
  );

  const lpTokenAmount =
    (parseFloat(1) * lpTokenSupply) /
    newPoolToken0AccountInfo.amount.toNumber();

  const infoLpUser = await getInfoTokenByMint(lpTokenMint, accountSol);
  const token0Mint = C98_TOKEN.mintAddress;
  const token1Mint = USDC_TOKEN.mintAddress;
  const token0Account = C98_TOKEN.addressSPL;
  const token1Account = USDC_TOKEN.addressSPL;
  const result = await withdrawAllTokenTypes(
    connection,
    accountSol,
    infoLpUser.pubkey,
    token0Account,
    token1Account,
    lpTokenAmount,
    new PublicKey(poolParams.address),
    SAROS_SWAP_PROGRAM_ADDRESS_V1,
    token0Mint,
    token1Mint,
    SLIPPAGE
  );

  const { isError } = result;

  if (isError) {
    return console.log(`${result.mess}`);
  }

  return `Your transaction hash ${result.hash}`;
};

// Query all Farm on Saros
const getListFarmSaros = async () => {
  try {
    const response = await SarosFarmService.getListPool({page: 1, size: 2})
    return response
  } catch(err) {
    return []
  }
}

// Query all Staking on Saros
const getListStakeSaros = async () => {
  try {
    const response = await SarosStakeServices.getListPool({page: 1, size: 2})
    return response
  } catch(err) {
    return []
  }
}

// Stake balance into pool on Saros
const onStakePool = async () => {
  const hash = await SarosFarmService.stakePool(
    connection,
    payerAccount,
    new PublicKey(farmList.poolAddress),
    new BN(100),
    SAROS_FARM_ADDRESS,
    farmList.rewards,
    new PublicKey(farmList.lpAddress)
  );
  return `Your transaction hash: ${hash}`;
};

const onUnStakePool = async () => {
  const hash = await SarosFarmService.unStakePool(
    connection,
    payerAccount,
    new PublicKey(farmList.poolAddress),
    new PublicKey(farmList.lpAddress)
    new BN(100),
    SAROS_FARM_ADDRESS,
    farmList.rewards,
    false // Set to true if want to unstake full balance
  );
  return `Your transaction hash: ${hash}`;
};

const onClaimReward = async () => {
  const poolRewardAddress = farmList.rewards[0].poolRewardAddress
  const mintAddress = farmList.rewards[0].address

  const hash = await SarosFarmService.claimReward(
    connection,
    payerAccount,
    new PublicKey(poolRewardAddress),
    new PublicKey(SAROS_FARM_ADDRESS),
    new PublicKey(mintAddress)
  )
  return `Your transaction hash: ${hash}`;

}

```
