/* eslint-disable new-cap */
import { SarosSwapInstructionService } from './sarosSwapIntructions';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { cloneDeep } from 'lodash';
import BN from 'bn.js';
import {
  HOST_FEE_DENOMINATOR,
  HOST_FEE_NUMERATOR,
  INITIALIZE_MINT_SPAN,
  INITIALIZE_POOL_SPAN,
  NATIVE_SOL,
  OWNER_TRADING_FEE_DENOMINATOR,
  OWNER_TRADING_FEE_NUMERATOR,
  OWNER_WITHDRAW_FEE_DENOMINATOR,
  OWNER_WITHDRAW_FEE_NUMERATOR,
  SAROS_SWAP_PROGRAM_ADDRESS_V1,
  TOKEN_PROGRAM_ID,
  TRADING_FEE_DENOMINATOR,
  TRADING_FEE_NUMERATOR,
} from '../constants';
import { TokenProgramInstructionService } from '../common/tokenProgramInstructionService';
import { closeAccount } from '@project-serum/serum/lib/token-instructions';
import {
  convertBalanceToWei,
  convertWeiToBalance,
  renderAmountSlippage,
} from '../functions';
import {
  findAssociatedTokenAddress,
  getTokenAccountInfo,
  getTokenMintInfo,
  genOwnerSolana,
  messFail,
  createAssociatedTokenAccountIfNotExist,
  deserializeAccount,
  createTransactions,
  sendTransaction,
  isAddressInUse,
} from '../common';

export const getPoolInfo = async (connection, poolAddress) => {
  const accountInfo = await connection.getAccountInfo(poolAddress);
  if (!accountInfo) return null;
  return SarosSwapInstructionService.decodePoolData(accountInfo.data);
};

export const tradingTokensToPoolTokens = (
  sourceAmount,
  swapSourceAmount,
  poolAmount
) => {
  const tradingFee =
    (sourceAmount / 2) *
    (TRADING_FEE_NUMERATOR.toNumber() / TRADING_FEE_DENOMINATOR.toNumber());
  const sourceAmountPostFee = sourceAmount - tradingFee;
  const root = Math.sqrt(sourceAmountPostFee / swapSourceAmount + 1);

  return Math.floor(poolAmount * (root - 1));
};

export const findPoolSeed = (tokenSwapProgramId) => {
  const newToken = Keypair.generate();
  return PublicKey.findProgramAddress(
    [newToken.publicKey.toBuffer()],
    tokenSwapProgramId
  );
};

export const createPoolSeed = (address, tokenSwapProgramId) => {
  return PublicKey.createProgramAddress(
    [address.toBuffer()],
    tokenSwapProgramId
  );
};

export const findPoolAuthorityAddress = (poolAddress, tokenSwapProgramId) => {
  return PublicKey.findProgramAddress(
    [poolAddress.toBuffer()],
    tokenSwapProgramId
  );
};

