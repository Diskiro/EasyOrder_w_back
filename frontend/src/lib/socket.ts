import { io } from 'socket.io-client';
import { API_URL } from './api';

const socketUrl = API_URL.replace('/api', '');

export const socket = io(socketUrl, {
    autoConnect: false,
});
