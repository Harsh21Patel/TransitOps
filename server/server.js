require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./socket/socketManager');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Attach io to app so controllers (added in later modules, e.g. Trip Dispatch)
// can emit real-time events via req.app.get('io').
app.set('io', io);
initSocket(io);

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`[TransitOps API] Listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
};

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

start();
