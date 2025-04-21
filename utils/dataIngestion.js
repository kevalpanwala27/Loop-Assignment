const fs = require("fs");
const csv = require("fast-csv");
const path = require("path");
const { StoreStatus, BusinessHours, Timezone } = require("../models");
const config = require("../config/app");

async function isDataLoaded() {
  const storeStatusCount = await StoreStatus.count();
  const businessHoursCount = await BusinessHours.count();
  const timezoneCount = await Timezone.count();

  return storeStatusCount > 0 || businessHoursCount > 0 || timezoneCount > 0;
}

exports.dataIngestion = async () => {
  try {
    const dataExists = await isDataLoaded();
    if (dataExists) {
      console.log("Data already exists in database. Skipping ingestion.");
      return;
    }

    console.log("Starting data ingestion...");

    await importStoreStatus();

    await importBusinessHours();

    await importTimezone();

    console.log("Data ingestion completed successfully.");
  } catch (error) {
    console.error("Error during data ingestion:", error);
    throw error;
  }
};

async function importStoreStatus() {
  console.log("Importing store status data...");
  const filePath = path.join(config.csvFolderPath, "store_status.csv");

  return new Promise((resolve, reject) => {
    const storeStatusData = [];

    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true }))
      .on("data", (row) => {
        storeStatusData.push({
          store_id: row.store_id,
          timestamp_utc: new Date(row.timestamp_utc),
          status: row.status,
        });

        if (storeStatusData.length >= 10000) {
          const batchData = [...storeStatusData];
          storeStatusData.length = 0;

          StoreStatus.bulkCreate(batchData).catch((err) => {
            console.error("Error inserting store status batch:", err);
            reject(err);
          });
        }
      })
      .on("error", (error) => {
        console.error("Error parsing store status CSV:", error);
        reject(error);
      })
      .on("end", async () => {
        if (storeStatusData.length > 0) {
          try {
            await StoreStatus.bulkCreate(storeStatusData);
          } catch (error) {
            console.error("Error inserting final store status batch:", error);
            return reject(error);
          }
        }

        console.log("Store status data imported successfully.");
        resolve();
      });
  });
}

async function importBusinessHours() {
  console.log("Importing business hours data...");
  const filePath = path.join(config.csvFolderPath, "menu_hours.csv");

  return new Promise((resolve, reject) => {
    const businessHoursData = [];

    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true }))
      .on("data", (row) => {
        businessHoursData.push({
          store_id: row.store_id,
          day_of_week: parseInt(row.day),
          start_time_local: row.start_time_local,
          end_time_local: row.end_time_local,
        });

        if (businessHoursData.length >= 1000) {
          const batchData = [...businessHoursData];
          businessHoursData.length = 0;

          BusinessHours.bulkCreate(batchData).catch((err) => {
            console.error("Error inserting business hours batch:", err);
            reject(err);
          });
        }
      })
      .on("error", (error) => {
        console.error("Error parsing business hours CSV:", error);
        reject(error);
      })
      .on("end", async () => {
        if (businessHoursData.length > 0) {
          try {
            await BusinessHours.bulkCreate(businessHoursData);
          } catch (error) {
            console.error("Error inserting final business hours batch:", error);
            return reject(error);
          }
        }

        console.log("Business hours data imported successfully.");
        resolve();
      });
  });
}

async function importTimezone() {
  console.log("Importing timezone data...");
  const filePath = path.join(config.csvFolderPath, "timezone.csv");

  return new Promise((resolve, reject) => {
    const timezoneData = [];

    fs.createReadStream(filePath)
      .pipe(csv.parse({ headers: true }))
      .on("data", (row) => {
        timezoneData.push({
          store_id: row.store_id,
          timezone_str: row.timezone_str,
        });

        if (timezoneData.length >= 1000) {
          const batchData = [...timezoneData];
          timezoneData.length = 0;

          Timezone.bulkCreate(batchData, {
            updateOnDuplicate: ["timezone_str"],
          }).catch((err) => {
            console.error("Error inserting timezone batch:", err);
            reject(err);
          });
        }
      })
      .on("error", (error) => {
        console.error("Error parsing timezone CSV:", error);
        reject(error);
      })
      .on("end", async () => {
        if (timezoneData.length > 0) {
          try {
            await Timezone.bulkCreate(timezoneData, {
              updateOnDuplicate: ["timezone_str"],
            });
          } catch (error) {
            console.error("Error inserting final timezone batch:", error);
            return reject(error);
          }
        }

        console.log("Timezone data imported successfully.");
        resolve();
      });
  });
}
