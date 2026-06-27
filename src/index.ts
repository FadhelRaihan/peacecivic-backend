import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import teamRoutes from './routes/team.routes';
import moduleRoutes from './routes/module.routes';
import chatRoutes from './routes/chat.routes';
import projectRoutes from './routes/project.routes';
import userRoutes from './routes/user.routes';
import teacherRoutes from './routes/teacher.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import badgeRoutes from './routes/badge.routes';
import adminRoutes from './routes/admin.routes';
import { setupSocket } from './socket/index';

const app: Application = express();
const httpServer = createServer(app);

// Setup Socket.io
const io = new Server(httpServer, {
    cors: {
        origin: '*', // Ubah ke domain ketika prod
        methods: ['GET', 'POST']
    }
});

// Fungsi setup socket
setupSocket(io);

const PORT = process.env.PORT || 5000;

// Middleware

// Development
// app.use(cors({
//     origin: ['http://localhost:3000', 'http://localhost:5173'], 
//     credentials: true
// }));

// Production
app.use(cors({
    origin: ['https://peacecivic.vercel.app'], 
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test Route
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Welcome to PeaceCivic API'});
});

// Socket.io Connection
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Event saat user disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Running Server
httpServer.listen(PORT, () => {
    console.log(`[Server]: PeaceCivic Backend is running on port ${PORT}`);
});


// Auth Routes
app.use('/api/auth', authRoutes);

// Team Routes
app.use('/api/team', teamRoutes);

// Module Routes
app.use('/api/modules', moduleRoutes);

// Chat Routes
app.use('/api/chat', chatRoutes);

// Project Routes
app.use('/api/projects', projectRoutes);

// User Routes
app.use('/api/users', userRoutes);

// Teacher Routes
app.use('/api/teacher', teacherRoutes);

// Leaderboard Routes
app.use('/api/leaderboard', leaderboardRoutes);

// Badge Routes
app.use('/api/badges', badgeRoutes);

// Admin Routes
app.use('/api/admin', adminRoutes);
