/* eslint-disable no-undef */
import * as borsh from '@project-serum/borsh'
import { BorshService } from '../common/borshService'
import * as BufferLayout from 'buffer-layout'
import { TransactionInstruction } from '@solana/web3.js'

const TokenSwapLayout = borsh.struct([
  borsh.u8('version'),
  borsh.u8('isInitialized'),
  borsh.u8('bumpSeed'),
  borsh.publicKey('tokenProgramId'),
  borsh.publicKey('tokenAccountA'),
  borsh.publicKey('tokenAccountB'),
  borsh.publicKey('tokenPool'),
  borsh.publicKey('mintA'),
  borsh.publicKey('mintB'),
  borsh.publicKey('feeAccount'),
  borsh.u64('tradeFeeNumerator'),
  borsh.u64('tradeFeeDenominator'),
  borsh.u64('ownerTradeFeeNumerator'),
  borsh.u64('ownerTradeFeeDenominator'),
  borsh.u64('ownerWithdrawFeeNumerator'),
  borsh.u64('ownerWithdrawFeeDenominator'),
  borsh.u64('hostFeeNumerator'),
  borsh.u64('hostFeeDenominator'),
  borsh.u8('curveType'),
  borsh.array(borsh.u8(), 32, 'curveParameters')
])

export class SarosSwapInstructionService {
  static decodePoolData (data) {
    const dataDecoded = BorshService.deserialize(TokenSwapLayout, data)
    return {
      version: dataDecoded.version,
      isInitialized: dataDecoded.isInitialized !== 0,
      nonce: dataDecoded.bumpSeed,
      tokenProgramId: dataDecoded.tokenProgramId,
      lpTokenMint: dataDecoded.tokenPool,
      feeAccount: dataDecoded.feeAccount,
      token0Mint: dataDecoded.mintA,
      token0Account: dataDecoded.tokenAccountA,
      token1Mint: dataDecoded.mintB,
      token1Account: dataDecoded.tokenAccountB,
      tradeFeeNumerator: dataDecoded.tradeFeeNumerator,
      tradeFeeDenominator: dataDecoded.tradeFeeDenominator,
      ownerTradeFeeNumerator: dataDecoded.ownerTradeFeeNumerator,
      ownerTradeFeeDenominator: dataDecoded.ownerTradeFeeDenominator,
      ownerWithdrawFeeNumerator: dataDecoded.ownerWithdrawFeeNumerator,
      ownerWithdrawFeeDenominator: dataDecoded.ownerWithdrawFeeDenominator,
      hostFeeNumerator: dataDecoded.hostFeeNumerator,
      hostFeeDenominator: dataDecoded.hostFeeDenominator,
      curveType: dataDecoded.curveType,
      curveParameters: dataDecoded.curveParameters
    }
  }

  static createInitSwapInstruction (
    tokenSwapAccount,
    authority,
    tokenAccountA,
    tokenAccountB,
    tokenPool,
    feeAccount,
    tokenAccountPool,
    tokenProgramId,
    swapProgramId,
    tradeFeeNumerator,
    tradeFeeDenominator,
    ownerTradeFeeNumerator,
    ownerTradeFeeDenominator,
    ownerWithdrawFeeNumerator,
    ownerWithdrawFeeDenominator,
    hostFeeNumerator,
    hostFeeDenominator,
    curveType,
    curveParameters
  ) {
    const keys = [
      { pubkey: tokenSwapAccount.publicKey, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: tokenAccountA, isSigner: false, isWritable: false },
      { pubkey: tokenAccountB, isSigner: false, isWritable: false },
      { pubkey: tokenPool, isSigner: false, isWritable: true },
      { pubkey: feeAccount, isSigner: false, isWritable: false },
      { pubkey: tokenAccountPool, isSigner: false, isWritable: true },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false }
    ]
    const commandDataLayout = borsh.struct([
      borsh.u8('instruction'),
      borsh.u64('tradeFeeNumerator'),
      borsh.u64('tradeFeeDenominator'),
      borsh.u64('ownerTradeFeeNumerator'),
      borsh.u64('ownerTradeFeeDenominator'),
      borsh.u64('ownerWithdrawFeeNumerator'),
      borsh.u64('ownerWithdrawFeeDenominator'),
      borsh.u64('hostFeeNumerator'),
      borsh.u64('hostFeeDenominator'),
      borsh.u8('curveType'),
      BufferLayout.blob(32, 'curveParameters')
    ])
    const curveParamsBuffer = Buffer.alloc(32)
    curveParameters.toArrayLike(Buffer).copy(curveParamsBuffer)
    const data = serialize(
      commandDataLayout,
      {
        instruction: 0, // InitializeSwap instruction
        tradeFeeNumerator,
        tradeFeeDenominator,
        ownerTradeFeeNumerator,
        ownerTradeFeeDenominator,
        ownerWithdrawFeeNumerator,
        ownerWithdrawFeeDenominator,
        hostFeeNumerator,
        hostFeeDenominator,
        curveType,
        curveParameters: curveParamsBuffer
      },
      1024
    )

