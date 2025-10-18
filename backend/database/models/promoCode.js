module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const PromoCode = sequelize.define('PromoCode', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
    trafferId: { type: DataTypes.INTEGER, allowNull: false },
    landingType: { type: DataTypes.STRING },
    utmLink: { type: DataTypes.STRING },
    customUtm: { type: DataTypes.STRING },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    statistics: { type: DataTypes.JSONB, defaultValue: {} }
  }, {
    tableName: 'promo_codes',
    timestamps: true
  });
  return PromoCode;
};