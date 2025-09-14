const ethers = require('ethers');

class GasUtils {
  static async calculateGasPrice(provider, multiplier = 1.1) {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(ethers.BigNumber.from(Math.floor(multiplier * 100))).div(100);
  }

  static async estimateGasLimit(contract, method, params, buffer = 1.2) {
    try {
      const estimate = await contract.estimateGas[method](...params);
      return estimate.mul(Math.floor(buffer * 100)).div(100);
    } catch {
      return ethers.BigNumber.from(100000); // Default gas limit
    }
  }
}

module.exports = GasUtils;