    return new TransactionInstruction({
      keys,
      programId: swapProgramId,
      data
    })
  }

  static depositAllTokenTypesInstruction (
    tokenSwap,
    authority,
    userTransferAuthority,
    sourceA,
    sourceB,
    intoA,
    intoB,
    poolToken,
    poolAccount,
    swapProgramId,
    tokenProgramId,
    poolTokenAmount,
    maximumTokenA,
    maximumTokenB
  ) {
    const dataLayout = borsh.struct([
      borsh.u8('instruction'),
      borsh.u64('poolTokenAmount'),
      borsh.u64('maximumTokenA'),
      borsh.u64('maximumTokenB')
    ])

    const data = serialize(
      dataLayout,
      {
        instruction: 2, // Deposit instruction
        poolTokenAmount,
        maximumTokenA,
        maximumTokenB
      },
      64
    )

    const keys = [
      { pubkey: tokenSwap, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
      { pubkey: sourceA, isSigner: false, isWritable: true },
      { pubkey: sourceB, isSigner: false, isWritable: true },
      { pubkey: intoA, isSigner: false, isWritable: true },
      { pubkey: intoB, isSigner: false, isWritable: true },
      { pubkey: poolToken, isSigner: false, isWritable: true },
      { pubkey: poolAccount, isSigner: false, isWritable: true },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false }
    ]
    return new TransactionInstruction({
      keys,
      programId: swapProgramId,
      data
    })
  }

  static withdrawAllTokenTypesInstruction (
    tokenSwap,
    authority,
    userTransferAuthority,
    poolMint,
    feeAccount,
    sourcePoolAccount,
    fromA,
    fromB,
    userAccountA,
    userAccountB,
    swapProgramId,
    tokenProgramId,
    poolTokenAmount,
    minimumTokenA,
    minimumTokenB
  ) {
    const dataLayout = borsh.struct([
      borsh.u8('instruction'),
      borsh.u64('poolTokenAmount'),
      borsh.u64('minimumTokenA'),
      borsh.u64('minimumTokenB')
    ])

    const data = serialize(
      dataLayout,
      {
        instruction: 3, // Withdraw instruction
        poolTokenAmount,
        minimumTokenA,
        minimumTokenB
      },
      64
    )

    const keys = [
      { pubkey: tokenSwap, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
      { pubkey: poolMint, isSigner: false, isWritable: true },
      { pubkey: sourcePoolAccount, isSigner: false, isWritable: true },
      { pubkey: fromA, isSigner: false, isWritable: true },
      { pubkey: fromB, isSigner: false, isWritable: true },
      { pubkey: userAccountA, isSigner: false, isWritable: true },
      { pubkey: userAccountB, isSigner: false, isWritable: true },
      { pubkey: feeAccount, isSigner: false, isWritable: true },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false }
    ]
    return new TransactionInstruction({
      keys,
      programId: swapProgramId,
      data
    })
  }

  static createSwapInstruction (
    tokenSwap,
    authority,
    userTransferAuthority,
    userSource,
    poolSource,
    poolDestination,
    userDestination,
    poolMint,
    feeAccount,
    hostFeeAccount,
    swapProgramId,
    tokenProgramId,
    amountIn,
    minimumAmountOut
  ) {
    const dataLayout = borsh.struct([
      borsh.u8('instruction'),
      borsh.u64('amountIn'),
      borsh.u64('minimumAmountOut')
    ])
    const data = serialize(
      dataLayout,
      {
        instruction: 1, // Swap instruction
        amountIn,
        minimumAmountOut
      },
      128
    )

    const keys = [
      { pubkey: tokenSwap, isSigner: false, isWritable: false },
      { pubkey: authority, isSigner: false, isWritable: false },
      { pubkey: userTransferAuthority, isSigner: true, isWritable: false },
      { pubkey: userSource, isSigner: false, isWritable: true },
      { pubkey: poolSource, isSigner: false, isWritable: true },
      { pubkey: poolDestination, isSigner: false, isWritable: true },
      { pubkey: userDestination, isSigner: false, isWritable: true },
      { pubkey: poolMint, isSigner: false, isWritable: true },
      { pubkey: feeAccount, isSigner: false, isWritable: true },
      { pubkey: tokenProgramId, isSigner: false, isWritable: false }
    ]
    if (hostFeeAccount !== null) {
      keys.push({ pubkey: hostFeeAccount, isSigner: false, isWritable: true })
    }
    return new TransactionInstruction({
      keys,
      programId: swapProgramId,
      data
    })
  }
}

function serialize (layout, data, maxSpan) {
  const buffer = Buffer.alloc(maxSpan)
  const span = layout.encode(data, buffer)
  return buffer.slice(0, span)
}
