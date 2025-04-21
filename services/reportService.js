const { StoreStatus, BusinessHours, Timezone, Report } = require("../models");
const { sequelize, Sequelize } = require("../models");
const { Op } = Sequelize;
const fs = require("fs");
const path = require("path");
const { createObjectCsvWriter } = require("csv-writer");
const moment = require("moment-timezone");
const config = require("../config/app");

if (!fs.existsSync(config.reportOutputPath)) {
  fs.mkdirSync(config.reportOutputPath, { recursive: true });
}

exports.generateReport = async (reportId) => {
  try {
    console.log(`Starting generation of report ${reportId}...`);

    const stores = await StoreStatus.findAll({
      attributes: [
        [Sequelize.fn("DISTINCT", Sequelize.col("store_id")), "store_id"],
      ],
      raw: true,
    });

    const maxTimestampResult = await StoreStatus.findOne({
      attributes: [
        [sequelize.fn("MAX", sequelize.col("timestamp_utc")), "max_timestamp"],
      ],
      raw: true,
    });

    const currentTimestamp = moment.utc(maxTimestampResult.max_timestamp);
    console.log(`Current timestamp set to: ${currentTimestamp.format()}`);

    const reportFilePath = path.join(
      config.reportOutputPath,
      `report-${reportId}.csv`
    );
    const csvWriter = createObjectCsvWriter({
      path: reportFilePath,
      header: [
        { id: "store_id", title: "store_id" },
        { id: "uptime_last_hour", title: "uptime_last_hour(in minutes)" },
        { id: "uptime_last_day", title: "uptime_last_day(in hours)" },
        { id: "uptime_last_week", title: "uptime_last_week(in hours)" },
        { id: "downtime_last_hour", title: "downtime_last_hour(in minutes)" },
        { id: "downtime_last_day", title: "downtime_last_day(in hours)" },
        { id: "downtime_last_week", title: "downtime_last_week(in hours)" },
      ],
    });

    const reportData = [];
    for (const store of stores) {
      const storeId = store.store_id;
      console.log(`Processing store ${storeId}...`);

      const timezone = await Timezone.findByPk(storeId);
      const timezoneStr = timezone ? timezone.timezone_str : "America/Chicago";

      const businessHours = await BusinessHours.findAll({
        where: { store_id: storeId },
        raw: true,
      });

      const is24x7 = businessHours.length === 0;

      const lastHourStart = moment(currentTimestamp).subtract(1, "hour");
      const lastDayStart = moment(currentTimestamp).subtract(1, "day");
      const lastWeekStart = moment(currentTimestamp).subtract(1, "week");

      const observations = await StoreStatus.findAll({
        where: {
          store_id: storeId,
          timestamp_utc: {
            [Op.gte]: lastWeekStart.format(),
            [Op.lte]: currentTimestamp.format(),
          },
        },
        order: [["timestamp_utc", "ASC"]],
        raw: true,
      });

      const metrics = calculateMetrics(
        observations,
        businessHours,
        timezoneStr,
        currentTimestamp,
        lastHourStart,
        lastDayStart,
        lastWeekStart,
        is24x7
      );

      reportData.push({
        store_id: storeId,
        ...metrics,
      });
    }

    await csvWriter.writeRecords(reportData);

    await Report.update(
      {
        status: "complete",
        file_path: reportFilePath,
      },
      { where: { report_id: reportId } }
    );

    console.log(`Report ${reportId} generated successfully`);
  } catch (error) {
    console.error(`Error generating report ${reportId}:`, error);
  }
};

function isWithinBusinessHours(timestamp, businessHours, timezoneStr, is24x7) {
  if (is24x7) return true;

  const localTime = moment(timestamp).tz(timezoneStr);
  const dayOfWeek = localTime.day();
  const adjustedDayOfWeek = (dayOfWeek + 6) % 7;

  const hoursForDay = businessHours.filter(
    (h) => h.day_of_week === adjustedDayOfWeek
  );

  if (hoursForDay.length === 0) return false;

  const currentTimeStr = localTime.format("HH:mm:ss");

  for (const hours of hoursForDay) {
    if (
      currentTimeStr >= hours.start_time_local &&
      currentTimeStr <= hours.end_time_local
    ) {
      return true;
    }
  }

  return false;
}

