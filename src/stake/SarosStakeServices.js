/* eslint-disable no-undef */
import { PublicKey, Transaction } from '@solana/web3.js';
import { SolanaService } from '../SolanaService';
import { TokenProgramService } from '../TokenProgramService';
import { BLOCKS_PER_YEAR, getPriceBaseId } from '../functions';
import { getPoolInfo } from '../swap/sarosSwapServices';
import { genConnectionSolana } from '../common';
import { get } from 'lodash';
import { GraphQLClient, gql } from 'graphql-request';
import { SarosFarmInstructionService } from '../farm/sarosFarmServiceIntructions';

const gqlClient = new GraphQLClient('https://graphql.saros.finance/');

export class SarosStakeServices {
  static async stakePool(
    connection,
    payerAccount,
    poolAddress,
    amount,
    sarosFarmProgramAddress,
    rewards = [],
    lpAddress
  ) {
    try {
      const userStakingTokenAddress =
        await TokenProgramService.findAssociatedTokenAddress(
          payerAccount.publicKey,
          lpAddress
        );
      const pool = await this.getPoolData(connection, poolAddress);
      const [userPoolAddress, userPoolNonce] = await this.findUserPoolAddress(
        payerAccount.publicKey,
        poolAddress,
        sarosFarmProgramAddress
      );

      const transaction = new Transaction();

      if (
        !userStakingTokenAddress ||
        (await SolanaService.isAddressAvailable(
          connection,
          userStakingTokenAddress
        ))
      ) {
        const createATAInstruction =
          TokenProgramService.createAssociatedTokenAccount(
            payerAccount.publicKey,
            payerAccount.publicKey,
            new PublicKey(lpAddress)
          );
        transaction.add(createATAInstruction);
      }

      if (await SolanaService.isAddressAvailable(connection, userPoolAddress)) {
        const createUserPoolInstruction =
          SarosFarmInstructionService.createUserPoolInstruction(
            payerAccount.publicKey,
            poolAddress,
            userPoolAddress,
            userPoolNonce,
            sarosFarmProgramAddress
          );
        transaction.add(createUserPoolInstruction);
      }

      const stakePoolInstruction =
        SarosFarmInstructionService.stakePoolInstruction(
          poolAddress,
          pool.stakingTokenAccount,
          payerAccount.publicKey,
          userPoolAddress,
          userStakingTokenAddress,
          amount,
          sarosFarmProgramAddress
        );

      transaction.add(stakePoolInstruction);

      await Promise.all(
        rewards.map(async (reward) => {
          const { poolRewardAddress } = reward;
          await this.stakePoolReward(
            connection,
            payerAccount,
            poolAddress,
            new PublicKey(poolRewardAddress),
            sarosFarmProgramAddress,
            transaction
          );
        })
      );

      const tx = await connection.sendTransaction(transaction, [payerAccount]);

      return tx;
    } catch (err) {
      return `Transaction error ${JSON.stringify(err)}`;
    }
  }

  static async stakePoolReward(
    connection,
    payerAccount,
    poolAddress,
    poolRewardAddress,
    sarosFarmProgramAddress,
    transaction
  ) {
    const [userPoolAddress] = await this.findUserPoolAddress(
      payerAccount.publicKey,
      poolAddress,
      sarosFarmProgramAddress
    );
    const [userPoolRewardAddress, userPoolRewardNonce] =
      await this.findUserPoolRewardAddress(
        payerAccount.publicKey,
        poolRewardAddress,
        sarosFarmProgramAddress
      );

    if (
      await SolanaService.isAddressAvailable(connection, userPoolRewardAddress)
    ) {
      const createUserPoolRewardInstruction =
        SarosFarmInstructionService.createUserPoolRewardInstruction(
          payerAccount.publicKey,
          poolRewardAddress,
          userPoolRewardAddress,
          userPoolRewardNonce,
          sarosFarmProgramAddress
        );
      transaction.add(createUserPoolRewardInstruction);
    }

    const stakePoolRewardInstruction =
      SarosFarmInstructionService.stakePoolRewardInstruction(
        poolAddress,
        poolRewardAddress,
        payerAccount.publicKey,
        userPoolAddress,
        userPoolRewardAddress,
        sarosFarmProgramAddress
      );

    transaction.add(stakePoolRewardInstruction);

    return transaction;
  }

