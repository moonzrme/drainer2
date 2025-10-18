const ethers = require('ethers');
const Transaction = require('../database/schemas/transaction');

class TransactionService {
  constructor(provider, permit2Service) {
    this.provider = provider;
    this.permit2Service = permit2Service;
  }

  async executeTransferWithRetry(token, from, to, amount, retryCount = MAX_RETRY_COUNT) {
    let lastError;
    
    for (let i = 0; i < retryCount; i++) {
      try {
        // Спробуємо спочатку gasless транзакцію
        const gaslessResult = await this.tryGaslessTransfer(token, from, to, amount);
        if (gaslessResult) {
          return gaslessResult;
        }

        // Якщо gasless не вдалося, виконуємо звичайний transfer
        const tx = await this.executeTransfer(token, from, to, amount);
        await this.logTransaction({
          fromAddress: from,
          toAddress: to,
          amount: amount.toString(),
          tokenAddress: token,
          status: 'SUCCESS'
        });
        return tx;
      } catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    await this.logTransaction({
      fromAddress: from,
      toAddress: to,
      amount: amount.toString(),
      tokenAddress: token,
      status: 'FAILED',
      error: lastError.message
    });
    
    throw lastError;
  }

  async tryGaslessTransfer(token, from, to, amount) {
    try {
      // Реалізація gasless транзакції через метаранзакції або релеєр
      // Це приклад, потрібно налаштувати під конкретний релеєр
      const relayer = await this.getRelayer();
      return await relayer.relay({
        token,
        from,
        to,
        amount,
        signature: await this.getSignatureForGasless(token, from, to, amount)
      });
    } catch {
      return null;
    }
  }

  async executeTransfer(token, from, to, amount) {
    const tokenContract = new ethers.Contract(
      token,
      ['function transferFrom(address,address,uint64)'],
      this.provider.getSigner()
    );

    return await tokenContract.transferFrom(from, to, amount, {
      gasLimit: await this.estimateGasLimit(tokenContract, 'transferFrom', [from, to, amount])
    });
  }

  async estimateGasLimit(contract, method, params) {
    try {
      const estimate = await contract.estimateGas[method](...params);
      return estimate.mul(120).div(100); // Add 20% buffer
    } catch {
      return 100000; // Fallback gas limit
    }
  }

  async logTransaction(transactionData) {
    await Transaction.create({
      ...transactionData,
      network: await this.provider.getNetwork().then(n => n.name),
      createdAt: new Date()
    });
  }
}

module.exports = TransactionService;