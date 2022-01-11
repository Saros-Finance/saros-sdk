/* eslint-disable no-undef */
import { SHA256 } from 'crypto-js'

export class HashService {
  static sha256 (message) {
    return Buffer.from(SHA256(message).toString(), 'hex')
  }
}
