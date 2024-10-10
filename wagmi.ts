import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from 'wagmi/chains';

import { vanguardTestnet, hardhatNetwork, amoyPolygon } from './customChains';

export const config = getDefaultConfig({
  appName: 'PeoplesDex',
  projectId: 'cf3214337170e3849f938503de56dfa0',
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    vanguardTestnet,
    hardhatNetwork,
    amoyPolygon,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [sepolia] : []),
  ],
  ssr: true,
});