// middleware/logger.js
function logger(req, res, next) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next(); // IMPORTANT: pass control to the next middleware
}

module.exports = logger;