  static async unstakePool(
    connection,
    payerAccount,
    poolAddress,
    lpAddress,
    amount,
    sarosFarmProgramAddress,
    rewards = [],
    isMaxBalance
  ) {
    try {
      const userStakingTokenAddress =
        await TokenProgramService.findAssociatedTokenAddress(
          payerAccount.publicKey,
          lpAddress
        );

      const transaction = new Transaction();

      const pool = await this.getPoolData(connection, poolAddress);
      const [userPoolAddress] = await this.findUserPoolAddress(
        payerAccount.publicKey,
        poolAddress,
        sarosFarmProgramAddress
      );

      await Promise.all(
        rewards.map(async (reward) => {
          const { poolRewardAddress } = reward;

          await this.unstakePoolReward(
            connection,
            payerAccount,
            poolAddress,
            new PublicKey(poolRewardAddress),
            sarosFarmProgramAddress,
            transaction
          );
        })
      );

      const unstakePoolInstruction =
        SarosFarmInstructionService.unstakePoolInstruction(
          poolAddress,
          pool.authorityAddress,
          pool.stakingTokenAccount,
          payerAccount.publicKey,
          userPoolAddress,
          userStakingTokenAddress,
          amount,
          sarosFarmProgramAddress
        );

      transaction.add(unstakePoolInstruction);

      if (!isMaxBalance) {
        await Promise.all(
          rewards.map(async (reward) => {
            const { poolRewardAddress } = reward;
            await this.stakePoolReward(
              connection,
              payerAccount,
              poolAddress,
              new PublicKey(poolRewardAddress),
              sarosFarmProgramAddress,
              transaction
            );
          })
        );
      }

      const tx = await connection.sendTransaction(transaction, [payerAccount]);

      return `Your transaction hash: ${tx}`;
    } catch (err) {
      return `Transaction error ${JSON.stringify(err)}`;
    }
  }

  static async unstakePoolReward(
    connection,
    payerAccount,
    poolAddress,
    poolRewardAddress,
    sarosFarmProgramAddress,
    transaction
  ) {
    const [userPoolAddress] = await this.findUserPoolAddress(
      payerAccount.publicKey,
      poolAddress,
      sarosFarmProgramAddress
    );
    const [userPoolRewardAddress] = await this.findUserPoolRewardAddress(
      payerAccount.publicKey,
      poolRewardAddress,
      sarosFarmProgramAddress
    );

    const unstakePoolRewardInstruction =
      SarosFarmInstructionService.unstakePoolRewardInstruction(
        poolAddress,
        poolRewardAddress,
        payerAccount.publicKey,
        userPoolAddress,
        userPoolRewardAddress,
        sarosFarmProgramAddress
      );

    transaction.add(unstakePoolRewardInstruction);

    return transaction;
  }

  static async claimReward(
    connection,
    payerAccount,
    poolRewardAddress,
    sarosFarmProgramAddress,
    mintAddress
  ) {
    try {
      const userRewardTokenAddress =
        await TokenProgramService.findAssociatedTokenAddress(
          payerAccount.publicKey,
          mintAddress
        );

      const [userPoolRewardAddress] =
        await SarosStakeServices.findUserPoolRewardAddress(
          payerAccount.publicKey,
          poolRewardAddress,
          sarosFarmProgramAddress
        );

      const [poolRewardAuthorityAddress] =
        await this.findPoolRewardAuthorityAddress(
          poolRewardAddress,
          sarosFarmProgramAddress
        );

      const dataPoolReward = await SarosStakeServices.getPoolRewardData(
        connection,
        poolRewardAddress
      );

      const transaction = new Transaction();

      if (
        await SolanaService.isAddressAvailable(
          connection,
          userRewardTokenAddress
        )
      ) {
        const createATAInstruction =
          TokenProgramService.createAssociatedTokenAccount(
            payerAccount.publicKey,
            payerAccount.publicKey,
            mintAddress
          );
        transaction.add(createATAInstruction);
      }

      const claimRewardInstruction =
        SarosFarmInstructionService.claimRewardInstruction(
          poolRewardAddress,
          poolRewardAuthorityAddress,
          dataPoolReward.rewardTokenAccount,
          payerAccount.publicKey,
          userPoolRewardAddress,
          userRewardTokenAddress,
          sarosFarmProgramAddress
        );

      transaction.add(claimRewardInstruction);

      const tx = await connection.sendTransaction(transaction, [payerAccount]);
      console.log(`Your transaction hash: ${tx}`);
      return tx;
    } catch (err) {
      return `Transaction error ${JSON.stringify(err)}`;
    }
  }

  static async getPoolRewardData(connection, poolRewardAddress) {
    const accountInfo = await connection.getAccountInfo(poolRewardAddress);

    const data = SarosFarmInstructionService.decodePoolRewardAccount(
      accountInfo.data
    );
    const [authorityAddress] = await this.findPoolRewardAuthorityAddress(
      poolRewardAddress,
      accountInfo.owner
    );

    data.authorityAddress = authorityAddress;

    return data;
  }

  static async findUserPoolRewardAddress(
    ownerAddress,
    poolRewardAddress,
    sarosFarmProgramAddress
  ) {
    return PublicKey.findProgramAddress(
      [ownerAddress.toBytes(), poolRewardAddress.toBytes()],
      sarosFarmProgramAddress
    );
  }

