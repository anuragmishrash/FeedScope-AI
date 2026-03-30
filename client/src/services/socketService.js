import { io } from 'socket.io-client';

// Hardcoded for production to bypass Vercel environment variable injection bugs
const SOCKET_URL = 'https://feedscope-backend.onrender.com';

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
