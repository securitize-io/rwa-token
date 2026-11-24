/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/identity_registry.json`.
 */
export type IdentityRegistry = {
  "address": "GZsnjqT3c5zbHqsctrJ4EG4rbEfo7ZXyyUG7aDJNmxfA",
  "metadata": {
    "name": "identityRegistry",
    "version": "0.0.1",
    "spec": "0.1.0",
    "description": "The Identity Registry Program (IRP) manages the configurable issuance and tracking of on-chain identities to enable on-chain transaction permissioning.",
    "repository": "https://github.com/bridgesplit/rwa"
  },
  "instructions": [
    {
      "name": "addLevelToIdentityAccount",
      "docs": [
        "add level to identity account"
      ],
      "discriminator": [
        102,
        204,
        64,
        169,
        252,
        177,
        192,
        232
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "identityRegistry"
              },
              {
                "kind": "account",
                "path": "identityAccount.owner",
                "account": "identityAccount"
              }
            ]
          }
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
          "name": "trackerAccount"
        },
        {
          "name": "assetMint",
          "relations": [
            "identityRegistry"
          ]
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
          "name": "levels",
          "type": "bytes"
        },
        {
          "name": "expiries",
          "type": {
            "vec": "i64"
          }
        },
        {
          "name": "enforceLimits",
          "type": "bool"
        }
      ]
    },
    {
      "name": "attachWalletToIdentity",
      "docs": [
        "attach token account to identity account"
      ],
      "discriminator": [
        61,
        129,
        252,
        190,
        8,
        202,
        179,
        90
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "identityAccount",
          "writable": true
        },
        {
          "name": "identityRegistry",
          "relations": [
            "identityAccount"
          ]
        },
        {
          "name": "assetMint",
          "relations": [
            "identityRegistry"
          ]
        },
        {
          "name": "walletIdentity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "wallet"
              },
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
          "name": "eventAuthority"
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "wallet",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "changeCountry",
      "discriminator": [
        208,
        227,
        224,
        246,
        9,
        254,
        62,
        179
      ],
      "accounts": [
        {
          "name": "payer",
          "signer": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "identityRegistry"
              },
              {
                "kind": "account",
                "path": "identityAccount.owner",
                "account": "identityAccount"
              }
            ]
          }
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
          "name": "trackerAccount"
        },
        {
          "name": "assetMint",
          "relations": [
            "identityRegistry"
          ]
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
          "name": "newCountry",
          "type": "u8"
        },
        {
          "name": "enforceLimits",
          "type": "bool"
        }
      ]
    },
    {
      "name": "createIdentityAccount",
      "docs": [
        "identity functions",
        "create identity account"
      ],
      "discriminator": [
        82,
        240,
        35,
        129,
        113,
        134,
        116,
        70
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "identityRegistry"
              },
              {
                "kind": "arg",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "walletIdentity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "identityRegistry.assetMint",
                "account": "identityRegistryAccount"
              }
            ]
          }
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "assetMint"
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
          "name": "owner",
          "type": "pubkey"
        },
        {
          "name": "level",
          "type": "u8"
        },
        {
          "name": "expiry",
          "type": "i64"
        },
        {
          "name": "country",
          "type": "u8"
        }
      ]
    },
    {
      "name": "createIdentityRegistry",
      "docs": [
        "registry functions",
        "create identity registry"
      ],
      "discriminator": [
        180,
        3,
        39,
        22,
        183,
        212,
        39,
        209
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "identityRegistryAccount",
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "authority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "detachWalletFromIdentity",
      "docs": [
        "detach token account from identity account"
      ],
      "discriminator": [
        166,
        70,
        236,
        254,
        166,
        116,
        201,
        50
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
          "name": "walletIdentity",
          "writable": true
        },
        {
          "name": "identityAccount",
          "writable": true,
          "relations": [
            "walletIdentity"
          ]
        },
        {
          "name": "identityRegistry",
          "relations": [
            "identityAccount"
          ]
        },
        {
          "name": "tokenAccount",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "walletIdentity.wallet",
                "account": "walletIdentity"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  238,
                  117,
                  143,
                  222,
                  24,
                  66,
                  93,
                  188,
                  228,
                  108,
                  205,
                  218,
                  182,
                  26,
                  252,
                  77,
                  131,
                  185,
                  13,
                  39,
                  254,
                  189,
                  249,
                  40,
                  216,
                  161,
                  139,
                  252
                ]
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
          "name": "assetMint",
          "relations": [
            "identityRegistry"
          ]
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
      "name": "removeLevelFromIdentityAccount",
      "docs": [
        "remove level from identity account"
      ],
      "discriminator": [
        194,
        231,
        187,
        54,
        197,
        136,
        170,
        55
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "identityRegistry"
        },
        {
          "name": "identityAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "identityRegistry"
              },
              {
                "kind": "account",
                "path": "identityAccount.owner",
                "account": "identityAccount"
              }
            ]
          }
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
          "name": "trackerAccount"
        },
        {
          "name": "assetMint"
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
          "name": "levels",
          "type": "bytes"
        },
        {
          "name": "enforceLimits",
          "type": "bool"
        }
      ]
    },
    {
      "name": "revokeIdentityAccount",
      "docs": [
        "revoke user identity account by closing account"
      ],
      "discriminator": [
        77,
        88,
        182,
        61,
        235,
        49,
        2,
        137
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "identityRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "identityRegistry.assetMint",
                "account": "identityRegistryAccount"
              }
            ]
          }
        },
        {
          "name": "identityAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "identityRegistry"
              },
              {
                "kind": "account",
                "path": "identityAccount.owner",
                "account": "identityAccount"
              }
            ]
          },
          "relations": [
            "walletIdentity"
          ]
        },
        {
          "name": "walletIdentity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "owner"
              },
              {
                "kind": "account",
                "path": "identityRegistry.assetMint",
                "account": "identityRegistryAccount"
              }
            ]
          }
        },
        {
          "name": "policyEngineProgram",
          "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "assetMint"
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
          "name": "owner",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "identityAccount",
      "discriminator": [
        194,
        90,
        181,
        160,
        182,
        206,
        116,
        158
      ]
    },
    {
      "name": "identityRegistryAccount",
      "discriminator": [
        154,
        254,
        118,
        4,
        115,
        36,
        125,
        78
      ]
    },
    {
      "name": "walletIdentity",
      "discriminator": [
        101,
        142,
        55,
        104,
        168,
        77,
        57,
        85
      ]
    }
  ],
  "events": [
    {
      "name": "addLevelsToIdentityEvent",
      "discriminator": [
        106,
        66,
        2,
        157,
        98,
        27,
        247,
        14
      ]
    },
    {
      "name": "attachWalletToIdentityEvent",
      "discriminator": [
        16,
        40,
        24,
        145,
        131,
        77,
        48,
        72
      ]
    },
    {
      "name": "changeCountryEvent",
      "discriminator": [
        157,
        201,
        26,
        238,
        229,
        239,
        123,
        18
      ]
    },
    {
      "name": "createdIdentityEvent",
      "discriminator": [
        86,
        208,
        163,
        74,
        106,
        170,
        105,
        5
      ]
    },
    {
      "name": "detachWalletFromIdentityEvent",
      "discriminator": [
        198,
        117,
        190,
        61,
        34,
        148,
        12,
        148
      ]
    },
    {
      "name": "removeLevelsFromIdentityEvent",
      "discriminator": [
        41,
        204,
        239,
        52,
        86,
        107,
        45,
        212
      ]
    },
    {
      "name": "removedIdentityEvent",
      "discriminator": [
        210,
        181,
        206,
        189,
        126,
        87,
        18,
        55
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "levelAlreadyPresent",
      "msg": "Identity level has already been attached to user"
    },
    {
      "code": 6001,
      "name": "maxLevelsExceeded",
      "msg": "Number of levels that can be attached to user has been exceeded"
    },
    {
      "code": 6002,
      "name": "levelNotFound",
      "msg": "Level to be removed not found"
    },
    {
      "code": 6003,
      "name": "unauthorizedSigner",
      "msg": "Unauthorized signer"
    },
    {
      "code": 6004,
      "name": "limitReached",
      "msg": "Identity limit reached"
    },
    {
      "code": 6005,
      "name": "tokenAccountAlreadyInitialized",
      "msg": "Token account is already initialized"
    },
    {
      "code": 6006,
      "name": "identityCreationRequired",
      "msg": "Identity creation must be enforced for this feature"
    },
    {
      "code": 6007,
      "name": "multipleWalletsNotAllowed",
      "msg": "Multiple wallets are not allowed"
    },
    {
      "code": 6008,
      "name": "walletAlreadyInUse",
      "msg": "Wallet already in use"
    },
    {
      "code": 6009,
      "name": "invalidLevel",
      "msg": "Invalid level"
    },
    {
      "code": 6010,
      "name": "tokenAccountNotEmpty",
      "msg": "Token account is not empty"
    }
  ],
  "types": [
    {
      "name": "addLevelsToIdentityEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "identity",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "levels",
            "type": "bytes"
          },
          {
            "name": "expiries",
            "type": {
              "vec": "i64"
            }
          },
          {
            "name": "sender",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "attachWalletToIdentityEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "identity",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "sender",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "changeCountryEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "identity",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "country",
            "type": "u8"
          },
          {
            "name": "sender",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "createdIdentityEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "identity",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "kind",
            "type": "u8"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "detachWalletFromIdentityEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "identity",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "sender",
            "type": "pubkey"
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
      "name": "removeLevelsFromIdentityEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "identity",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "levels",
            "type": "bytes"
          },
          {
            "name": "sender",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "removedIdentityEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "identity",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "kind",
            "type": "u8"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
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