export const createPool = async (
  connection,
  owner,
  feeOwnerAddress,
  token0MintAddress,
  token1MintAddress,
  token0Address,
  token1Address,
  token0Amount,
  token1Amount,
  curveType,
  curveParameters,
  tokenProgramId,
  sarosSwapProgramId
) => {
  const transaction = await createTransactions(connection, owner);
  const payerAccount = await genOwnerSolana(owner);
  const [poolAccountSeed] = await findPoolSeed(sarosSwapProgramId);
  const poolAccount = Keypair.fromSeed(poolAccountSeed.toBuffer());
  const [poolAuthorityAddress] = await findPoolAuthorityAddress(
    poolAccount.publicKey,
    sarosSwapProgramId
  );
  const poolLpMintAccount = Keypair.fromSeed(poolAuthorityAddress.toBuffer());

  if (!(await isAddressInUse(connection, poolLpMintAccount.publicKey))) {
    const lamportsToInitializeMint =
      await connection.getMinimumBalanceForRentExemption(INITIALIZE_MINT_SPAN);
    const initMintTransaction =
      await TokenProgramInstructionService.createInitializeMintTransaction(
        payerAccount.publicKey,
        poolLpMintAccount.publicKey,
        2,
        poolAuthorityAddress,
        null,
        lamportsToInitializeMint
      );
    transaction.add(initMintTransaction.instructions[0]);
    transaction.add(initMintTransaction.instructions[1]);
  }
  const poolToken0Address = await findAssociatedTokenAddress(
    poolAuthorityAddress,
    token0MintAddress
  );
  if (!(await isAddressInUse(connection, poolToken0Address))) {
    const createATPATransaction =
      await TokenProgramInstructionService.createAssociatedTokenAccountTransaction(
        payerAccount.publicKey,
        poolAuthorityAddress,
        token0MintAddress
      );
    transaction.add(createATPATransaction.instructions[0]);
  }
  const poolToken1Address = await findAssociatedTokenAddress(
    poolAuthorityAddress,
    token1MintAddress
  );
  if (!(await isAddressInUse(connection, poolToken1Address))) {
    const createATPATransaction =
      await TokenProgramInstructionService.createAssociatedTokenAccountTransaction(
        payerAccount.publicKey,
        poolAuthorityAddress,
        token1MintAddress
      );
    transaction.add(createATPATransaction.instructions[0]);
  }
  const poolLpTokenAddress = await findAssociatedTokenAddress(
    payerAccount.publicKey,
    poolLpMintAccount.publicKey
  );
  if (!(await isAddressInUse(connection, poolLpTokenAddress))) {
    const createATPATransaction =
      await TokenProgramInstructionService.createAssociatedTokenAccountTransaction(
        payerAccount.publicKey,
        payerAccount.publicKey,
        poolLpMintAccount.publicKey
      );
    transaction.add(createATPATransaction.instructions[0]);
  }

  const feeLpTokenAddress = await findAssociatedTokenAddress(
    feeOwnerAddress,
    poolLpMintAccount.publicKey
  );
  if (
    payerAccount.publicKey.toBase58() !== feeOwnerAddress.toBase58() &&
    !(await isAddressInUse(connection, feeLpTokenAddress))
  ) {
    const createATPATransaction =
      await TokenProgramInstructionService.createAssociatedTokenAccountTransaction(
        payerAccount.publicKey,
        feeOwnerAddress,
        poolLpMintAccount.publicKey
      );
    transaction.add(createATPATransaction.instructions[0]);
  }

  const transferToken0Transaction =
    await TokenProgramInstructionService.createTransferTransaction(
      payerAccount.publicKey,
      token0Address,
      poolToken0Address,
      token0Amount
    );
  transaction.add(transferToken0Transaction.instructions[0]);

  const transferToken1Transaction =
    await TokenProgramInstructionService.createTransferTransaction(
      payerAccount.publicKey,
      token1Address,
      poolToken1Address,
      token1Amount
    );
  transaction.add(transferToken1Transaction.instructions[0]);

  const lamportsToCreatePool =
    await connection.getMinimumBalanceForRentExemption(INITIALIZE_POOL_SPAN);
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payerAccount.publicKey,
      newAccountPubkey: poolAccount.publicKey,
      lamports: lamportsToCreatePool,
      space: INITIALIZE_POOL_SPAN,
      programId: sarosSwapProgramId,
    })
  );
  const tokenSwapInstruction =
    SarosSwapInstructionService.createInitSwapInstruction(
      poolAccount,
      poolAuthorityAddress,
      poolToken0Address,
      poolToken1Address,
      poolLpMintAccount.publicKey,
      feeLpTokenAddress,
      poolLpTokenAddress,
      tokenProgramId,
      sarosSwapProgramId,
      TRADING_FEE_NUMERATOR,
      TRADING_FEE_DENOMINATOR,
      OWNER_TRADING_FEE_NUMERATOR,
      OWNER_TRADING_FEE_DENOMINATOR,
      OWNER_WITHDRAW_FEE_NUMERATOR,
      OWNER_WITHDRAW_FEE_DENOMINATOR,
      HOST_FEE_NUMERATOR,
      HOST_FEE_DENOMINATOR,
      curveType,
      curveParameters
    );
  transaction.add(tokenSwapInstruction);

  if (token0MintAddress.toString() === NATIVE_SOL.mintAddress) {
    transaction.add(
      closeAccount({
        source: token0Address,
        destination: payerAccount.publicKey,
        owner: payerAccount.publicKey,
      })
    );
  }

  if (token1MintAddress.toString() === NATIVE_SOL.mintAddress) {
    transaction.add(
      closeAccount({
        source: token1Address,
        destination: payerAccount.publicKey,
        owner: payerAccount.publicKey,
      })
    );
  }

  const result = await sendTransaction(connection, transaction, [
    payerAccount.publicKey,
    poolLpMintAccount,
    poolAccount,
  ]);
  if (messFail.includes(result)) {
    return { isError: true, mess: result };
  } else {
    return { isError: false, hash: result, poolAccount };
  }
};

