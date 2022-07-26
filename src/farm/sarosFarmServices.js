/* eslint-disable no-undef */
import { PublicKey, Transaction } from '@solana/web3.js';
import { SolanaService } from '../SolanaService';
import { TokenProgramService } from '../TokenProgramService';
import { SarosFarmInstructionService } from './sarosFarmServiceIntructions';
import { BLOCKS_PER_YEAR, getPriceBaseId } from '../functions';
import { getPoolInfo } from '../swap/sarosSwapServices';
import { genConnectionSolana } from '../common';
import { get } from 'lodash';
import { GraphQLClient, gql } from 'graphql-request';

const gqlClient = new GraphQLClient('https://graphql.saros.finance/');

export class SarosFarmService {
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
        await SarosFarmService.findUserPoolRewardAddress(
          payerAccount.publicKey,
          poolRewardAddress,
          sarosFarmProgramAddress
        );

      const [poolRewardAuthorityAddress] =
        await this.findPoolRewardAuthorityAddress(
          poolRewardAddress,
          sarosFarmProgramAddress
        );

      const dataPoolReward = await SarosFarmService.getPoolRewardData(
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

  static async getListPoolLiquidity() {
    try {
      const query = gql`
        {
          pairs {
            id
            fee24h
            feeAPR
          }
        }
      `;

      const response = await gqlClient.request(query);
      return get(response, 'data.pairs', []);
    } catch (err) {
      return [];
    }
  }

  static async getListPool({ page, size }) {
    if (page === 0) return [];

    try {
      const query = gql`
        {
          farms {
            lpAddress
            poolLpAddress
            poolAddress
            token0
            token1
            token0Id
            token1Id
            rewards {
              address
              poolRewardAddress
              rewardPerBlock
            }
            startBlock
            endBlock
          }
        }
      `;
      const listPoolLiquidity = await this.getListPoolLiquidity();
      const response = await gqlClient.request(query);
      const data = get(response, 'farms', []);

      const limit = parseInt(size);
      const skip = parseInt(page - 1) * limit;
      const listFarm = data.slice(skip, skip + limit);

      const newListFarm = await Promise.all(
        listFarm.map(async (item) => {
          const dataFarm = SarosFarmService.fetchDetailPoolFarm(item);
          const infoLiquidity = listPoolLiquidity.find(
            (liquidity) => item.lpAddress === liquidity.id
          );
          return {
            ...item,
            ...dataFarm,
            fee24h: get(infoLiquidity, 'fee24h'),
            feeAPR: get(infoLiquidity, 'feeAPR'),
          };
        })
      );
      return newListFarm;
    } catch (err) {
      return `Get list farm error ${JSON.stringify(err)}`;
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
    const {
      poolLpAddress,
      token0Id,
      token1Id,
      rewards,
      lpAddress,
      poolAddress,
    } = farmParam;

    // Fetch pool data
    const dataPoolFarm = await SarosFarmService.getPoolData(
      connection,
      new PublicKey(poolAddress)
    );
    const stakingTokenAccount = get(dataPoolFarm, 'stakingTokenAccount');
    const fetchInfoAccountPool = await connection.getTokenAccountBalance(
      stakingTokenAccount
    );
    const totalStaked = get(fetchInfoAccountPool.value, 'amount', 0);

    // Fetch pool liquidity info
    const dataPoolInfo = await this.fetchInfoPoolLpAddress(
      poolLpAddress,
      connection
    );
    const amountToken0InPool = get(dataPoolInfo, 'amountToken0InPool', 0);
    const amountToken1InPool = get(dataPoolInfo, 'amountToken1InPool', 0);

    const toke0Price = await getPriceBaseId(token0Id);
    const toke1Price = await getPriceBaseId(token1Id);

    const totalPriceToken =
      amountToken0InPool * toke0Price + amountToken1InPool * toke1Price;
    const rewardOneYearUSD = await Promise.all(
      rewards.map(
        async (reward) => await this.calculateRewardOneYear(reward, connection)
      )
    );

    const totalRewardOneYearUSD = rewardOneYearUSD.reduce((total, curr) => {
      total += curr;
      return total;
    }, 0);

    const lpInfo = await TokenProgramService.getTokenMintInfo(
      connection,
      new PublicKey(lpAddress)
    );

    const totalSupplyLP = parseFloat(lpInfo.supply.toString());
    const priceLp = totalPriceToken / totalSupplyLP;
    const liquidityUsd = priceLp * totalStaked;

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
