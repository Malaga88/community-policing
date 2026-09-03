const express = require("express");
const { getReports, getReportStats, createReport } = require("../controllers/reportController");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/reports            -> all reports, newest first
// GET /api/reports?category=x -> filtered by category
router.get("/", getReports);

// GET /api/reports/stats -> total / top category / % anonymous, for the
// dashboard's stats strip
router.get("/stats", getReportStats);

// POST /api/reports -> create a report. optionalAuth means a Bearer token
// is read if present, but is never required.
router.post("/", optionalAuth, createReport);

module.exports = router;
