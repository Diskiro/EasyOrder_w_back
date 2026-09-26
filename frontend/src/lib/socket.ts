import { io } from 'socket.io-client';
import { API_URL } from './api';

/**
 * SRP: Extraer de forma segura el origen base del servidor Socket.io a partir de API_URL
 */
function getSocketUrl(apiUrl: string): string {
    try {
        const parsed = new URL(apiUrl);
        return parsed.origin;
    } catch {
        return apiUrl.replace(/\/api\/?$/, '');
    }
}

const socketUrl = getSocketUrl(API_URL);

export const socket = io(socketUrl, {
    autoConnect: false,
});

