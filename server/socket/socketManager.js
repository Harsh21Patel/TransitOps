const { verifyAccessToken } = require('../utils/tokenUtils');

/**
 * Initializes Socket.IO with JWT-based connection auth (client sends the
 * access token via `auth: { token }` on connect) and joins each socket to a
 * personal room (`user:<id>`) and a role room (`role:<role>`), so later
 * modules (Trip Dispatch board, Notifications) can target broadcasts.
 */
const initSocket = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
    socket.join(`role:${socket.userRole}`);

    socket.on('disconnect', () => {
      // No-op for now; presence tracking can be added in a later module.
    });
  });
};

module.exports = { initSocket };
