const SUPPORTED_NETWORKS = [
  {
    name: 'Ethereum',
    chainId: 1,
    rpc: process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY',
    scanApi: process.env.ETH_SCAN_API,
    currency: 'ETH',
    multicallAddress: '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441',
    blockExplorer: 'https://etherscan.io'
  },
  {
    name: 'BSC',
    chainId: 56,
    rpc: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org',
    scanApi: process.env.BSC_SCAN_API,
    currency: 'BNB',
    multicallAddress: '0x41263cBA59EB80dC200F3E2544eda4ed6A90E76C',
    blockExplorer: 'https://bscscan.com'
  },
  {
    name: 'Polygon',
    chainId: 137,
    rpc: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    scanApi: process.env.POLYGON_SCAN_API,
    currency: 'MATIC',
    multicallAddress: '0x11ce4B23bD875D7F5C6a31084f55fDe1e9A87507',
    blockExplorer: 'https://polygonscan.com'
  },
  {
    name: 'Arbitrum',
    chainId: 42161,
    rpc: process.env.ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    scanApi: process.env.ARB_SCAN_API,
    currency: 'ETH',
    multicallAddress: '0x842eC2c7D803033Edf55E478F461FC547Bc54EB2',
    blockExplorer: 'https://arbiscan.io'
  }
];

module.exports = { SUPPORTED_NETWORKS };