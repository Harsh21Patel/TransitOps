
import { useEffect } from 'react';
import { getSocket } from '../services/socketService';

/**
 * Custom hook to register a Socket.IO event listener.
 * Automatically cleans up the listener on unmount.
 * 
 * @param {string} event - The name of the event to listen for
 * @param {Function} callback - The callback function when the event is received
 */
export const useSocketListener = (event, callback) => {
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [event, callback]);
};
