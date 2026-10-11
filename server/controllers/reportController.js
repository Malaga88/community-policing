const Report = require("../models/Report");
const { INCIDENT_CATEGORIES, SEVERITY_LEVELS } = require("../models/Report");

// GET /api/reports
// GET /api/reports?category=theft
// GET /api/reports?severity=high
// Returns reports newest-first. Optionally filtered by category — this is
// what powers both the dashboard's filter chips and the map's markers.
async function getReports(req, res) {
  try {
    const { category, severity } = req.query;
    const filter = {};

    if (category && category !== "all") {
      if (!INCIDENT_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: `Unknown category: ${category}` });
      }
      filter.category = category;
    }

    if (severity && severity !== "all") {
      if (!SEVERITY_LEVELS.includes(severity)) {
        return res.status(400).json({ message: `Unknown severity: ${severity}` });
      }
      filter.severity = severity;
    }

    const reports = await Report.find(filter).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    console.error("getReports error:", err.message);
    res.status(500).json({ message: "Could not fetch reports" });
  }
}

// GET /api/reports/stats
// Small aggregate used for the dashboard's stats strip, so the frontend
// doesn't have to download every report just to compute a total/top category.
async function getReportStats(req, res) {
  try {
    const total = await Report.countDocuments();

    const byCategory = await Report.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const anonymousCount = await Report.countDocuments({ isAnonymous: true });

    res.json({
      total,
      topCategory: byCategory[0] ? byCategory[0]._id : null,
      anonymousSharePercent: total > 0 ? Math.round((anonymousCount / total) * 100) : 0,
      byCategory,
    });
  } catch (err) {
    console.error("getReportStats error:", err.message);
    res.status(500).json({ message: "Could not fetch report statistics" });
  }
}

// POST /api/reports
// Creates a new incident report. Works for both anonymous and identified
// submissions — no login is required for either. When a valid token IS
// present (see middleware/auth.js optionalAuth) and the report is not
// anonymous, the report is linked to that account via reportedBy as well
// as the typed reporterName, for whenever account-based reports matter.
async function createReport(req, res, next) {
  try {
    const { category, severity, description, location, lat, lng, isAnonymous, reporterName } = req.body;
    const anonymous = !(isAnonymous === false || isAnonymous === "false");

    const report = await Report.create({
      category,
      severity: severity || undefined, // omitted -> schema default ("medium")
      description,
      location,
      lat: lat !== undefined && lat !== "" ? Number(lat) : undefined,
      lng: lng !== undefined && lng !== "" ? Number(lng) : undefined,
      isAnonymous: anonymous,
      // A valid login always wins over whatever name was typed, so a named report
      // can't be attributed to someone else.
      reporterName: anonymous ? undefined : (req.user ? req.user.fullName : reporterName),
      reportedBy: !anonymous && req.user ? req.user._id : null,
    });

    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
}

module.exports = { getReports, getReportStats, createReport };
