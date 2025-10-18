module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    telegramId: { type: DataTypes.STRING },
    isTraffer: { type: DataTypes.BOOLEAN, defaultValue: false },
    wallet: { type: DataTypes.STRING },
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    verificationCode: { type: DataTypes.STRING },
    verificationExpires: { type: DataTypes.DATE },
    verifyAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    resetToken: { type: DataTypes.STRING },
    resetExpires: { type: DataTypes.DATE }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });
  return User;
};