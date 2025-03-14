# Video demo preview - https://drive.google.com/file/d/1cpyCSXJBw_TW12Jf0NixtnYng22e7203/view?usp=sharing
Youtube - https://youtu.be/O2PoOlDVgzo

# stable.fun - Stablecoin Factory

A decentralized platform for creating and managing custom stablecoins on Solana, backed by yield-bearing government bonds.

## Overview

stable.fun is a web3 application that enables users to create and manage their own custom stablecoins on the Solana blockchain. Each stablecoin is fully collateralized by Stablebonds (yield-bearing government bonds), ensuring stability and transparency.

## Features

- **Custom Stablecoin Creation**: Create personalized stablecoins with custom names, symbols, and branding
- **Bond-Backed Stability**: All stablecoins are fully collateralized by government bonds
- **Real-Time Price Feeds**: Integration with Switchboard oracles for accurate price data
- **Mint & Redeem**: Easily mint new stablecoins or redeem them for the underlying bond collateral
- **Portfolio Management**: Track and manage all your created stablecoins in one place

## Technology Stack

- **Frontend**:
  - React 18+
  - TypeScript
  - Tailwind CSS
  - Vite
  - Solana Wallet Adapter

- **Smart Contracts**:
  - Rust
  - Anchor Framework
  - Solana Program Library (SPL)
  - Switchboard (Oracle Integration)

## Prerequisites

- Node.js 16+
- Rust and Cargo
- Solana CLI
- Anchor CLI
- A Solana wallet (Phantom or Solflare recommended)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Ge0frey/stablefun.git
cd stablefun
```

2. Install dependencies:
```bash
# Install frontend dependencies
npm install

# Install Anchor dependencies
cd stablecoin-factory
npm install
```

3. Build the Solana program:
```bash
cd stablecoin-factory
anchor build
```

4. Deploy the program (if needed):
```bash
anchor deploy
```

5. Start the development server:
```bash
# From the root directory
npm run dev
```

## Usage

1. Connect your Solana wallet using the "Connect Wallet" button
2. Navigate to the "Create Stablecoin" section
3. Fill in the stablecoin details:
   - Name
   - Symbol
   - Target Currency (USD, EUR, etc.)
   - Select a bond for collateral
   - Upload an icon (optional)
4. Click "Create Stablecoin" to deploy your custom stablecoin
5. Use the "Mint" and "Redeem" functions to manage your stablecoin supply

## Smart Contract Architecture

The project consists of several key components:

- **StablecoinFactory**: Main program handling stablecoin creation and management
- **StablecoinData**: Account structure storing stablecoin metadata and configuration
- **Oracle Integration**: Price feed system using Switchboard for real-time exchange rates

## Development

### Project Structure
```
├── src/                  # Frontend source code
│   ├── components/       # React components
│   ├── context/         # React context providers
│   ├── utils/           # Utility functions
│   └── ...
├── stablecoin-factory/  # Solana program
│   ├── programs/        # Smart contract code
│   ├── tests/          # Program tests
│   └── ...
```

### Testing

```bash
# Run frontend tests
npm test

# Run Solana program tests
cd stablecoin-factory
anchor test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Security

This project is in beta. While we strive to ensure security, please use caution when deploying stablecoins with significant value.

## Acknowledgments

- Solana Foundation
- Anchor Framework
- Switchboard Protocol
```
