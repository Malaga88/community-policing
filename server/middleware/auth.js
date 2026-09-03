const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Reads a Bearer token if one is present and, if valid, attaches the
// corresponding user to req.user. Does NOT block the request when no token
// is present or the token is invalid — used on routes like POST /api/reports
// where logging in is optional (an identified report can still be submitted
// with just a typed name, per models/Report.js).
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (user) req.user = user;
  } catch (err) {
    // Invalid/expired token: proceed as an unauthenticated request rather
    // than failing the whole submission.
  }

  next();
}

// Strict variant for routes that should only work when logged in.
// Not used by any route yet (no such route exists), but kept here ready
// for whenever an account-only feature, e.g. "my reports", is added.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "You must be logged in to do that." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "Account no longer exists." });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
}

module.exports = { optionalAuth, requireAuth };
