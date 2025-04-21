const { Report } = require("../models");
const { generateReport } = require("../services/reportService");
const path = require("path");
const fs = require("fs");

exports.triggerReport = async (req, res, next) => {
  try {
    const report = await Report.create({
      status: "running",
    });

    generateReport(report.report_id).catch((error) =>
      console.error(`Error generating report ${report.report_id}:`, error)
    );

    return res.status(200).json({
      report_id: report.report_id,
    });
  } catch (error) {
    next(error);
  }
};

exports.getReport = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findByPk(reportId);

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (report.status === "running") {
      return res.status(200).json({ status: "Running" });
    }

    if (report.file_path && fs.existsSync(report.file_path)) {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=report-${reportId}.csv`
      );

      const fileStream = fs.createReadStream(report.file_path);
      return fileStream.pipe(res);
    } else {
      return res.status(500).json({ error: "Report file not found" });
    }
  } catch (error) {
    next(error);
  }
};
