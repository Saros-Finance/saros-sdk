import { BorshCoder } from '@project-serum/anchor';
import { SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { SarosFarmIdl, TOKEN_PROGRAM_ID } from '../constants';

const coder = new BorshCoder(SarosFarmIdl);

export class SarosFarmInstructionService {
  static createUserPoolInstruction(
    payerAddress,
    poolAddress,
    userPoolAddress,
    userPoolNonce,
    sarosFarmProgramAddress
  ) {
    const request = {
      userPoolNonce,
    };
    const data = coder.instruction.encode('createUserPool', request);

    const keys = [
      { pubkey: payerAddress, isSigner: true, isWritable: true },
      { pubkey: poolAddress, isSigner: false, isWritable: false },
      { pubkey: userPoolAddress, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
      data,
      keys,
      programId: sarosFarmProgramAddress,
    });
  }

  static stakePoolInstruction(
    poolAddress,
    poolStakingTokenAddress,
    userAddress,
    userPoolAddress,
    userStakingTokenAddress,
    amount,
    sarosFarmProgramAddress
  ) {
    const request = {
      amount,
    };
    const data = coder.instruction.encode('stakePool', request);

    const keys = [
      { pubkey: poolAddress, isSigner: false, isWritable: true },
      { pubkey: poolStakingTokenAddress, isSigner: false, isWritable: true },
      { pubkey: userAddress, isSigner: true, isWritable: false },
      { pubkey: userPoolAddress, isSigner: false, isWritable: true },
      { pubkey: userStakingTokenAddress, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
      data,
      keys,
      programId: sarosFarmProgramAddress,
    });
  }

  static createUserPoolRewardInstruction(
    payerAddress,
    poolRewardAddress,
    userPoolRewardAddress,
    userPoolRewardNonce,
    sarosFarmProgramAddress
  ) {
    const request = {
      userPoolRewardNonce,
    };
    const data = coder.instruction.encode('createUserPoolReward', request);

    const keys = [
      { pubkey: payerAddress, isSigner: true, isWritable: true },
      { pubkey: poolRewardAddress, isSigner: false, isWritable: false },
      { pubkey: userPoolRewardAddress, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
      data,
      keys,
      programId: sarosFarmProgramAddress,
    });
  }

  static stakePoolRewardInstruction(
    poolAddress,
    poolRewardAddress,
    userAddress,
    userPoolAddress,
    userPoolRewardAddress,
    sarosFarmProgramAddress
  ) {
    const request = {};
    const data = coder.instruction.encode('stakePoolReward', request);

    const keys = [
      { pubkey: poolAddress, isSigner: false, isWritable: false },
      { pubkey: poolRewardAddress, isSigner: false, isWritable: true },
      { pubkey: userAddress, isSigner: true, isWritable: false },
      { pubkey: userPoolAddress, isSigner: false, isWritable: true },
      { pubkey: userPoolRewardAddress, isSigner: false, isWritable: true },
    ];

    return new TransactionInstruction({
      data,
      keys,
      programId: sarosFarmProgramAddress,
    });
  }

  static decodePoolRewardAccount(data) {
    const result = coder.accounts.decode('PoolReward', data);
    return result;
  }

  static claimRewardInstruction(
    poolRewardAddress,
    poolRewardAuthorityAddress,
    poolRewardTokenAddress,
    userAddress,
    userPoolRewardAddress,
    userRewardTokenAddress,
    sarosFarmProgramAddress
  ) {
    const request = {};
    const data = coder.instruction.encode('claimReward', request);

    const keys = [
      { pubkey: poolRewardAddress, isSigner: false, isWritable: true },
      {
        pubkey: poolRewardAuthorityAddress,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: poolRewardTokenAddress, isSigner: false, isWritable: true },
      { pubkey: userAddress, isSigner: true, isWritable: false },
      { pubkey: userPoolRewardAddress, isSigner: false, isWritable: true },
      { pubkey: userRewardTokenAddress, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
      data,
      keys,
      programId: sarosFarmProgramAddress,
    });
  }

  static unstakePoolInstruction(
    poolAddress,
    poolAuthorityAddress,
    poolStakingTokenAddress,
    userAddress,
    userPoolAddress,
    userStakingTokenAddress,
    amount,
    sarosFarmProgramAddress
  ) {
    const request = {
      amount,
    };
    const data = coder.instruction.encode('unstakePool', request);

    const keys = [
      { pubkey: poolAddress, isSigner: false, isWritable: true },
      { pubkey: poolAuthorityAddress, isSigner: false, isWritable: false },
      { pubkey: poolStakingTokenAddress, isSigner: false, isWritable: true },
      { pubkey: userAddress, isSigner: true, isWritable: false },
      { pubkey: userPoolAddress, isSigner: false, isWritable: true },
      { pubkey: userStakingTokenAddress, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
      data,
      keys,
      programId: sarosFarmProgramAddress,
    });
  }

  static unstakePoolRewardInstruction(
    poolAddress,
    poolRewardAddress,
    userAddress,
    userPoolAddress,
    userPoolRewardAddress,
    sarosFarmProgramAddress
  ) {
    const request = {};
    const data = coder.instruction.encode('unstakePoolReward', request);

    const keys = [
      { pubkey: poolAddress, isSigner: false, isWritable: false },
      { pubkey: poolRewardAddress, isSigner: false, isWritable: true },
      { pubkey: userAddress, isSigner: true, isWritable: false },
      { pubkey: userPoolAddress, isSigner: false, isWritable: true },
      { pubkey: userPoolRewardAddress, isSigner: false, isWritable: true },
    ];

    return new TransactionInstruction({
      data,
      keys,
      programId: sarosFarmProgramAddress,
    });
  }

  static decodePoolAccount(data) {
    const result = coder.accounts.decode('Pool', data);
    return result;
  }
}