export const withdrawAllTokenTypes = async (
  connection,
  walletAddress,
  userLpTokenAddress,
  userToken0Address,
  userToken1Address,
  lpTokenAmount,
  poolAddress,
  tokenSwapProgramId,

  token0MintAddress,
  token1MintAddress,
  slippage
) => {
  const payerAccount = await genOwnerSolana(walletAddress);
  const delegateAccount = await genOwnerSolana(walletAddress);
  const transaction = await createTransactions(connection, walletAddress);
  const [poolAuthorityAddress] = await findPoolAuthorityAddress(
    poolAddress,
    tokenSwapProgramId
  );

  const poolAccountInfo = await getPoolInfo(connection, poolAddress);

  const poolLpMintInfo = await getTokenMintInfo(
    connection,
    poolAccountInfo.lpTokenMint
  );
  const lpTokenSupply = poolLpMintInfo.supply.toNumber();

  let feeAmount = 0;
  if (OWNER_WITHDRAW_FEE_NUMERATOR.toNumber() !== 0) {
    feeAmount = Math.floor(
      (lpTokenAmount * OWNER_WITHDRAW_FEE_NUMERATOR.toNumber()) /
        OWNER_WITHDRAW_FEE_DENOMINATOR.toNumber()
    );
  }
  const withdrawLpTokenAmount = lpTokenAmount - feeAmount;

  const poolToken0AccountInfo = await getTokenAccountInfo(
    connection,
    poolAccountInfo.token0Account
  );

  const newAmount0 = Math.floor(
    (poolToken0AccountInfo.amount.toNumber() * withdrawLpTokenAmount) /
      lpTokenSupply
  );

  const token0Amount = Math.floor(
    newAmount0 - renderAmountSlippage(newAmount0, slippage)
  );

  const poolToken1AccountInfo = await getTokenAccountInfo(
    connection,
    poolAccountInfo.token1Account
  );

  const newAmount1 = Math.floor(
    (poolToken1AccountInfo.amount.toNumber() * withdrawLpTokenAmount) /
      lpTokenSupply
  );
  const token1Amount = Math.floor(
    newAmount1 - renderAmountSlippage(newAmount1, slippage)
  );

  const withdrawInstruction =
    SarosSwapInstructionService.withdrawAllTokenTypesInstruction(
      poolAddress,
      poolAuthorityAddress,
      delegateAccount.publicKey,
      poolAccountInfo.lpTokenMint,
      poolAccountInfo.feeAccount,
      userLpTokenAddress,
      poolAccountInfo.token0Account,
      poolAccountInfo.token1Account,
      userToken0Address,
      userToken1Address,
      tokenSwapProgramId,
      TOKEN_PROGRAM_ID,
      new BN(lpTokenAmount),
      new BN(token0Amount),
      new BN(token1Amount)
    );
  transaction.add(withdrawInstruction);

  if (token0MintAddress.toString() === NATIVE_SOL.mintAddress) {
    transaction.add(
      closeAccount({
        source: userToken0Address,
        destination: payerAccount.publicKey,
        owner: payerAccount.publicKey,
      })
    );
  }

  if (token1MintAddress.toString() === NATIVE_SOL.mintAddress) {
    transaction.add(
      closeAccount({
        source: userToken1Address,
        destination: payerAccount.publicKey,
        owner: payerAccount.publicKey,
      })
    );
  }

  const result = await sendTransaction(connection, transaction, [
    delegateAccount,
  ]);

  if (messFail.includes(result)) {
    return { isError: true, mess: result };
  } else {
    return { isError: false, hash: result };
  }
};