function calculateMetrics(
  observations,
  businessHours,
  timezoneStr,
  currentTimestamp,
  lastHourStart,
  lastDayStart,
  lastWeekStart,
  is24x7
) {
  const metrics = {
    uptime_last_hour: 0,
    uptime_last_day: 0,
    uptime_last_week: 0,
    downtime_last_hour: 0,
    downtime_last_day: 0,
    downtime_last_week: 0,
  };

  if (observations.length === 0) {
    return metrics;
  }

  const hourObservations = observations.filter((obs) =>
    moment
      .utc(obs.timestamp_utc)
      .isBetween(lastHourStart, currentTimestamp, undefined, "[]")
  );

  const dayObservations = observations.filter((obs) =>
    moment
      .utc(obs.timestamp_utc)
      .isBetween(lastDayStart, currentTimestamp, undefined, "[]")
  );

  const weekObservations = observations.filter((obs) =>
    moment
      .utc(obs.timestamp_utc)
      .isBetween(lastWeekStart, currentTimestamp, undefined, "[]")
  );

  const hourMetrics = calculateTimeRangeMetrics(
    hourObservations,
    businessHours,
    timezoneStr,
    lastHourStart,
    currentTimestamp,
    is24x7,
    "minute"
  );

  const dayMetrics = calculateTimeRangeMetrics(
    dayObservations,
    businessHours,
    timezoneStr,
    lastDayStart,
    currentTimestamp,
    is24x7,
    "hour"
  );

  const weekMetrics = calculateTimeRangeMetrics(
    weekObservations,
    businessHours,
    timezoneStr,
    lastWeekStart,
    currentTimestamp,
    is24x7,
    "hour"
  );

  return {
    uptime_last_hour: hourMetrics.uptime,
    downtime_last_hour: hourMetrics.downtime,
    uptime_last_day: dayMetrics.uptime,
    downtime_last_day: dayMetrics.downtime,
    uptime_last_week: weekMetrics.uptime,
    downtime_last_week: weekMetrics.downtime,
  };
}

function calculateTimeRangeMetrics(
  observations,
  businessHours,
  timezoneStr,
  startTime,
  endTime,
  is24x7,
  unit
) {
  if (observations.length === 0) {
    return { uptime: 0, downtime: 0 };
  }

  let activeCount = 0;
  let inactiveCount = 0;
  let totalObservations = 0;

  for (const obs of observations) {
    const timestamp = moment.utc(obs.timestamp_utc);
    if (isWithinBusinessHours(timestamp, businessHours, timezoneStr, is24x7)) {
      totalObservations++;
      if (obs.status === "active") {
        activeCount++;
      } else {
        inactiveCount++;
      }
    }
  }

  if (totalObservations === 0) {
    return { uptime: 0, downtime: 0 };
  }

  const businessHoursDuration = calculateBusinessHoursDuration(
    startTime,
    endTime,
    businessHours,
    timezoneStr,
    is24x7,
    unit
  );

  const uptimeRatio = activeCount / totalObservations;
  const downtimeRatio = inactiveCount / totalObservations;

  const uptime = uptimeRatio * businessHoursDuration;
  const downtime = downtimeRatio * businessHoursDuration;

  return {
    uptime: Math.round(uptime * 100) / 100,
    downtime: Math.round(downtime * 100) / 100,
  };
}

function calculateBusinessHoursDuration(
  startTime,
  endTime,
  businessHours,
  timezoneStr,
  is24x7,
  unit
) {
  if (is24x7) {
    return getTimeDifferenceInUnit(startTime, endTime, unit);
  }

  let duration = 0;
  const currentTime = moment(startTime);

  while (currentTime.isBefore(endTime)) {
    if (isWithinBusinessHours(currentTime, businessHours, timezoneStr, false)) {
      duration += unit === "minute" ? 1 / 60 : 1;
    }
    currentTime.add(1, unit);
  }

  return duration;
}

function getTimeDifferenceInUnit(startTime, endTime, unit) {
  const start = moment(startTime);
  const end = moment(endTime);

  if (unit === "minute") {
    return end.diff(start, "minutes");
  } else {
    return end.diff(start, "hours");
  }
}
