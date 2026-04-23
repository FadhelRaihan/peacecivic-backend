import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { TriggerType } from '../generated/client';
import { checkMissions } from '../services/automation.service';

export const setupSocket = (io: Server) => {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Autentikasi gagal: Token tidak ada'));

        jwt.verify(token, process.env.JWT_SECRET as string, (err: any, decoded: any) => {
            if (err) return next(new Error('Autentikasi gagal: Token tidak valid'));
            socket.data.user = decoded;
            next();
        });
    });

    io.on('connection', async (socket: Socket) => {
        const userId = socket.data.user.userId;
        
        // Ambil data user untuk kebutuhan real-time (seperti typing indicator)
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { full_name: true }
            });
            if (user) {
                socket.data.user.full_name = user.full_name;
            }
        } catch (error) {
            console.error('Gagal mengambil data user untuk socket:', error);
        }

        console.log(`User Connected: ${userId} (Socket ID: ${socket.id})`);

        socket.join('forum_room');

        try {
            const userTeams = await prisma.teamMember.findMany({
                where: { user_id: userId },
                select: { team_id: true }
            });

            userTeams.forEach(team => {
                socket.join(`team_room_${team.team_id}`);
            });
        } catch (error) {
            console.error('Error saat join room tim:', error);
        }

        // --- Typing Indicator Events ---
        socket.on('typing', (payload: { is_forum: boolean, team_id?: string }) => {
            const { is_forum, team_id } = payload;
            const room = is_forum ? 'forum_room' : `team_room_${team_id}`;
            socket.to(room).emit('user_typing', { 
                userId, 
                fullName: socket.data.user.full_name 
            });
        });

        socket.on('stop_typing', (payload: { is_forum: boolean, team_id?: string }) => {
            const { is_forum, team_id } = payload;
            const room = is_forum ? 'forum_room' : `team_room_${team_id}`;
            socket.to(room).emit('user_stop_typing', { userId });
        });

        socket.on('send_message', async (payload: { is_forum: boolean, team_id?: string, message_body: string }) => {
            try {
                const { is_forum, team_id, message_body } = payload;
                if (!message_body || message_body.trim() === '') return;
                const savedMessage = await prisma.message.create({
                    data: {
                        sender_id: userId,
                        is_forum: is_forum,
                        team_id: is_forum ? null : team_id,
                        message_body: message_body
                    },
                    include: {
                        sender: { select: { id: true, full_name: true, avatar_url: true, role: true } }
                    }
                });

                // Clear typing indicator for everyone when message is sent
                const room = is_forum ? 'forum_room' : `team_room_${team_id}`;
                io.to(room).emit('user_stop_typing', { userId });

                if (is_forum) {
                    io.to('forum_room').emit('receive_message', savedMessage);
                } else if (team_id) {
                    io.to(`team_room_${team_id}`).emit('receive_message', savedMessage);
                }

                // Automation: Check Missions
                await checkMissions(userId, TriggerType.CHAT_COUNT);

            } catch (error) {
                console.error('Gagal menyimpan atau mengirim pesan:', error);
                socket.emit('error', { message: 'Pesan gagal dikirim' });
            }
        });

        socket.on('disconnect', () => {
            console.log(`User Disconnected: ${userId}`);
        });
    });
};