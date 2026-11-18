<h1 align="center">
  RWA Token Program
</h1>
<p>
  Program to issue, manage, and integrate off-chain backed tokens on SVM blockchains.
</p>

## Overview
Non-blockchain originated tokens (NBOs), also referred to as Real World Assets (RWAs), encompass tangible and intangible assets with property rights enforced by a legal system rather than the blockchain. The blockchain serves as a programmable ledger for these assets and trust-minimized applications that seek to interface with them. The solution described below seeks to standardize NBOs in a way that is:

1. **Unopinionated** to support the legal frameworks of all jurisdictions and blockchain applications. 
2. **Flexible** to support a diverse set of asset classes and representations, including tangible assets (real estate, commodities) and intangible assets (tokenized equities, climate assets, intellectual property)
3. **Composable** to ensure minimal overhead in composing across new applications and existing standards like Metaplex and Token-2022.

To accomplish the above, we propose developing a modular framework that standardizes assets across the following primitives:

1. **Asset Management:** A program for asset issuers to create and enforce rules for asset management, such as transfer controls and privacy. This program will rely heavily on Token-2022.
2. **Policy Engine Program:** A program that allows for fully on-chain management of policies regarding token transfers including transaction size, count, and velocity.
3. **Identity Registry:** A program for asset issuers to manage and share wallet-to-identity relationships used by the Asset Management program.
4. **Asset Data Registry:**  A program for asset issuers to establish and manage naive asset data in the form of ownership data (titles, deeds, or audits), legal information (filings and liens), and informational data.

These programs limit the assumed necessary functionality to the support of permissioning, identity, on-chain ownership information, on-chain legal information, and off-chain asset information. This ensures that applications will benefit from a shared source of truth while maintaining optionality to create asset class-specific standards within any particular program (e.g. a Legal Registry standard specific to a Regulation D security).

## Getting Started

This program is currently in development and not for active use. If you wish to contribute, please reach out to team [at] bridgesplit [dot] com.


Build and local testing instructions for Anchor 1.1.2 and Surfpool are in [programs/README.md](programs/README.md#build-and-test).
