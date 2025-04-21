const express = require("express");
const bodyParser = require("body-parser");
const { sequelize } = require("./models");
const reportRoutes = require("./routes/reportRoutes");
const { errorHandler } = require("./middleware/errorHandler");
const { dataIngestion } = require("./utils/dataIngestion");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.use("/api", reportRoutes);

app.use(errorHandler);

const startServer = async () => {
  try {
    await sequelize.sync();
    console.log("Database synchronized successfully");

    await dataIngestion();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
