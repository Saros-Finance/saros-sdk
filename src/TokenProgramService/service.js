import { Transaction, PublicKey } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '../constants';
import { SolanaService } from '../SolanaService';
import { TokenProgramInstructionService } from './intructions';

export class TokenProgramService {
  static async getTokenMintInfo (connection, address) {
    const accountInfo = await connection.getAccountInfo(address)
    if (accountInfo && accountInfo.data) {
      const data = TokenProgramInstructionService.decodeTokenMintInfo(
        accountInfo.data
      )
      data.address = address
      return data
    }
    return ''
  }
  
  static async createAssociatedTokenAccount(
    connection,
    payerAccount,
    ownerAddress,
    tokenMintAddress
  ) {
    const tokenAccountAddress =
      await TokenProgramService.findAssociatedTokenAddress(
        ownerAddress,
        tokenMintAddress
      );
    if (await SolanaService.isAddressInUse(connection, tokenAccountAddress)) {
      console.log(
        `SKIPPED: Associated Token Account ${tokenAccountAddress.toBase58()} of Account ${ownerAddress.toBase58()} is already existed`,
        '\n'
      );
      return tokenAccountAddress;
    }

    const transaction = new Transaction();

    const createATAInstruction =
      await TokenProgramInstructionService.createAssociatedTokenAccount(
        payerAccount.publicKey,
        ownerAddress,
        tokenMintAddress
      );
    transaction.add(createATAInstruction);

    return tokenAccountAddress;
  }

  static async findAssociatedTokenAddress(walletAddress, tokenMintAddress) {
    const [address] = await PublicKey.findProgramAddress(
      [
        walletAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
    );
    return address || '';
  }

  static async getTokenAccountInfo(connection, address) {
    const accountInfo = await connection.getAccountInfo(address);
    const data = TokenProgramInstructionService.decodeTokenAccountInfo(
      accountInfo.data
    );
    data.address = address;
    return data;
  }
}
