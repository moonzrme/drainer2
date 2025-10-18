module.exports = (sequelize) => {
  const { DataTypes } = require('sequelize');
  const Landing = sequelize.define('Landing', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.STRING, allowNull: false, unique: true },
    baseUrl: { type: DataTypes.STRING, allowNull: false }
  }, {
    tableName: 'landings',
    timestamps: true
  });
  return Landing;
};