export const depositAllTokenTypes = async (
  connection,
  walletAddress,
  userAddress,
  userToken0Address,
  userToken1Address,
  lpTokenAmount,
  poolAddress,
  tokenSwapProgramId,
  token0MintAddress,
  token1MintAddress,
  slippage
) => {
  const transaction = await createTransactions(connection, walletAddress);
  const poolAccountInfo = await getPoolInfo(connection, poolAddress);
  const payerAccount = await genOwnerSolana(walletAddress);
  const delegateAccount = await genOwnerSolana(walletAddress);
  const poolLpMintInfo = await getTokenMintInfo(
    connection,
    poolAccountInfo.lpTokenMint
  );
  const lpTokenSupply = poolLpMintInfo.supply.toNumber();

  const poolToken0AccountInfo = await getTokenAccountInfo(
    connection,
    poolAccountInfo.token0Account
  );

  const newAmount0 = Math.floor(
    (poolToken0AccountInfo.amount.toNumber() * lpTokenAmount) / lpTokenSupply
  );
  const token0Amount = Math.floor(
    newAmount0 + renderAmountSlippage(newAmount0, slippage)
  );

  const poolToken1AccountInfo = await getTokenAccountInfo(
    connection,
    poolAccountInfo.token1Account
  );

  const newAmount1 = Math.floor(
    (poolToken1AccountInfo.amount.toNumber() * lpTokenAmount) / lpTokenSupply
  );
  const token1Amount = Math.floor(
    newAmount1 + renderAmountSlippage(newAmount0, slippage)
  );

  const [poolAuthorityAddress] = await findPoolAuthorityAddress(
    poolAddress,
    tokenSwapProgramId
  );
  const userLpTokenAddress = await findAssociatedTokenAddress(
    userAddress,
    poolAccountInfo.lpTokenMint
  );

  if (!(await isAddressInUse(connection, userLpTokenAddress))) {
    const createATPATransaction =
      await TokenProgramInstructionService.createAssociatedTokenAccountTransaction(
        payerAccount.publicKey,
        userAddress,
        poolAccountInfo.lpTokenMint
      );
    transaction.add(createATPATransaction.instructions[0]);
  }

  const depositInstruction =
    await SarosSwapInstructionService.depositAllTokenTypesInstruction(
      poolAddress,
      poolAuthorityAddress,
      delegateAccount.publicKey,
      userToken0Address,
      userToken1Address,
      poolAccountInfo.token0Account,
      poolAccountInfo.token1Account,
      poolAccountInfo.lpTokenMint,
      userLpTokenAddress,
      tokenSwapProgramId,
      TOKEN_PROGRAM_ID,
      new BN(lpTokenAmount),
      new BN(token0Amount),
      new BN(token1Amount)
    );

  transaction.add(depositInstruction);

  if (token0MintAddress.toString() === NATIVE_SOL.mintAddress) {
    transaction.add(
      closeAccount({
        source: userToken0Address,
        destination: payerAccount.publicKey,
        owner: payerAccount.publicKey,
      })
    );
  }

  if (token1MintAddress.toString() === NATIVE_SOL.mintAddress) {
    transaction.add(
      closeAccount({
        source: userToken1Address,
        destination: payerAccount.publicKey,
        owner: payerAccount.publicKey,
      })
    );
  }

  const result = await sendTransaction(connection, transaction, [
    delegateAccount,
  ]);

  if (messFail.includes(result)) {
    return { isError: true, mess: result };
  } else {
    return { isError: false, hash: result };
  }
};

