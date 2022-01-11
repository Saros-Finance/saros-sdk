import BN from 'bn.js';

export const INITIALIZE_MINT_SPAN = 82;
export const INITIALIZE_POOL_SPAN = 324;
export const TRADING_FEE_NUMERATOR = new BN(0);
export const TRADING_FEE_DENOMINATOR = new BN(10000);
export const OWNER_TRADING_FEE_NUMERATOR = new BN(30);
export const OWNER_TRADING_FEE_DENOMINATOR = new BN(10000);
export const OWNER_WITHDRAW_FEE_NUMERATOR = new BN(0);
export const OWNER_WITHDRAW_FEE_DENOMINATOR = new BN(0);
export const HOST_FEE_NUMERATOR = new BN(20);
export const HOST_FEE_DENOMINATOR = new BN(100);
export const NATIVE_SOL = {
  id: 'solana',
  mintAddress: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  icon: 'https://cdn.jsdelivr.net/gh/trustwallet/assets/blockchains/solana/info/logo.png',
  decimals: 9,
};
