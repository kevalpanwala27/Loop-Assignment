module.exports = {
  dialect: process.env.DB_DIALECT || "sqlite",
  storage: process.env.DB_STORAGE || "./database.sqlite",
  database: process.env.DB_NAME || "store_monitoring",
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  host: process.env.DB_HOST || "localhost",
  logging: false,
};
