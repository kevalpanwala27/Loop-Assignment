const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

router.post("/trigger_report", reportController.triggerReport);
router.get("/get_report/:reportId", reportController.getReport);

module.exports = router;
