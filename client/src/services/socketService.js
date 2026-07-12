import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => socket;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  // Since Vite proxies /socket.io to http://localhost:5050, 
  // we can connect directly using window.location.origin
  socket = io(window.location.origin, {
    auth: { token },
    autoConnect: true,
    reconnection: true,
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
