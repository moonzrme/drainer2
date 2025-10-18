const { models } = require('../database');
const PromoCode = models.PromoCode;
const Landing = models.Landing;
const crypto = require('crypto');

class PromoService {
  async createPromoCode(trafferId, landingType) {
    const code = this.generateUniqueCode();
    const utmLink = await this.generateUtmLink(code, landingType);
    
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
    promoCode.utmLink = `${newDomain.replace(/\/$/, '')}?ref=${customPart}`;
    
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

  // now async: fetch landing baseUrl from DB, fallback to env
  async generateUtmLink(code, landingType) {
    try {
      const landing = await Landing.findOne({ type: landingType });
      const base = landing?.baseUrl || process.env.BASE_URL || 'https://example.com';
      return `${base.replace(/\/$/, '')}?ref=${code}`;
    } catch (err) {
      const base = process.env.BASE_URL || 'https://example.com';
      return `${base.replace(/\/$/, '')}?ref=${code}`;
    }
  }
}

module.exports = new PromoService();