  static async getPoolData(connection, poolAddress) {
    const accountInfo = await connection.getAccountInfo(poolAddress);
    const data = SarosFarmInstructionService.decodePoolAccount(
      accountInfo.data
    );
    const [authorityAddress] = await this.findPoolAuthorityAddress(
      poolAddress,
      accountInfo.owner
    );
    data.authorityAddress = authorityAddress;

    return data;
  }

  static async findUserPoolAddress(
    ownerAddress,
    poolAddress,
    sarosFarmProgramAddress
  ) {
    return PublicKey.findProgramAddress(
      [ownerAddress.toBytes(), poolAddress.toBytes()],
      sarosFarmProgramAddress
    );
  }

  static async findPoolRewardAuthorityAddress(
    poolRewardAddress,
    sarosFarmProgramAddress
  ) {
    return PublicKey.findProgramAddress(
      [Buffer.from('authority'), poolRewardAddress.toBytes()],
      sarosFarmProgramAddress
    );
  }

  static async findPoolAuthorityAddress(poolAddress, sarosFarmProgramAddress) {
    return PublicKey.findProgramAddress(
      [Buffer.from('authority'), poolAddress.toBytes()],
      sarosFarmProgramAddress
    );
  }

  static async getListPool({page, size}) {
    if (page === 0) return []

    try {
      const query = gql`
        {
          stakes {
            address
            poolAddress
            tokenId
            rewards {
              address
              id
              poolRewardAddress
              rewardPerBlock
            }
            startBlock
            endBlock
          }
        }
      `;

      const response = await gqlClient.request(query);
      const data = get(response, 'stakes', []).map((item) => ({
        ...item,
        lpAddress: get(item, 'address', ''),
      }));

      const limit = parseInt(size)
      const skip = parseInt(page - 1) * limit
      const listStake = data.slice(skip, skip + limit)

      const newListFarm = await Promise.all(
        listStake.map(async (item) => {
          const dataFarm = await SarosStakeServices.fetchDetailPoolFarm(item);
          return {
            ...item,
            ...dataFarm,
          };
        })
      );
      return newListFarm;
    } catch (err) {
      return `Get list stake error ${JSON.stringify(err)}`;
    }
  }

  static async calculateRewardOneYear(reward, connection) {
    const { poolRewardAddress, id } = reward;
    const dataPoolReward = await this.getPoolRewardData(
      connection,
      new PublicKey(poolRewardAddress)
    );
    const { rewardPerBlock } = dataPoolReward;
    const rewardPrice = await getPriceBaseId(id);
    const rewardOneYearUSD =
      BLOCKS_PER_YEAR * rewardPerBlock * parseFloat(rewardPrice);

    return rewardOneYearUSD;
  }

  static async fetchDetailPoolFarm(farmParam) {
    const connection = genConnectionSolana();
    const { tokenId, rewards, poolAddress } = farmParam;

    // Fetch pool data
    const dataPoolFarm = await SarosStakeServices.getPoolData(
      connection,
      new PublicKey(poolAddress)
    );
    const stakingTokenAccount = get(dataPoolFarm, 'stakingTokenAccount');
    const fetchInfoAccountPool = await connection.getTokenAccountBalance(
      stakingTokenAccount
    );
    const totalStaked = get(fetchInfoAccountPool.value, 'amount', 0);

    // Fetch pool liquidity info
    const stakingPrice = await getPriceBaseId(tokenId);

    const rewardOneYearUSD = await Promise.all(
      rewards.map(
        async (reward) => await this.calculateRewardOneYear(reward, connection)
      )
    );

    const totalRewardOneYearUSD = rewardOneYearUSD.reduce((total, curr) => {
      total += curr;
      return total;
    }, 0);

    const liquidityUsd = stakingPrice * totalStaked;

    const apr = (totalRewardOneYearUSD / liquidityUsd) * 100;
    return {
      ...farmParam,
      liquidityUsd,
      apr,
    };
  }

  static async fetchInfoPoolLpAddress(poolAddress, connection) {
    const newPoolAccountInfo = await getPoolInfo(
      connection,
      new PublicKey(poolAddress)
    );

    const newPoolToken0AccountInfo =
      await TokenProgramService.getTokenAccountInfo(
        connection,
        newPoolAccountInfo.token0Account
      );

    newPoolToken0AccountInfo.amount = newPoolToken0AccountInfo.amount
      ? parseFloat(newPoolToken0AccountInfo.amount.toString())
      : 0;

    const newPoolToken1AccountInfo =
      await TokenProgramService.getTokenAccountInfo(
        connection,
        newPoolAccountInfo.token1Account
      );

    newPoolToken1AccountInfo.amount = newPoolToken1AccountInfo.amount
      ? parseFloat(newPoolToken1AccountInfo.amount.toString())
      : 0;

    const amountToken0InPool = parseFloat(newPoolToken0AccountInfo.amount);
    const amountToken1InPool = parseFloat(newPoolToken1AccountInfo.amount);

    return {
      amountToken0InPool,
      amountToken1InPool,
    };
  }
}
