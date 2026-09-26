import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { pool } from './config/db';
import authRouter from './routes/auth';
import tablesRouter from './routes/tables';
import menuRouter from './routes/menu';
import ordersRouter from './routes/orders';
import analyticsRouter from './routes/analytics';
import reservationsRouter from './routes/reservations';
import cashRegisterRouter from './routes/cash-register';
import restaurantsRouter from './routes/restaurants';

import { createCorsOptions, isOriginAllowed } from './config/cors';
import { resolveTenant } from './middleware/tenant';
import { requireActiveSubscription } from './middleware/subscription';
import { requireFeature } from './middleware/featureGate';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost', 'http://127.0.0.1'];

const corsOptions = createCorsOptions(allowedOrigins);

// Setup Socket.io for Realtime
export const io = new Server(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (isOriginAllowed(origin, allowedOrigins)) {
                callback(null, true);
            } else {
                callback(new Error('CORS bloqueado para Socket.io'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        credentials: true
    }
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Inquilinos y Control de Suscripciones (Multi-Tenant & Subscription Control)
app.use(resolveTenant);
app.use('/api', requireActiveSubscription);

// Attach io to requests
app.set('io', io);

// Load Routers con Feature Gates
app.use('/api/restaurants', restaurantsRouter);
app.use('/api/auth', authRouter);
app.use('/api/tables', tablesRouter);
app.use('/api/menu', menuRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/analytics', requireFeature('has_analytics'), analyticsRouter);
app.use('/api/reservations', requireFeature('has_reservations'), reservationsRouter);
app.use('/api/cash-register', requireFeature('has_cash_register'), cashRegisterRouter);

// Basic healthcheck
app.get('/api/health', async (req, res) => {
    try {
        const dbRes = await pool.query('SELECT NOW() as time');
        res.json({ status: 'ok', time: dbRes.rows[0].time });
    } catch (err: any) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