export const swapSaros = async (
  connection,
  userTokenSourceAddress,
  userTokenDestinationAddress,
  amountFrom,
  minimumAmountTo,
  hostFeeOwnerAddress,
  poolAddress,
  walletAddress,
  fromCoinMint,
  toCoinMint
) => {
  const amountIn = convertBalanceToWei(amountFrom);
  const minimumAmountOut = convertBalanceToWei(minimumAmountTo);
  const transaction = await createTransactions(connection, walletAddress);
  const tokenSwapProgramId = SAROS_SWAP_PROGRAM_ADDRESS_V1;
  const owner = await genOwnerSolana(walletAddress);
  const signers = [owner.publicKey];
  const [poolAuthorityAddress] = await findPoolAuthorityAddress(
    poolAddress,
    tokenSwapProgramId
  );
  const poolAccountInfo = await getPoolInfo(connection, poolAddress);
  let fromMint = fromCoinMint;
  let toMint = toCoinMint;

  if (fromMint === NATIVE_SOL.mintAddress) {
    fromMint = NATIVE_SOL.mintAddress;
  }
  if (toMint === NATIVE_SOL.mintAddress) {
    toMint = NATIVE_SOL.mintAddress;
  }

  const newFromAccount = await createAssociatedTokenAccountIfNotExist(
    userTokenSourceAddress.toString(),
    new PublicKey(walletAddress),
    fromMint,
    transaction
  );
  const newToAccount = await createAssociatedTokenAccountIfNotExist(
    userTokenDestinationAddress.toString(),
    new PublicKey(walletAddress),
    toMint,
    transaction
  );

  let poolTokenSourceAddress = null;
  let poolTokenDestinationAddress = null;
  if (fromMint === poolAccountInfo.token0Mint.toBase58()) {
    poolTokenSourceAddress = poolAccountInfo.token0Account;
  }
  if (fromMint === poolAccountInfo.token1Mint.toBase58()) {
    poolTokenSourceAddress = poolAccountInfo.token1Account;
  }
  if (toMint === poolAccountInfo.token0Mint.toBase58()) {
    poolTokenDestinationAddress = poolAccountInfo.token0Account;
  }
  if (toMint === poolAccountInfo.token1Mint.toBase58()) {
    poolTokenDestinationAddress = poolAccountInfo.token1Account;
  }

  let hostFeeTokenAddress = null;
  if (hostFeeOwnerAddress) {
    hostFeeTokenAddress = await findAssociatedTokenAddress(
      hostFeeOwnerAddress,
      poolAccountInfo.lpTokenMint
    );
    if (!(await isAddressInUse(connection, hostFeeTokenAddress))) {
      const createATPATransaction =
        await TokenProgramInstructionService.createAssociatedTokenAccountTransaction(
          owner.publicKey,
          hostFeeOwnerAddress,
          poolAccountInfo.lpTokenMint
        );
      transaction.add(createATPATransaction.instructions[0]);
    }
  }

  const swapInstruction =
    await SarosSwapInstructionService.createSwapInstruction(
      poolAddress,
      poolAuthorityAddress,
      owner.publicKey,
      newFromAccount,
      poolTokenSourceAddress,
      poolTokenDestinationAddress,
      newToAccount,
      poolAccountInfo.lpTokenMint,
      poolAccountInfo.feeAccount,
      hostFeeTokenAddress,
      tokenSwapProgramId,
      TOKEN_PROGRAM_ID,
      new BN(amountIn),
      new BN(minimumAmountOut)
    );
  transaction.add(swapInstruction);
  if (fromMint.toString() === NATIVE_SOL.mintAddress) {
    transaction.add(
      closeAccount({
        source: newFromAccount,
        destination: owner.publicKey,
        owner: owner.publicKey,
      })
    );
  }

  if (toMint.toString() === NATIVE_SOL.mintAddress) {
    transaction.add(
      closeAccount({
        source: newToAccount,
        destination: owner.publicKey,
        owner: owner.publicKey,
      })
    );
  }

  const hash = await sendTransaction(connection, transaction, signers);
  if (messFail.includes(hash)) {
    return { isError: true, mess: hash };
  }

  return { isError: false, mess: hash };
};

