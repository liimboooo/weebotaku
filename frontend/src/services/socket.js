import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_API_URL
  ? process.env.REACT_APP_API_URL.replace('/api', '')
  : 'http://localhost:5000';

let socket = null;

export function connectSocket() {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('token');
  if (!token) return null;

  socket = io(`${SOCKET_URL}/api/socket`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 3000,
  });

  socket.on('notification', (data) => {
    window.dispatchEvent(new CustomEvent('server-notification', { detail: data }));
  });

  socket.on('connect_error', () => {});
  socket.on('disconnect', () => {});

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket() {
  return socket;
}
