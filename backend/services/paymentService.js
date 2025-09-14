const ethers = require('ethers');

class PaymentService {
  constructor(provider) {
    this.provider = provider;
  }

  async payoutToTraffer(trafferId, amount, currency) {
    const traffer = await User.findById(trafferId);
    if (!traffer || !traffer.wallet) throw new Error('Invalid traffer wallet');

    // Implement instant payout logic
    const tx = await this.sendTransaction(traffer.wallet, amount, currency);
    await this.logPayout(trafferId, amount, currency, tx.hash);
    
    return tx;
  }
}