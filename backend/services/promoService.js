const PromoCode = require('../database/schemas/promoCode');
const crypto = require('crypto');

class PromoService {
  async createPromoCode(trafferId, landingType) {
    const code = this.generateUniqueCode();
    const utmLink = this.generateUtmLink(code, landingType);
    
    return await PromoCode.create({
      code,
      trafferId,
      landingType,
      utmLink
    });
  }

  async customizeUtmLink(promoCodeId, customUtm) {
    const promoCode = await PromoCode.findById(promoCodeId);
    if (!promoCode) throw new Error('Promo code not found');

    promoCode.customUtm = customUtm;
    await promoCode.save();
    return promoCode;
  }

  async updateUtmLink(promoCodeId, newDomain) {
    const promoCode = await PromoCode.findById(promoCodeId);
    if (!promoCode) throw new Error('Promo code not found');

    // Зберігаємо кастомну частину
    const customPart = promoCode.customUtm || promoCode.code;
    promoCode.utmLink = `${newDomain}?ref=${customPart}`;
    
    await promoCode.save();
    return promoCode;
  }

  async validateCustomUtm(customUtm, trafferId, landingType) {
    // Перевірка унікальності
    const existing = await PromoCode.findOne({
      customUtm,
      landingType,
      trafferId: { $ne: trafferId }
    });
    
    return !existing;
  }

  generateUniqueCode() {
    return crypto.randomBytes(6).toString('hex');
  }

  generateUtmLink(code, landingType) {
    return `${process.env.BASE_URL}?ref=${code}`;
  }
}

module.exports = new PromoService();