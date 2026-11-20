/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/asset_controller.json`.
 */
export type AssetController = {
  "address": "7tXjmbkZVY3Gmg9kDBebcNXT1yC5pyoxxXVLwdbv9tvP",
  "metadata": {
    "name": "assetController",
    "version": "0.0.1",
    "spec": "0.1.0",
    "description": "The Asset Controller Program (ACP) enables core asset management functionality for newly issued assets, including transfer controls and transaction privacy."
  },
  "instructions": [
    {
      "name": "cancelPending",
      "discriminator": [
        74,
        87,
        109,
        242,
        64,
        192,
        151,
        71
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "assetController"
          ]
        },
        {
          "name": "assetMint",
          "relations": [
            "assetController",
            "pendingOperation"
          ]
        },
        {
          "name": "assetController",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "rentPayer",
          "writable": true
        },
        {
          "name": "pendingOperation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112,
                  101,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "assetMint"
              },
              {
                "kind": "account",
                "path": "pendingOperation.id",
                "account": "pendingOperation"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "createAssetController",
      "docs": [
        "create an rwa asset"
      ],
      "discriminator": [
        97,
        185,
        6,
        250,
        248,
        242,
        68,
        105
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority"
        },
        {
          "name": "assetController",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "assetMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "extraMetasAccount",
          "writable": true
        },
        {
          "name": "policyEngineAccount",
          "writable": true
        },
        {
          "name": "identityRegistryAccount",
          "writable": true
        },
        {
          "name": "policyEngine",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "identityRegistry",
          "address": "GZsnjqT3c5zbHqsctrJ4EG4rbEfo7ZXyyUG7aDJNmxfA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "createAssetControllerArgs"
            }
          }
        }
      ]
    },
    {
      "name": "disableMemoTransfer",
      "docs": [
        "memo transfer disable"
      ],
      "discriminator": [
        68,
        156,
        197,
        9,
        43,
        91,
        114,
        19
      ],
      "accounts": [
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "assetController",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "enableMemoTransfer",
      "docs": [
        "memo transfer enable"
      ],
      "discriminator": [
        186,
        78,
        97,
        172,
        71,
        172,
        99,
        0
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "signer": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "assetController",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "tokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "executePending",
      "discriminator": [
        207,
        36,
        5,
        220,
        230,
        106,
        57,
        181
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "assetController"
          ]
        },
        {
          "name": "assetMint",
          "writable": true,
          "relations": [
            "assetController",
            "identityRegistry",
            "trackerAccount",
            "policyEngine"
          ]
        },
        {
          "name": "assetController",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "wallet"
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "identityRegistry",
          "relations": [
            "identityAccount"
          ]
        },
        {
          "name": "identityAccount",
          "relations": [
            "trackerAccount",
            "walletIdentityAccount"
          ]
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "walletIdentityAccount"
        },
        {
          "name": "rentPayer",
          "writable": true
        },
        {
          "name": "pendingOperation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112,
                  101,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "assetMint"
              },
              {
                "kind": "account",
                "path": "pendingOperation.id",
                "account": "pendingOperation"
              }
            ]
          }
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "expirePending",
      "discriminator": [
        70,
        169,
        9,
        55,
        182,
        166,
        196,
        204
      ],
      "accounts": [
        {
          "name": "rentPayer",
          "writable": true
        },
        {
          "name": "pendingOperation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112,
                  101,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "pendingOperation.assetMint",
                "account": "pendingOperation"
              },
              {
                "kind": "account",
                "path": "pendingOperation.id",
                "account": "pendingOperation"
              }
            ]
          }
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "freezeTokenAccount",
      "docs": [
        "freeze token account"
      ],
      "discriminator": [
        138,
        168,
        178,
        109,
        205,
        224,
        209,
        93
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "assetController",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "issueTokens",
      "docs": [
        "issue shares of the rwa asset"
      ],
      "discriminator": [
        40,
        207,
        145,
        106,
        249,
        54,
        23,
        179
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "assetController"
          ]
        },
        {
          "name": "assetMint",
          "writable": true,
          "relations": [
            "assetController",
            "identityRegistry",
            "trackerAccount",
            "policyEngine"
          ]
        },
        {
          "name": "assetController",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "to"
        },
        {
          "name": "tokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "to"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "identityRegistry",
          "relations": [
            "identityAccount"
          ]
        },
        {
          "name": "identityAccount",
          "relations": [
            "trackerAccount",
            "walletIdentityAccount"
          ]
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "walletIdentityAccount"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "issuanceTimestamp",
          "type": "i64"
        }
      ]
    },
    {
      "name": "migrateAssetController",
      "discriminator": [
        96,
        118,
        61,
        174,
        136,
        235,
        144,
        68
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "assetController"
          ]
        },
        {
          "name": "assetMint",
          "relations": [
            "assetController"
          ]
        },
        {
          "name": "assetController",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "proposeBurn",
      "discriminator": [
        107,
        126,
        69,
        98,
        100,
        37,
        148,
        192
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "assetController"
          ]
        },
        {
          "name": "assetMint",
          "relations": [
            "assetController",
            "identityRegistry"
          ]
        },
        {
          "name": "assetController",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "wallet"
        },
        {
          "name": "tokenAccount"
        },
        {
          "name": "identityRegistry",
          "relations": [
            "identityAccount"
          ]
        },
        {
          "name": "identityAccount",
          "relations": [
            "walletIdentityAccount"
          ]
        },
        {
          "name": "walletIdentityAccount"
        },
        {
          "name": "pendingOperation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112,
                  101,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "assetMint"
              },
              {
                "kind": "arg",
                "path": "request.id"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "request",
          "type": {
            "defined": {
              "name": "burnRequest"
            }
          }
        }
      ]
    },
    {
      "name": "proposeMint",
      "discriminator": [
        57,
        216,
        81,
        105,
        92,
        217,
        84,
        128
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "assetController"
          ]
        },
        {
          "name": "assetMint",
          "relations": [
            "assetController",
            "identityRegistry"
          ]
        },
        {
          "name": "assetController",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "wallet"
        },
        {
          "name": "tokenAccount"
        },
        {
          "name": "identityRegistry",
          "relations": [
            "identityAccount"
          ]
        },
        {
          "name": "identityAccount",
          "relations": [
            "walletIdentityAccount"
          ]
        },
        {
          "name": "walletIdentityAccount"
        },
        {
          "name": "pendingOperation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112,
                  101,
                  114,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "assetMint"
              },
              {
                "kind": "arg",
                "path": "request.id"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "request",
          "type": {
            "defined": {
              "name": "mintRequest"
            }
          }
        }
      ]
    },
    {
      "name": "revokeTokens",
      "docs": [
        "revoke shares of the rwa asset"
      ],
      "discriminator": [
        215,
        42,
        15,
        134,
        173,
        80,
        33,
        21
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "assetController"
          ]
        },
        {
          "name": "assetMint",
          "writable": true,
          "relations": [
            "assetController",
            "identityRegistry",
            "trackerAccount"
          ]
        },
        {
          "name": "assetController",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "revokeTokenAccount",
          "writable": true
        },
        {
          "name": "identityRegistry",
          "relations": [
            "identityAccount"
          ]
        },
        {
          "name": "identityAccount",
          "relations": [
            "trackerAccount",
            "walletIdentityAccount"
          ]
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "walletIdentityAccount"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "reason",
          "type": "string"
        }
      ]
    },
    {
      "name": "seizeTokens",
      "docs": [
        "seize shares of the rwa asset"
      ],
      "discriminator": [
        79,
        30,
        69,
        54,
        78,
        1,
        16,
        23
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "assetController",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "destinationTokenAccount",
          "writable": true
        },
        {
          "name": "sourceTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "reason",
          "type": "string"
        }
      ]
    },
    {
      "name": "setCapsConfig",
      "discriminator": [
        216,
        4,
        112,
        211,
        176,
        17,
        227,
        229
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "assetController"
          ]
        },
        {
          "name": "assetMint",
          "relations": [
            "assetController"
          ]
        },
        {
          "name": "assetController",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "caps",
          "type": {
            "defined": {
              "name": "capsConfig"
            }
          }
        }
      ]
    },
    {
      "name": "setThrottleConfig",
      "discriminator": [
        174,
        119,
        174,
        249,
        71,
        43,
        246,
        174
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "assetController"
          ]
        },
        {
          "name": "assetMint",
          "relations": [
            "assetController"
          ]
        },
        {
          "name": "assetController",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "throttle",
          "type": {
            "defined": {
              "name": "throttleConfig"
            }
          }
        }
      ]
    },
    {
      "name": "thawTokenAccount",
      "docs": [
        "thaw token account"
      ],
      "discriminator": [
        199,
        172,
        96,
        93,
        244,
        252,
        137,
        171
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "assetController",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": []
    },
    {
      "name": "updateMetadata",
      "docs": [
        "edit metadata of the rwa asset"
      ],
      "discriminator": [
        170,
        182,
        43,
        239,
        97,
        78,
        225,
        186
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "assetMint",
          "writable": true
        },
        {
          "name": "assetController",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "updateAssetMetadataArgs"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "assetControllerAccount",
      "discriminator": [
        70,
        136,
        149,
        138,
        12,
        87,
        52,
        105
      ]
    },
    {
      "name": "pendingOperation",
      "discriminator": [
        124,
        146,
        84,
        123,
        121,
        210,
        217,
        118
      ]
    }
  ],
  "events": [
    {
      "name": "assetControllerMigrated",
      "discriminator": [
        98,
        46,
        167,
        50,
        30,
        181,
        16,
        139
      ]
    },
    {
      "name": "assetMetadataEvent",
      "discriminator": [
        90,
        19,
        200,
        229,
        103,
        82,
        218,
        16
      ]
    },
    {
      "name": "burnEvent",
      "discriminator": [
        33,
        89,
        47,
        117,
        82,
        124,
        238,
        250
      ]
    },
    {
      "name": "capsUpdated",
      "discriminator": [
        147,
        181,
        117,
        249,
        72,
        147,
        156,
        255
      ]
    },
    {
      "name": "extensionMetadataEvent",
      "discriminator": [
        22,
        198,
        253,
        69,
        234,
        122,
        248,
        117
      ]
    },
    {
      "name": "issueEvent",
      "discriminator": [
        220,
        74,
        136,
        189,
        186,
        247,
        253,
        140
      ]
    },
    {
      "name": "operationCancelled",
      "discriminator": [
        35,
        79,
        124,
        242,
        195,
        248,
        114,
        0
      ]
    },
    {
      "name": "operationExecuted",
      "discriminator": [
        205,
        223,
        227,
        106,
        178,
        86,
        163,
        162
      ]
    },
    {
      "name": "operationExpired",
      "discriminator": [
        105,
        3,
        61,
        154,
        56,
        106,
        8,
        244
      ]
    },
    {
      "name": "operationProposed",
      "discriminator": [
        252,
        68,
        199,
        155,
        10,
        17,
        178,
        206
      ]
    },
    {
      "name": "revokeEvent",
      "discriminator": [
        87,
        202,
        67,
        213,
        43,
        84,
        177,
        3
      ]
    },
    {
      "name": "seizeEvent",
      "discriminator": [
        100,
        186,
        127,
        43,
        145,
        98,
        208,
        78
      ]
    },
    {
      "name": "throttleUpdated",
      "discriminator": [
        210,
        7,
        158,
        29,
        147,
        253,
        143,
        139
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "transferMintNotApproved",
      "msg": "Transfer hasnt been approved for the asset mint"
    },
    {
      "code": 6001,
      "name": "transferFromNotApproved",
      "msg": "Transfer hasnt been approved for from account"
    },
    {
      "code": 6002,
      "name": "transferToNotApproved",
      "msg": "Transfer hasnt been approved for to account"
    },
    {
      "code": 6003,
      "name": "transferAmountNotApproved",
      "msg": "Transfer hasnt been approved for the specified amount"
    },
    {
      "code": 6004,
      "name": "invalidPolicyAccount",
      "msg": "Invalid policy account passed"
    },
    {
      "code": 6005,
      "name": "transferSlotNotApproved",
      "msg": "Invalid slot for approve account"
    },
    {
      "code": 6006,
      "name": "transferHistoryFull",
      "msg": "Transfer history is full"
    },
    {
      "code": 6007,
      "name": "unauthorized",
      "msg": "Unauthorized"
    },
    {
      "code": 6008,
      "name": "invalidPdaPassedIn",
      "msg": "Pda passed in for transfer is wrong"
    },
    {
      "code": 6009,
      "name": "tokenAccountNotInitialized",
      "msg": "Token account is not initialized"
    },
    {
      "code": 6010,
      "name": "tokenAccountAlreadyInitialized",
      "msg": "Token account is already initialized"
    },
    {
      "code": 6011,
      "name": "invalidIdentityAccounts",
      "msg": "Invalid identity accounts"
    },
    {
      "code": 6012,
      "name": "invalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 6013,
      "name": "invalidMintControlsConfig",
      "msg": "Invalid mint controls configuration"
    },
    {
      "code": 6014,
      "name": "mintControlsUnchanged",
      "msg": "Mint controls configuration is unchanged"
    },
    {
      "code": 6015,
      "name": "mintControlsDisabled",
      "msg": "Mint controls are disabled"
    },
    {
      "code": 6016,
      "name": "operationCapExceeded",
      "msg": "Amount exceeds the single-operation ceiling"
    },
    {
      "code": 6017,
      "name": "windowCapExceeded",
      "msg": "Amount exceeds the cumulative window cap"
    },
    {
      "code": 6018,
      "name": "amountRequiresTimelock",
      "msg": "Operation amount requires a timelock"
    },
    {
      "code": 6019,
      "name": "amountDoesNotRequireTimelock",
      "msg": "Operation amount does not require a timelock"
    },
    {
      "code": 6020,
      "name": "invalidOperationAmount",
      "msg": "Pending operation amount must be positive"
    },
    {
      "code": 6021,
      "name": "mintControlsArithmeticOverflow",
      "msg": "Mint controls arithmetic overflow"
    },
    {
      "code": 6022,
      "name": "pendingOperationNotEffective",
      "msg": "Pending operation is not yet effective"
    },
    {
      "code": 6023,
      "name": "pendingOperationExpired",
      "msg": "Pending operation has expired"
    },
    {
      "code": 6024,
      "name": "pendingOperationNotExpired",
      "msg": "Pending operation has not expired"
    },
    {
      "code": 6025,
      "name": "invalidPendingOperation",
      "msg": "Pending operation does not match the requested operation"
    },
    {
      "code": 6026,
      "name": "invalidLegacyAssetController",
      "msg": "Invalid legacy asset controller"
    },
    {
      "code": 6027,
      "name": "burnReasonTooLong",
      "msg": "Burn reason exceeds 256 UTF-8 bytes"
    },
    {
      "code": 6028,
      "name": "assetControllerMigrationRequired",
      "msg": "Migrate the asset controller to V2 before using mint/burn controls"
    }
  ],
  "types": [
    {
      "name": "assetControllerAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "assetMint",
            "docs": [
              "mint pubkey"
            ],
            "type": "pubkey"
          },
          {
            "name": "authority",
            "docs": [
              "authority has the ability to seize, freeze token accounts, etc."
            ],
            "type": "pubkey"
          },
          {
            "name": "caps",
            "type": {
              "defined": {
                "name": "capsConfig"
              }
            }
          },
          {
            "name": "throttle",
            "type": {
              "defined": {
                "name": "throttleConfig"
              }
            }
          },
          {
            "name": "state",
            "type": {
              "defined": {
                "name": "throttleState"
              }
            }
          }
        ]
      }
    },
    {
      "name": "assetControllerMigrated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "version",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "assetMetadataEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "string"
          },
          {
            "name": "name",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "symbol",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "uri",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "decimals",
            "type": {
              "option": "u8"
            }
          }
        ]
      }
    },
    {
      "name": "burnEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "reason",
            "type": "string"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "burnRequest",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "reason",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "capsConfig",
      "docs": [
        "Single-instruction ceilings in base units. Zero disables the corresponding cap."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "maxMintPerTx",
            "type": "u64"
          },
          {
            "name": "maxBurnPerTx",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "capsUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "caps",
            "type": {
              "defined": {
                "name": "capsConfig"
              }
            }
          }
        ]
      }
    },
    {
      "name": "counter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "value",
            "type": "u64"
          },
          {
            "name": "id",
            "type": "u8"
          },
          {
            "name": "identityFilter",
            "type": {
              "defined": {
                "name": "identityFilter"
              }
            }
          }
        ]
      }
    },
    {
      "name": "counterLimit",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "holdersLimit",
            "fields": [
              {
                "name": "max",
                "type": "u64"
              },
              {
                "name": "min",
                "type": "u64"
              },
              {
                "name": "counterId",
                "type": "u8"
              }
            ]
          },
          {
            "name": "groupedHoldersLimit",
            "fields": [
              {
                "name": "max",
                "type": "u64"
              },
              {
                "name": "min",
                "type": "u64"
              },
              {
                "name": "counters",
                "type": "bytes"
              }
            ]
          },
          {
            "name": "percentageLimit",
            "fields": [
              {
                "name": "higherCounterId",
                "type": "u8"
              },
              {
                "name": "lowerCounterId",
                "type": "u8"
              },
              {
                "name": "minPercentage",
                "type": "u8"
              },
              {
                "name": "maxPercentage",
                "type": "u8"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "createAssetControllerArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "extensionMetadataEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "address",
            "type": "string"
          },
          {
            "name": "extensionType",
            "type": "u8"
          },
          {
            "name": "metadata",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "filterComparison",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "or"
          },
          {
            "name": "and"
          }
        ]
      }
    },
    {
      "name": "filterData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "level",
            "type": {
              "defined": {
                "name": "filterLevel"
              }
            }
          },
          {
            "name": "target",
            "type": {
              "defined": {
                "name": "filterTarget"
              }
            }
          },
          {
            "name": "mode",
            "type": {
              "defined": {
                "name": "filterMode"
              }
            }
          }
        ]
      }
    },
    {
      "name": "filterInner",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "single",
            "fields": [
              {
                "defined": {
                  "name": "filterData"
                }
              }
            ]
          },
          {
            "name": "tuple",
            "fields": [
              {
                "defined": {
                  "name": "filterData"
                }
              },
              {
                "defined": {
                  "name": "filterComparison"
                }
              },
              {
                "defined": {
                  "name": "filterData"
                }
              }
            ]
          },
          {
            "name": "multiple",
            "fields": [
              {
                "defined": {
                  "name": "filterComparison"
                }
              },
              {
                "vec": {
                  "defined": {
                    "name": "filterData"
                  }
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "filterLevel",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "level",
            "fields": [
              "u8"
            ]
          },
          {
            "name": "levelMappingAny",
            "fields": [
              "u8"
            ]
          },
          {
            "name": "levelMapping",
            "fields": [
              {
                "name": "source",
                "type": "u8"
              },
              {
                "name": "target",
                "type": "u8"
              }
            ]
          },
          {
            "name": "country",
            "fields": [
              "u8"
            ]
          },
          {
            "name": "countryMapping",
            "fields": [
              "u8"
            ]
          }
        ]
      }
    },
    {
      "name": "filterMode",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "include"
          },
          {
            "name": "exclude"
          }
        ]
      }
    },
    {
      "name": "filterTarget",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "sender"
          },
          {
            "name": "receiver"
          },
          {
            "name": "bothAnd"
          },
          {
            "name": "bothOr"
          }
        ]
      }
    },
    {
      "name": "identityAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "docs": [
              "version of the account"
            ],
            "type": "u8"
          },
          {
            "name": "identityRegistry",
            "docs": [
              "identity registry to which the account belongs"
            ],
            "type": "pubkey"
          },
          {
            "name": "owner",
            "docs": [
              "owner of the identity account"
            ],
            "type": "pubkey"
          },
          {
            "name": "numWallets",
            "docs": [
              "number of wallets attached to this identity account"
            ],
            "type": "u16"
          },
          {
            "name": "country",
            "docs": [
              "country code of the user"
            ],
            "type": "u8"
          },
          {
            "name": "levels",
            "type": {
              "vec": {
                "defined": {
                  "name": "identityLevel"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "identityFilter",
      "repr": {
        "kind": "rust"
      },
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "simple",
            "fields": [
              {
                "defined": {
                  "name": "filterInner"
                }
              }
            ]
          },
          {
            "name": "ifThen",
            "fields": [
              {
                "defined": {
                  "name": "filterInner"
                }
              },
              {
                "defined": {
                  "name": "filterInner"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "identityLevel",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "level",
            "type": "u8"
          },
          {
            "name": "expiry",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "identityRegistryAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "assetMint",
            "docs": [
              "corresponding asset mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "authority",
            "docs": [
              "authority to manage the registry"
            ],
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "issuance",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "issueTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "issuancePolicies",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "disallowBackdating",
            "type": "bool"
          },
          {
            "name": "maxSupply",
            "type": "u64"
          },
          {
            "name": "usLockPeriod",
            "type": "i64"
          },
          {
            "name": "nonUsLockPeriod",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "issueEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "issuanceTimestamp",
            "type": "i64"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "lock",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "releaseTime",
            "type": "i64"
          },
          {
            "name": "reason",
            "type": "u64"
          },
          {
            "name": "reasonString",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "mintRequest",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "issuanceTimestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "operationCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "operationId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "kind",
            "type": {
              "defined": {
                "name": "operationKind"
              }
            }
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "operationData",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "mint",
            "fields": [
              {
                "name": "amount",
                "type": "u64"
              },
              {
                "name": "issuanceTimestamp",
                "type": "i64"
              }
            ]
          },
          {
            "name": "burn",
            "fields": [
              {
                "name": "amount",
                "type": "u64"
              },
              {
                "name": "reason",
                "type": "string"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "operationExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "operationId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "kind",
            "type": {
              "defined": {
                "name": "operationKind"
              }
            }
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "tokenAccount",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "operationExpired",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "operationId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "kind",
            "type": {
              "defined": {
                "name": "operationKind"
              }
            }
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "operationKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "mint"
          },
          {
            "name": "burn"
          }
        ]
      }
    },
    {
      "name": "operationProposed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "operationId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "identityAccount",
            "type": "pubkey"
          },
          {
            "name": "tokenAccount",
            "type": "pubkey"
          },
          {
            "name": "data",
            "type": {
              "defined": {
                "name": "operationData"
              }
            }
          },
          {
            "name": "effectiveAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "pendingOperation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "identityAccount",
            "type": "pubkey"
          },
          {
            "name": "tokenAccount",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "data",
            "type": {
              "defined": {
                "name": "operationData"
              }
            }
          },
          {
            "name": "proposer",
            "docs": [
              "Authorized signer; human role attribution belongs to RBAC."
            ],
            "type": "pubkey"
          },
          {
            "name": "rentPayer",
            "type": "pubkey"
          },
          {
            "name": "effectiveAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "policy",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hash",
            "type": "string"
          },
          {
            "name": "identityFilter",
            "type": {
              "defined": {
                "name": "identityFilter"
              }
            }
          },
          {
            "name": "policyType",
            "type": {
              "defined": {
                "name": "policyType"
              }
            }
          },
          {
            "name": "customError",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "policyEngineAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "docs": [
              "version"
            ],
            "type": "u8"
          },
          {
            "name": "assetMint",
            "docs": [
              "asset mint"
            ],
            "type": "pubkey"
          },
          {
            "name": "authority",
            "docs": [
              "authority of the registry"
            ],
            "type": "pubkey"
          },
          {
            "name": "mapping",
            "docs": [
              "generic mapping for levels"
            ],
            "type": {
              "array": [
                "u8",
                256
              ]
            }
          },
          {
            "name": "issuancePolicies",
            "docs": [
              "policies to apply on issuance",
              "these are partially for storage only"
            ],
            "type": {
              "defined": {
                "name": "issuancePolicies"
              }
            }
          },
          {
            "name": "policies",
            "docs": [
              "policies to check on transfers or balance changes"
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "policy"
                }
              }
            }
          },
          {
            "name": "counters",
            "docs": [
              "counters to track the number of holders depending on filters"
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "counter"
                }
              }
            }
          },
          {
            "name": "counterLimits",
            "docs": [
              "limits to apply on existing counters"
            ],
            "type": {
              "vec": {
                "defined": {
                  "name": "counterLimit"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "policyType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "identityApproval"
          },
          {
            "name": "transactionAmountLimit",
            "fields": [
              {
                "name": "limit",
                "type": "u64"
              }
            ]
          },
          {
            "name": "maxBalance",
            "fields": [
              {
                "name": "limit",
                "type": "u64"
              }
            ]
          },
          {
            "name": "minBalance",
            "fields": [
              {
                "name": "limit",
                "type": "u64"
              }
            ]
          },
          {
            "name": "minMaxBalance",
            "fields": [
              {
                "name": "min",
                "type": "u64"
              },
              {
                "name": "max",
                "type": "u64"
              }
            ]
          },
          {
            "name": "transferPause"
          },
          {
            "name": "forbiddenIdentityGroup"
          },
          {
            "name": "forceFullTransfer"
          },
          {
            "name": "blockFlowbackEndTime",
            "fields": [
              {
                "name": "time",
                "type": "i64"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "revokeEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "reason",
            "type": "string"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "seizeEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "reason",
            "type": "string"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "toWallet",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "throttleConfig",
      "docs": [
        "Shared tumbling window, mint/burn timelock, and pending-operation expiry."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "enabled",
            "type": "bool"
          },
          {
            "name": "mintWindowCap",
            "type": "u64"
          },
          {
            "name": "burnWindowCap",
            "type": "u64"
          },
          {
            "name": "windowSeconds",
            "type": "i64"
          },
          {
            "name": "largeAmountThreshold",
            "type": "u64"
          },
          {
            "name": "largeAmountDelay",
            "type": "i64"
          },
          {
            "name": "pendingOperationGracePeriod",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "throttleState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "windowStart",
            "type": "i64"
          },
          {
            "name": "mintedInWindow",
            "type": "u64"
          },
          {
            "name": "burnedInWindow",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "throttleUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "throttle",
            "type": {
              "defined": {
                "name": "throttleConfig"
              }
            }
          }
        ]
      }
    },
    {
      "name": "trackerAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "identityAccount",
            "type": "pubkey"
          },
          {
            "name": "totalAmount",
            "type": "u64"
          },
          {
            "name": "issuances",
            "type": {
              "vec": {
                "defined": {
                  "name": "issuance"
                }
              }
            }
          },
          {
            "name": "locks",
            "type": {
              "vec": {
                "defined": {
                  "name": "lock"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "updateAssetMetadataArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "symbol",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "uri",
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "walletIdentity",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "identityAccount",
            "type": "pubkey"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
