const { Sequelize } = require("sequelize");
const config = require("../config/database");

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: config.logging,
    storage: config.storage,
  }
);

const db = {
  sequelize,
  Sequelize,
  StoreStatus: require("./storeStatus")(sequelize, Sequelize),
  BusinessHours: require("./businessHours")(sequelize, Sequelize),
  Timezone: require("./timezone")(sequelize, Sequelize),
  Report: require("./report")(sequelize, Sequelize),
};

module.exports = db;