export const swapRouteSaros = async (
  connection,
  userTokenSourceAddress,
  middleTokenAddress,
  userTokenDestinationAddress,
  amountIn,
  minimumAmountOut,
  middleAmount,
  hostFeeOwnerAddress,
  poolAddress,
  poolAddressB,
  tokenSwapProgramId,
  walletAddress,
  fromCoinMint,
  toCoinMint,
  middleCoinMint,
  toastNotiWait,
  transaction
) => {
  const owner = await genOwnerSolana(walletAddress);
  const signers = [owner.publicKey];
  const [poolAuthorityAddress] = await findPoolAuthorityAddress(
    poolAddress,
    tokenSwapProgramId
  );
  const [poolAuthorityAddressB] = await findPoolAuthorityAddress(
    poolAddressB,
    tokenSwapProgramId
  );
  const poolAccountInfo = await getPoolInfo(connection, poolAddress);
  const poolAccountInfoB = await getPoolInfo(connection, poolAddressB);
  let fromMint = fromCoinMint;
  let toMint = toCoinMint;
  let middleMint = middleCoinMint;
  if (fromMint === NATIVE_SOL.mintAddress) {
    fromMint = NATIVE_SOL.mintAddress;
  }
  if (middleMint === NATIVE_SOL.mintAddress) {
    middleMint = NATIVE_SOL.mintAddress;
  }

  if (toMint === NATIVE_SOL.mintAddress) {
    toMint = NATIVE_SOL.mintAddress;
  }

  const newFromAccount = await createAssociatedTokenAccountIfNotExist(
    userTokenSourceAddress.toString(),
    new PublicKey(walletAddress),
    fromMint,
    transaction
  );
  const newMiddleAccount = await createAssociatedTokenAccountIfNotExist(
    middleTokenAddress.toString(),
    new PublicKey(walletAddress),
    middleMint,
    transaction
  );

  const newToAccount = await createAssociatedTokenAccountIfNotExist(
    userTokenDestinationAddress.toString(),
    new PublicKey(walletAddress),
    toMint,
    transaction
  );

  let poolTokenSourceAddress = null;
  let poolTokenSourceAddressB = null;
  let poolTokenDestinationAddress = null;
  let poolTokenMiddleAddress = null;
  if (fromMint === poolAccountInfo.token0Mint.toBase58()) {
    poolTokenSourceAddress = poolAccountInfo.token0Account;
  }
  if (fromMint === poolAccountInfo.token1Mint.toBase58()) {
    poolTokenSourceAddress = poolAccountInfo.token1Account;
  }
  if (middleMint === poolAccountInfo.token0Mint.toBase58()) {
    poolTokenMiddleAddress = poolAccountInfo.token0Account;
  }
  if (middleMint === poolAccountInfo.token1Mint.toBase58()) {
    poolTokenMiddleAddress = poolAccountInfo.token1Account;
  }
  if (middleMint === poolAccountInfoB.token0Mint.toBase58()) {
    poolTokenSourceAddressB = poolAccountInfoB.token0Account;
  }
  if (middleMint === poolAccountInfoB.token1Mint.toBase58()) {
    poolTokenSourceAddressB = poolAccountInfoB.token1Account;
  }
  if (toMint === poolAccountInfoB.token0Mint.toBase58()) {
    poolTokenDestinationAddress = poolAccountInfoB.token0Account;
  }
  if (toMint === poolAccountInfoB.token1Mint.toBase58()) {
    poolTokenDestinationAddress = poolAccountInfoB.token1Account;
  }

  const swapInstruction =
    await SarosSwapInstructionService.createSwapInstruction(
      poolAddress,
      poolAuthorityAddress,
      owner.publicKey,
      newFromAccount,
      poolTokenSourceAddress,
      poolTokenMiddleAddress,
      newMiddleAccount,
      poolAccountInfo.lpTokenMint,
      poolAccountInfo.feeAccount,
      null,
      tokenSwapProgramId,
      TOKEN_PROGRAM_ID,
      new BN(amountIn),
      new BN(middleAmount)
    );
  const swapInstructionB =
    await SarosSwapInstructionService.createSwapInstruction(
      poolAddressB,
      poolAuthorityAddressB,
      owner.publicKey,
      newMiddleAccount,
      poolTokenSourceAddressB,
      poolTokenDestinationAddress,
      newToAccount,
      poolAccountInfoB.lpTokenMint,
      poolAccountInfoB.feeAccount,
      null,
      tokenSwapProgramId,
      TOKEN_PROGRAM_ID,
      new BN(middleAmount),
      new BN(minimumAmountOut)
    );
  transaction.add(swapInstruction);
  transaction.add(swapInstructionB);
  if (fromMint.toString() === NATIVE_SOL.mintAddress) {
    transaction.add(
      closeAccount({
        source: newFromAccount,
        destination: owner.publicKey,
        owner: owner.publicKey,
      })
    );
  }

  if (middleMint.toString() === NATIVE_SOL.mintAddress) {
    transaction.add(
      closeAccount({
        source: newMiddleAccount,
        destination: owner.publicKey,
        owner: owner.publicKey,
      })
    );
  }

  if (toMint.toString() === NATIVE_SOL.mintAddress) {
    transaction.add(
      closeAccount({
        source: newToAccount,
        destination: owner.publicKey,
        owner: owner.publicKey,
      })
    );
  }
  const hash = await sendTransaction(
    connection,
    transaction,
    signers,
    toastNotiWait
  );
  if (messFail.includes(hash)) {
    return { isError: true, mess: hash };
  }

  return hash;
};

