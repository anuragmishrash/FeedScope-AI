import { io } from 'socket.io-client';

// In dev (localhost), point to local server. In production (Vercel), point to Render.
const SOCKET_URL = import.meta.env.DEV
    ? 'http://localhost:5000'
    : 'https://feedscope-backend.onrender.com';

let socket = null;

export const connectSocket = () => {
    if (socket?.connected) return socket;
    socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
    });
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = () => socket;
