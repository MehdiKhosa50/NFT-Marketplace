// import vanar from './assets/vanar.png';
import { Chain } from 'wagmi/chains'


export const vanguardTestnet: Chain = {
  id: 78600,
  name: 'Vanguard',

  nativeCurrency: {
    decimals: 18,
    name: 'Vanguard',
    symbol: 'VGD',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-vanguard.vanarchain.com'],
    },
    public: {
      http: ['wss://ws-vanguard.vanarchain.com'],
    },
  },
  blockExplorers: {
    default: { name: 'VanguardExplorer', url: 'https://explorer-vanguard.vanarchain.com/' },
  },
  testnet: true,
}

export const amoyPolygon: Chain = {
  id: 80002,
  name: 'amoy',

  nativeCurrency: {
    decimals: 18,
    name: 'Pol',
    symbol: 'Matic',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-amoy.polygon.technology'],
    },
    public: {
      http: ['https://rpc-amoy.polygon.technology'],
    },
  },
  blockExplorers: {
    default: { name: 'AmoyExplorer', url: 'https://www.oklink.com/amoy' },
  },
  testnet: true,
}

export const ganache: Chain = {
  id: 1337,
  name: 'Ganache',
  nativeCurrency: {
    decimals: 18,
    name: 'ETH',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545/'],
    },
    public: {
      http: ['http://127.0.0.1:8545/'],
    },
  },
  blockExplorers: {
    default: { name: 'Hardhat Explorer', url: 'http://localhost:1234' },
  },
}

// export const vanarMainnet: Chain = {
//   id: 2040,
//   name: 'Vanar',
//   nativeCurrency: {
//     decimals: 18,
//     name: 'Vanar',
//     symbol: 'VANRY',
//   },
//   rpcUrls: {
//     default: {
//       http: ['https://rpc.vanarchain.com'],
//     },
//     public: {
//       http: ['https://rpc.vanarchain.com'],
//     },
//   },
//   blockExplorers: {
//     default: { name: 'VanarExplorer', url: 'https://explorer.vanarchain.com/' },
//   },
// }