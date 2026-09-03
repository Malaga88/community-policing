require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const morgan = require("morgan");

const connectDB = require("./config/db");
const reportRoutes = require("./routes/reportRoutes");
const authRoutes = require("./routes/authRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(cors({ origin: "https://malaga88.github.io" }));
app.use(express.json());
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

// ---- API routes ----
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/reports", reportRoutes);
app.use("/api/auth", authRoutes);

// ---- Serve the frontend (public/index.html, report.html, dashboard.html) ----
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// Anything under /api that didn't match a route above is a genuine 404.
// Anything else falls back to the frontend so links like /dashboard.html
// keep working even if a static file lookup somehow misses.
app.use("/api", notFound);
app.use((req, res) => res.sendFile(path.join(publicDir, "index.html")));

app.use(errorHandler);

// connectDB() is awaited here on purpose: the server only starts listening
// (and only ever logs "running") once MongoDB is actually reachable, rather
// than appearing "up" for a moment before an unreachable database kills it.
const PORT = process.env.PORT || 5000;
(async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`GubiWatch server running at http://localhost:${PORT}`);
  });
})();
