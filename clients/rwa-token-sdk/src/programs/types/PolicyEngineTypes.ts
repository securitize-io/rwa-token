/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/policy_engine.json`.
 */
export type PolicyEngine = {
  "address": "FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2",
  "metadata": {
    "name": "policyEngine",
    "version": "0.0.1",
    "spec": "0.1.0",
    "description": "The Policy Registry Program (PRP) enables the creation of policies that can be used to control the flow of funds in a programmatic way."
  },
  "instructions": [
    {
      "name": "addLock",
      "discriminator": [
        242,
        102,
        183,
        107,
        109,
        168,
        82,
        140
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
          "name": "assetMint",
          "relations": [
            "policyEngine",
            "identityRegistry"
          ]
        },
        {
          "name": "policyEngine",
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
            "trackerAccount"
          ]
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
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
          "name": "releaseTimestamp",
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
    },
    {
      "name": "attachToPolicyEngine",
      "docs": [
        "policies",
        "attach a policy"
      ],
      "discriminator": [
        99,
        59,
        117,
        21,
        146,
        11,
        54,
        173
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
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
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
    },
    {
      "name": "changeCounterLimits",
      "discriminator": [
        200,
        2,
        8,
        102,
        43,
        168,
        141,
        139
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
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "removedCounterLimits",
          "type": "bytes"
        },
        {
          "name": "addedCounterLimits",
          "type": {
            "vec": {
              "defined": {
                "name": "counterLimit"
              }
            }
          }
        }
      ]
    },
    {
      "name": "changeCounters",
      "discriminator": [
        156,
        107,
        88,
        204,
        113,
        131,
        241,
        192
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
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "removedCounters",
          "type": "bytes"
        },
        {
          "name": "addedCounters",
          "type": {
            "vec": {
              "defined": {
                "name": "counter"
              }
            }
          }
        }
      ]
    },
    {
      "name": "changeIssuancePolicies",
      "discriminator": [
        186,
        201,
        163,
        157,
        32,
        250,
        166,
        37
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
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "issuancePolicies",
          "type": {
            "defined": {
              "name": "issuancePolicies"
            }
          }
        }
      ]
    },
    {
      "name": "changeMapping",
      "discriminator": [
        103,
        1,
        52,
        20,
        160,
        194,
        113,
        125
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
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "mappingSource",
          "type": "bytes"
        },
        {
          "name": "mappingValue",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "closeTrackerAccount",
      "docs": [
        "close tracker account"
      ],
      "discriminator": [
        191,
        131,
        63,
        182,
        65,
        217,
        37,
        166
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "identityRegistry",
          "signer": true,
          "relations": [
            "identityAccount"
          ]
        },
        {
          "name": "assetMint",
          "relations": [
            "identityRegistry",
            "trackerAccount"
          ]
        },
        {
          "name": "identityAccount",
          "relations": [
            "trackerAccount"
          ]
        },
        {
          "name": "trackerAccount",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "createPolicyEngine",
      "docs": [
        "create a policy registry"
      ],
      "discriminator": [
        85,
        105,
        207,
        153,
        73,
        125,
        225,
        54
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
          "name": "policyEngineAccount",
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
          "name": "extraMetasAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  120,
                  116,
                  114,
                  97,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  45,
                  109,
                  101,
                  116,
                  97,
                  115
                ]
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
      "name": "createTrackerAccount",
      "docs": [
        "create tracker account"
      ],
      "discriminator": [
        40,
        16,
        40,
        191,
        109,
        177,
        83,
        190
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "identityAccount",
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
            ],
            "program": {
              "kind": "const",
              "value": [
                231,
                75,
                81,
                14,
                232,
                84,
                45,
                52,
                3,
                211,
                48,
                13,
                45,
                218,
                249,
                1,
                6,
                163,
                235,
                112,
                36,
                214,
                213,
                157,
                141,
                10,
                56,
                4,
                197,
                233,
                153,
                177
              ]
            }
          }
        },
        {
          "name": "identityRegistry",
          "signer": true
        },
        {
          "name": "assetMint",
          "relations": [
            "identityRegistry"
          ]
        },
        {
          "name": "trackerAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              },
              {
                "kind": "account",
                "path": "identityAccount"
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
          "name": "owner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "detachFromPolicyEngine",
      "docs": [
        "remove policy"
      ],
      "discriminator": [
        156,
        137,
        67,
        121,
        46,
        207,
        45,
        12
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
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "hash",
          "type": "string"
        }
      ]
    },
    {
      "name": "enforcePolicyIssuance",
      "discriminator": [
        204,
        149,
        175,
        224,
        136,
        255,
        219,
        75
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "assetController",
          "signer": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                102,
                89,
                127,
                105,
                153,
                104,
                231,
                6,
                81,
                85,
                192,
                80,
                35,
                31,
                89,
                115,
                246,
                148,
                12,
                38,
                237,
                44,
                189,
                34,
                196,
                160,
                89,
                167,
                15,
                131,
                146,
                20
              ]
            }
          }
        },
        {
          "name": "assetMint",
          "relations": [
            "policyEngine",
            "identityRegistry"
          ]
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "destinationAccount"
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
            "destinationTrackerAccount"
          ]
        },
        {
          "name": "destinationTrackerAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      ],
      "returns": "i64"
    },
    {
      "name": "enforcePolicyOnLevelsChange",
      "discriminator": [
        236,
        18,
        123,
        137,
        253,
        244,
        32,
        248
      ],
      "accounts": [
        {
          "name": "identityAccount"
        },
        {
          "name": "identityRegistry",
          "signer": true,
          "relations": [
            "identityAccount"
          ]
        },
        {
          "name": "assetMint",
          "relations": [
            "identityRegistry",
            "policyEngine"
          ]
        },
        {
          "name": "trackerAccount",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              },
              {
                "kind": "account",
                "path": "identityAccount"
              }
            ]
          }
        },
        {
          "name": "policyEngine",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "newLevels",
          "type": {
            "defined": {
              "name": "newLevelsArgs"
            }
          }
        },
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
      "name": "executeTransaction",
      "docs": [
        "execute transfer hook"
      ],
      "discriminator": [
        105,
        37,
        101,
        197,
        75,
        251,
        102,
        26
      ],
      "accounts": [
        {
          "name": "sourceAccount"
        },
        {
          "name": "assetMint"
        },
        {
          "name": "destinationAccount"
        },
        {
          "name": "ownerDelegate"
        },
        {
          "name": "extraMetasAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  120,
                  116,
                  114,
                  97,
                  45,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  45,
                  109,
                  101,
                  116,
                  97,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "policyEngineAccount",
          "writable": true
        },
        {
          "name": "identityRegistry",
          "address": "GZsnjqT3c5zbHqsctrJ4EG4rbEfo7ZXyyUG7aDJNmxfA"
        },
        {
          "name": "identityRegistryAccount"
        },
        {
          "name": "sourceWalletIdentity"
        },
        {
          "name": "destinationWalletIdentity"
        },
        {
          "name": "sourceIdentityAccount"
        },
        {
          "name": "destinationIdentityAccount"
        },
        {
          "name": "sourceTrackerAccount",
          "writable": true
        },
        {
          "name": "destinationTrackerAccount",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "pruneIssuances",
      "docs": [
        "Permanently remove issuances matured under the identity's current holding period.",
        "Requires policy-engine authority approval. A later period increase cannot",
        "restore pruned history or re-lock the removed issuances.",
        "Emits an event only when records are removed."
      ],
      "discriminator": [
        199,
        99,
        250,
        172,
        179,
        197,
        111,
        37
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "policyEngine"
          ]
        },
        {
          "name": "assetMint",
          "relations": [
            "policyEngine",
            "identityRegistry",
            "trackerAccount"
          ]
        },
        {
          "name": "policyEngine",
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
          "name": "identityRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                231,
                75,
                81,
                14,
                232,
                84,
                45,
                52,
                3,
                211,
                48,
                13,
                45,
                218,
                249,
                1,
                6,
                163,
                235,
                112,
                36,
                214,
                213,
                157,
                141,
                10,
                56,
                4,
                197,
                233,
                153,
                177
              ]
            }
          },
          "relations": [
            "identityAccount"
          ]
        },
        {
          "name": "identityAccount",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "identityRegistry"
              },
              {
                "kind": "account",
                "path": "identity_account.owner",
                "account": "identityAccount"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                231,
                75,
                81,
                14,
                232,
                84,
                45,
                52,
                3,
                211,
                48,
                13,
                45,
                218,
                249,
                1,
                6,
                163,
                235,
                112,
                36,
                214,
                213,
                157,
                141,
                10,
                56,
                4,
                197,
                233,
                153,
                177
              ]
            }
          },
          "relations": [
            "trackerAccount"
          ]
        },
        {
          "name": "trackerAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "assetMint"
              },
              {
                "kind": "account",
                "path": "identityAccount"
              }
            ]
          }
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": []
    },
    {
      "name": "removeLock",
      "discriminator": [
        1,
        17,
        121,
        74,
        62,
        241,
        127,
        120
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
          "name": "assetMint",
          "relations": [
            "policyEngine",
            "identityRegistry"
          ]
        },
        {
          "name": "policyEngine",
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
            "trackerAccount"
          ]
        },
        {
          "name": "trackerAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "setCounters",
      "discriminator": [
        127,
        151,
        147,
        141,
        171,
        53,
        28,
        135
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
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "eventAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  95,
                  95,
                  101,
                  118,
                  101,
                  110,
                  116,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "program"
        }
      ],
      "args": [
        {
          "name": "changedCounters",
          "type": "bytes"
        },
        {
          "name": "values",
          "type": {
            "vec": "u64"
          }
        }
      ]
    },
    {
      "name": "updateCountersOnBurn",
      "discriminator": [
        22,
        151,
        139,
        67,
        21,
        61,
        191,
        236
      ],
      "accounts": [
        {
          "name": "assetController",
          "signer": true
        },
        {
          "name": "assetMint",
          "relations": [
            "policyEngine",
            "identityRegistry"
          ]
        },
        {
          "name": "policyEngine",
          "writable": true
        },
        {
          "name": "destinationAccount"
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
            "destinationTrackerAccount"
          ]
        },
        {
          "name": "destinationTrackerAccount",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
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
      "name": "policyEngineAccount",
      "discriminator": [
        124,
        85,
        205,
        80,
        2,
        18,
        26,
        45
      ]
    },
    {
      "name": "trackerAccount",
      "discriminator": [
        83,
        95,
        166,
        148,
        57,
        30,
        90,
        210
      ]
    }
  ],
  "events": [
    {
      "name": "attachPolicyEvent",
      "discriminator": [
        104,
        248,
        239,
        158,
        181,
        172,
        130,
        47
      ]
    },
    {
      "name": "changedCounterLimitsEvent",
      "discriminator": [
        91,
        102,
        100,
        27,
        124,
        137,
        26,
        180
      ]
    },
    {
      "name": "changedCountersEvent",
      "discriminator": [
        111,
        121,
        17,
        44,
        125,
        218,
        213,
        226
      ]
    },
    {
      "name": "changedIssuancePoliciesEvent",
      "discriminator": [
        225,
        149,
        140,
        234,
        143,
        91,
        92,
        243
      ]
    },
    {
      "name": "changedMappingEvent",
      "discriminator": [
        199,
        174,
        161,
        68,
        233,
        180,
        13,
        199
      ]
    },
    {
      "name": "detachPolicyEvent",
      "discriminator": [
        166,
        167,
        46,
        102,
        163,
        198,
        55,
        44
      ]
    },
    {
      "name": "issuancesPrunedEvent",
      "discriminator": [
        202,
        51,
        111,
        1,
        133,
        104,
        89,
        16
      ]
    },
    {
      "name": "lockEvent",
      "discriminator": [
        76,
        37,
        6,
        186,
        14,
        42,
        253,
        15
      ]
    },
    {
      "name": "setCounterValueEvent",
      "discriminator": [
        124,
        109,
        69,
        140,
        144,
        62,
        60,
        75
      ]
    },
    {
      "name": "transferEvent",
      "discriminator": [
        100,
        10,
        46,
        113,
        8,
        28,
        179,
        125
      ]
    },
    {
      "name": "unlockEvent",
      "discriminator": [
        105,
        1,
        235,
        144,
        68,
        123,
        75,
        123
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidPolicy",
      "msg": "Invalid policy passed"
    },
    {
      "code": 6001,
      "name": "transactionAmountLimitExceeded",
      "msg": "Transaction amount limit exceeded"
    },
    {
      "code": 6002,
      "name": "transactionAmountVelocityExceeded",
      "msg": "Transaction amount velocity exceeded"
    },
    {
      "code": 6003,
      "name": "transactionCountVelocityExceeded",
      "msg": "Transaction count velocity exceeded"
    },
    {
      "code": 6004,
      "name": "identityLevelLimitExceeded",
      "msg": "Identity level limit exceeded"
    },
    {
      "code": 6005,
      "name": "policyEngineFull",
      "msg": "Policy registry is full, cannot add more policies"
    },
    {
      "code": 6006,
      "name": "policyNotFound",
      "msg": "Policy not found"
    },
    {
      "code": 6007,
      "name": "identityFilterFailed",
      "msg": "Identity filter failed"
    },
    {
      "code": 6008,
      "name": "unauthorizedSigner",
      "msg": "Unauthorized signer"
    },
    {
      "code": 6009,
      "name": "policyAlreadyExists",
      "msg": "Policy already exists"
    },
    {
      "code": 6010,
      "name": "maxBalanceExceeded",
      "msg": "Max balance exceeded"
    },
    {
      "code": 6011,
      "name": "minBalanceExceeded",
      "msg": "Min balance exceeded"
    },
    {
      "code": 6012,
      "name": "invalidCpiTransferAmount",
      "msg": "Invalid CPI transfer amount"
    },
    {
      "code": 6013,
      "name": "invalidCpiTransferMint",
      "msg": "Invalid CPI transfer mint"
    },
    {
      "code": 6014,
      "name": "invalidCpiTransferProgram",
      "msg": "Invalid CPI transfer program"
    },
    {
      "code": 6015,
      "name": "invalidPdaPassedIn",
      "msg": "Invalid PDA passed in"
    },
    {
      "code": 6016,
      "name": "transferHistoryFull",
      "msg": "Transfer history full"
    },
    {
      "code": 6017,
      "name": "transferPaused",
      "msg": "All Transfers have been paused"
    },
    {
      "code": 6018,
      "name": "forceFullTransfer",
      "msg": "Expected source account to transfer full amount"
    },
    {
      "code": 6019,
      "name": "holderLimitExceeded",
      "msg": "Holder limit exceeded"
    },
    {
      "code": 6020,
      "name": "balanceLimitExceeded",
      "msg": "Balance limit exceeded"
    },
    {
      "code": 6021,
      "name": "trackerAccountOwnerMismatch",
      "msg": "Tracker account owner mismatch"
    },
    {
      "code": 6022,
      "name": "forbiddenIdentityGroup",
      "msg": "Forbidden identity group"
    },
    {
      "code": 6023,
      "name": "invalidIdentityAccount",
      "msg": "Invalid identity account"
    },
    {
      "code": 6024,
      "name": "holdersLimitExceeded",
      "msg": "Holders limit exceeded"
    },
    {
      "code": 6025,
      "name": "minMaxBalanceExceeded",
      "msg": "Min max balance exceeded"
    },
    {
      "code": 6026,
      "name": "invalidPolicyEngineAccount",
      "msg": "Invalid policy engine account"
    },
    {
      "code": 6027,
      "name": "percentageLimitExceeded",
      "msg": "Percentage limit exceeded"
    },
    {
      "code": 6028,
      "name": "flowback",
      "msg": "flowback"
    },
    {
      "code": 6029,
      "name": "invalidInstructionData",
      "msg": "Invalid instruction data"
    },
    {
      "code": 6030,
      "name": "backdatingNotAllowed",
      "msg": "Backdating not allowed"
    },
    {
      "code": 6031,
      "name": "maxSupplyExceeded",
      "msg": "Max supply exceeded"
    },
    {
      "code": 6032,
      "name": "counterNotFound",
      "msg": "Counter not found"
    },
    {
      "code": 6033,
      "name": "dataIsNotEmpty",
      "msg": "Data is not empty"
    },
    {
      "code": 6034,
      "name": "holdUp",
      "msg": "Tokens are held up"
    },
    {
      "code": 6035,
      "name": "tokensLocked",
      "msg": "Tokens are locked"
    },
    {
      "code": 6050,
      "name": "forceAccredited"
    },
    {
      "code": 6051,
      "name": "forceAccreditedUs"
    },
    {
      "code": 6052,
      "name": "tokenPaused"
    },
    {
      "code": 6053,
      "name": "investorFullyLocked"
    },
    {
      "code": 6054,
      "name": "trackerAccountNotEmpty"
    },
    {
      "code": 6055,
      "name": "counterIdAlreadyExists",
      "msg": "Counter id already exists"
    },
    {
      "code": 6056,
      "name": "counterIdNotFound",
      "msg": "Counter id not found"
    },
    {
      "code": 6057,
      "name": "counterUnderflow",
      "msg": "Counter underflow, please manually override the counter value"
    },
    {
      "code": 6058,
      "name": "counterOverflow",
      "msg": "Counter overflow, please manually override the counter value"
    },
    {
      "code": 6059,
      "name": "balanceUnderflow",
      "msg": "Balance underflow error"
    },
    {
      "code": 6060,
      "name": "balanceOverflow",
      "msg": "Balance overflow error"
    },
    {
      "code": 6061,
      "name": "lockIndexNotFound",
      "msg": "Lock index not found"
    },
    {
      "code": 6062,
      "name": "counterLimitIndexNotFound",
      "msg": "Counter Limit index not found"
    },
    {
      "code": 6063,
      "name": "invalidLockPeriod",
      "msg": "Holding period must be nonnegative"
    }
  ],
  "types": [
    {
      "name": "attachPolicyEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
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
            "name": "identityFilter",
            "type": {
              "defined": {
                "name": "identityFilter"
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
      "name": "changedCounterLimitsEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "removedCounterLimits",
            "type": {
              "vec": {
                "defined": {
                  "name": "counterLimit"
                }
              }
            }
          },
          {
            "name": "addedCounterLimits",
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
      "name": "changedCountersEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "removedCounters",
            "type": "bytes"
          },
          {
            "name": "addedCounters",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "changedIssuancePoliciesEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "issuancePolicies",
            "type": {
              "defined": {
                "name": "issuancePolicies"
              }
            }
          },
          {
            "name": "previousIssuancePolicies",
            "type": {
              "defined": {
                "name": "issuancePolicies"
              }
            }
          }
        ]
      }
    },
    {
      "name": "changedMappingEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "mappingSource",
            "type": "bytes"
          },
          {
            "name": "mappingValue",
            "type": "bytes"
          },
          {
            "name": "previousMapping",
            "type": "bytes"
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
      "name": "detachPolicyEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
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
            "name": "identityFilter",
            "type": {
              "defined": {
                "name": "identityFilter"
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
      "name": "issuancesPrunedEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "identity",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "lockTime",
            "type": "i64"
          },
          {
            "name": "removedCount",
            "type": "u64"
          },
          {
            "name": "remainingCount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "levelExpiry",
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
      "name": "lockEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "releaseTimestamp",
            "type": "i64"
          },
          {
            "name": "reason",
            "type": "u64"
          },
          {
            "name": "reasonString",
            "type": "string"
          },
          {
            "name": "identity",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "newLevelsArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "levels",
            "type": {
              "vec": {
                "defined": {
                  "name": "levelExpiry"
                }
              }
            }
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
      "name": "setCounterValueEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "counters",
            "type": "bytes"
          },
          {
            "name": "values",
            "type": {
              "vec": "u64"
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
      "name": "transferEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "to",
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
      "name": "unlockEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "releaseTimestamp",
            "type": "i64"
          },
          {
            "name": "reason",
            "type": "u64"
          },
          {
            "name": "reasonString",
            "type": "string"
          },
          {
            "name": "identity",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