export const getInfoByMintAddress = (mintAddress, lisToken) => {
  const info = lisToken.find((item) => item.mintAddress === mintAddress);
  return info;
};

export const getSwapAmountSaros = async (
  connection,
  fromCoinMint,
  toCoinMint,
  amount,
  slippage,
  poolParams
) => {
  const { address, tokens } = poolParams;
  const poolInfo = await getPoolInfo(
    connection,
    new PublicKey(address.toString())
  );
  const {
    token0Account,
    token1Account,
    tradeFeeDenominator,
    tradeFeeNumerator,
  } = poolInfo;
  const fromCoinMintClone = cloneDeep(fromCoinMint);
  const toCoinMintClone = cloneDeep(toCoinMint);
  const newSlippage = parseFloat(slippage);
  const newAmount = parseFloat(amount);
  const accountInfos = await Promise.all([
    connection.getAccountInfo(new PublicKey(token0Account.toString())),
    connection.getAccountInfo(new PublicKey(token1Account.toString())),
  ]);
  const tokenInfos = accountInfos.map((info) =>
    info ? deserializeAccount(info.data) : undefined
  );
  if (!tokenInfos[0] || !tokenInfos[1]) return 0;
  const inputTokenAccount = tokenInfos[0];
  const inputTokenInfo = tokens[inputTokenAccount.mint.toString()];
  const outputTokenAccount = tokenInfos[1];
  const outputTokenInfo = tokens[outputTokenAccount.mint.toString()];
  const convertAmountInputToken = parseFloat(
    convertWeiToBalance(
      inputTokenAccount.amount.toNumber(),
      inputTokenInfo.decimals
    )
  );
  const convertAmountOutputToken = parseFloat(
    convertWeiToBalance(
      outputTokenAccount.amount.toNumber(),
      outputTokenInfo.decimals
    )
  );
  let fromAmountWithFee =
    (newAmount *
      (tradeFeeDenominator.toNumber() - tradeFeeNumerator.toNumber())) /
    tradeFeeDenominator;

  if (tradeFeeDenominator.toNumber() === 0 || tradeFeeNumerator.toNumber()) {
    fromAmountWithFee = newAmount;
  }
  const rateEst = convertAmountOutputToken / convertAmountInputToken;

  if (
    fromCoinMintClone === inputTokenInfo.mintAddress &&
    toCoinMintClone === outputTokenInfo.mintAddress
  ) {
    const denominator = convertAmountInputToken + fromAmountWithFee;
    const amountOut =
      (convertAmountOutputToken * fromAmountWithFee) / denominator;
    const amountOutWithSlippage = amountOut / (1 + newSlippage / 100);
    const outBalance = convertAmountOutputToken - amountOut;
    const beforePrice = convertAmountOutputToken / convertAmountInputToken;
    const afterPrice = outBalance / denominator;
    const priceImpact = Math.abs(
      ((parseFloat(beforePrice) - parseFloat(afterPrice)) /
        parseFloat(beforePrice)) *
        100
    );
    return {
      amountOut,
      amountOutWithSlippage,
      priceImpact,
      rate: rateEst,
    };
  } else {
    const denominator = convertAmountOutputToken + fromAmountWithFee;
    const amountOut =
      (convertAmountInputToken * fromAmountWithFee) / denominator;
    const amountOutWithSlippage = amountOut / (1 + newSlippage / 100);
    const outBalance = convertAmountInputToken - amountOut;
    const beforePrice = convertAmountOutputToken / convertAmountInputToken;
    const afterPrice = denominator / outBalance;
    const priceImpact = Math.abs(
      ((parseFloat(afterPrice) - parseFloat(beforePrice)) /
        parseFloat(beforePrice)) *
        100
    );
    return {
      amountOut,
      amountOutWithSlippage,
      priceImpact,
      rate: 1 / rateEst,
    };
  }
};
