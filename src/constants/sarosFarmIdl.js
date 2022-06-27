export const SarosFarmIdl = {
  version: '0.1.0',
  name: 'saros_farm',
  instructions: [
    {
      name: 'createPool',
      accounts: [
        {
          name: 'root',
          isMut: true,
          isSigner: true
        },
        {
          name: 'pool',
          isMut: true,
          isSigner: false
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: 'poolPath',
          type: 'bytes'
        },
        {
          name: 'poolNonce',
          type: 'u8'
        },
        {
          name: 'poolAuthorityNonce',
          type: 'u8'
        },
        {
          name: 'stakingTokenMint',
          type: 'publicKey'
        }
      ]
    },
    {
      name: 'createPoolReward',
      accounts: [
        {
          name: 'root',
          isMut: true,
          isSigner: true
        },
        {
          name: 'pool',
          isMut: false,
          isSigner: false
        },
        {
          name: 'poolReward',
          isMut: true,
          isSigner: false
        },
        {
          name: 'rootRewardTokenAccount',
          isMut: true,
          isSigner: false
        },
        {
          name: 'poolRewardTokenAccount',
          isMut: true,
          isSigner: false
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: 'poolRewardNonce',
          type: 'u8'
        },
        {
          name: 'poolRewardAuthorityNonce',
          type: 'u8'
        },
        {
          name: 'rewardTokenMint',
          type: 'publicKey'
        },
        {
          name: 'rewardPerBlock',
          type: 'u128'
        },
        {
          name: 'rewardStartBlock',
          type: 'u64'
        },
        {
          name: 'rewardEndBlock',
          type: 'u64'
        }
      ]
    },
    {
      name: 'setPausePool',
      accounts: [
        {
          name: 'root',
          isMut: true,
          isSigner: true
        },
        {
          name: 'pool',
          isMut: true,
          isSigner: false
        }
      ],
      args: [
        {
          name: 'isPause',
          type: 'bool'
        }
      ]
    },
    {
      name: 'setPauseRewardPool',
      accounts: [
        {
          name: 'root',
          isMut: true,
          isSigner: true
        },
        {
          name: 'poolReward',
          isMut: true,
          isSigner: false
        }
      ],
      args: [
        {
          name: 'isPause',
          type: 'bool'
        }
      ]
    },
    {
      name: 'createUserPool',
      accounts: [
        {
          name: 'user',
          isMut: true,
          isSigner: true
        },
        {
          name: 'pool',
          isMut: false,
          isSigner: false
        },
        {
          name: 'userPool',
          isMut: true,
          isSigner: false
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: 'userPoolNonce',
          type: 'u8'
        }
      ]
    },
    {
      name: 'createUserPoolReward',
      accounts: [
        {
          name: 'user',
          isMut: true,
          isSigner: true
        },
        {
          name: 'poolReward',
          isMut: false,
          isSigner: false
        },
        {
          name: 'userPoolReward',
          isMut: true,
          isSigner: false
        },
        {
          name: 'systemProgram',
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: 'userPoolRewardNonce',
          type: 'u8'
        }
      ]
    },
    {
      name: 'stakePool',
      accounts: [
        {
          name: 'pool',
          isMut: true,
          isSigner: false
        },
        {
          name: 'poolStakingTokenAccount',
          isMut: true,
          isSigner: false
        },
        {
          name: 'user',
          isMut: false,
          isSigner: true
        },
        {
          name: 'userPool',
          isMut: true,
          isSigner: false
        },
        {
          name: 'userStakingTokenAccount',
          isMut: true,
          isSigner: false
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: 'amount',
          type: 'u64'
        }
      ]
    },
    {
      name: 'stakePoolReward',
      accounts: [
        {
          name: 'pool',
          isMut: false,
          isSigner: false
        },
        {
          name: 'poolReward',
          isMut: true,
          isSigner: false
        },
        {
          name: 'user',
          isMut: false,
          isSigner: true
        },
        {
          name: 'userPool',
          isMut: true,
          isSigner: false
        },
        {
          name: 'userPoolReward',
          isMut: true,
          isSigner: false
        }
      ],
      args: []
    },
    {
      name: 'unstakePoolReward',
      accounts: [
        {
          name: 'pool',
          isMut: false,
          isSigner: false
        },
        {
          name: 'poolReward',
          isMut: true,
          isSigner: false
        },
        {
          name: 'user',
          isMut: false,
          isSigner: true
        },
        {
          name: 'userPool',
          isMut: true,
          isSigner: false
        },
        {
          name: 'userPoolReward',
          isMut: true,
          isSigner: false
        }
      ],
      args: []
    },
    {
      name: 'claimReward',
      accounts: [
        {
          name: 'poolReward',
          isMut: true,
          isSigner: false
        },
        {
          name: 'poolRewardAuthority',
          isMut: false,
          isSigner: false
        },
        {
          name: 'poolRewardTokenAccount',
          isMut: true,
          isSigner: false
        },
        {
          name: 'user',
          isMut: false,
          isSigner: true
        },
        {
          name: 'userPoolReward',
          isMut: true,
          isSigner: false
        },
        {
          name: 'userRewardTokenAccount',
          isMut: true,
          isSigner: false
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false
        }
      ],
      args: []
    },
    {
      name: 'unstakePool',
      accounts: [
        {
          name: 'pool',
          isMut: true,
          isSigner: false
        },
        {
          name: 'poolAuthority',
          isMut: false,
          isSigner: false
        },
        {
          name: 'poolStakingTokenAccount',
          isMut: true,
          isSigner: false
        },
        {
          name: 'user',
          isMut: false,
          isSigner: true
        },
        {
          name: 'userPool',
          isMut: true,
          isSigner: false
        },
        {
          name: 'userStakingTokenAccount',
          isMut: true,
          isSigner: false
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: 'amount',
          type: 'u64'
        }
      ]
    },
    {
      name: 'updatePoolRewardParams',
      accounts: [
        {
          name: 'root',
          isMut: false,
          isSigner: true
        },
        {
          name: 'poolReward',
          isMut: true,
          isSigner: false
        },
        {
          name: 'rootRewardTokenAccount',
          isMut: true,
          isSigner: false
        },
        {
          name: 'poolRewardTokenAccount',
          isMut: true,
          isSigner: false
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: 'newRewardPerBlock',
          type: 'u128'
        },
        {
          name: 'newStartBlock',
          type: 'u64'
        },
        {
          name: 'newEndBlock',
          type: 'u64'
        }
      ]
    },
    {
      name: 'withdrawRewardToken',
      accounts: [
        {
          name: 'root',
          isMut: false,
          isSigner: true
        },
        {
          name: 'poolReward',
          isMut: false,
          isSigner: false
        },
        {
          name: 'authority',
          isMut: false,
          isSigner: false
        },
        {
          name: 'from',
          isMut: true,
          isSigner: false
        },
        {
          name: 'to',
          isMut: true,
          isSigner: false
        },
        {
          name: 'tokenProgram',
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: 'amount',
          type: 'u64'
        }
      ]
    }
  ],
  accounts: [
    {
      name: 'Pool',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'nonce',
            type: 'u8'
          },
          {
            name: 'authorityNonce',
            type: 'u8'
          },
          {
            name: 'stakingTokenMint',
            type: 'publicKey'
          },
          {
            name: 'stakingTokenAccount',
            type: 'publicKey'
          },
          {
            name: 'state',
            type: {
              defined: 'PoolState'
            }
          }
        ]
      }
    },
    {
      name: 'PoolReward',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'nonce',
            type: 'u8'
          },
          {
            name: 'authorityNonce',
            type: 'u8'
          },
          {
            name: 'rewardTokenMint',
            type: 'publicKey'
          },
          {
            name: 'rewardTokenAccount',
            type: 'publicKey'
          },
          {
            name: 'rewardPerBlock',
            type: 'u128'
          },
          {
            name: 'rewardEndBlock',
            type: 'u64'
          },
          {
            name: 'totalShares',
            type: 'u64'
          },
          {
            name: 'accumulatedRewardPerShare',
            type: 'u128'
          },
          {
            name: 'lastUpdatedBlock',
            type: 'u64'
          },
          {
            name: 'totalClaimed',
            type: 'u64'
          },
          {
            name: 'state',
            type: {
              defined: 'PoolState'
            }
          }
        ]
      }
    },
    {
      name: 'UserPool',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'nonce',
            type: 'u8'
          },
          {
            name: 'amount',
            type: 'u64'
          },
          {
            name: 'totalStaked',
            type: 'u64'
          }
        ]
      }
    },
    {
      name: 'UserPoolReward',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'nonce',
            type: 'u8'
          },
          {
            name: 'amount',
            type: 'u64'
          },
          {
            name: 'rewardDebt',
            type: 'u64'
          },
          {
            name: 'rewardPending',
            type: 'u64'
          }
        ]
      }
    }
  ],
  types: [
    {
      name: 'TransferTokenParams',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'instruction',
            type: 'u8'
          },
          {
            name: 'amount',
            type: 'u64'
          }
        ]
      }
    },
    {
      name: 'PoolState',
      type: {
        kind: 'enum',
        variants: [
          {
            name: 'Paused'
          },
          {
            name: 'Unpaused'
          }
        ]
      }
    }
  ],
  events: [
    {
      name: 'SetPausePoolEvent',
      fields: [
        {
          name: 'isPause',
          type: 'bool',
          index: false
        }
      ]
    },
    {
      name: 'SetPauseRewardPoolEvent',
      fields: [
        {
          name: 'isPause',
          type: 'bool',
          index: false
        }
      ]
    },
    {
      name: 'UpdatePoolRewardParamsEvent',
      fields: [
        {
          name: 'newRewardPerBlock',
          type: 'u128',
          index: false
        },
        {
          name: 'newStartBlock',
          type: 'u64',
          index: false
        },
        {
          name: 'newEndBlock',
          type: 'u64',
          index: false
        }
      ]
    },
    {
      name: 'WithdrawRewardTokenEvent',
      fields: [
        {
          name: 'amount',
          type: 'u64',
          index: false
        }
      ]
    }
  ],
  errors: [
    {
      code: 6000,
      name: 'InvalidOwner',
      msg: 'SarosFarm: Not an owner.'
    },
    {
      code: 6001,
      name: 'InvalidPoolLpTokenAccount',
      msg: 'SarosFarm: Invalid pool LP token account.'
    },
    {
      code: 6002,
      name: 'InvalidPoolRewardTokenAccount',
      msg: 'SarosFarm: Invalid reward token account.'
    },
    {
      code: 6003,
      name: 'InvalidWithdrawAmount',
      msg: 'SarosFarm: Invalid withdraw amount.'
    },
    {
      code: 6004,
      name: 'CantWithdrawNow',
      msg: 'SarosFarm: Cannot withdraw now.'
    },
    {
      code: 6005,
      name: 'TimeOverlap',
      msg: 'SarosFarm: Time overlap.'
    },
    {
      code: 6006,
      name: 'PoolWasPaused',
      msg: 'SarosFarm: Pool was paused.'
    },
    {
      code: 6007,
      name: 'UninitializedAccount',
      msg: 'SarosFarm: Uninitialized account.'
    }
  ]
}
