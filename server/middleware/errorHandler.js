// 404 handler — anything that reaches here didn't match a route or a
// static file in /public.
function notFound(req, res, next) {
  res.status(404).json({ message: `Not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler. Anything thrown or passed to next(err) anywhere
// in the app ends up here, so error responses stay consistent.
function errorHandler(err, req, res, next) {
  console.error(err.stack || err.message);

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(" ") });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: "That email is already registered." });
  }

  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Something went wrong on the server." });
}

module.exports = { notFound, errorHandler };
