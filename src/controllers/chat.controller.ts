import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getForumHistory = async (req: Request, res: Response) => {
    try {
        const messages = await prisma.message.findMany({
            where: { is_forum: true },
            orderBy: { created_at: 'asc' },
            take: 100,
            include: {
                sender: {
                    select: { id: true, full_name: true, avatar_url: true, role: true }
                }
            }
        });

        res.status(200).json({ data: messages });
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil riwayat forum', error });
    }
};

export const getTeamChatHistory = async (req: any, res: Response) => {
    try {
        const { teamId } = req.params;
        const userId = req.user.userId;

        const isMember = await prisma.teamMember.findUnique({
            where: { team_id_user_id: { team_id: teamId, user_id: userId } }
        });

        if (!isMember) {
            return res.status(403).json({ message: 'Akses ditolak, bukan anggota tim' });
        }

        const messages = await prisma.message.findMany({
            where: { team_id: teamId, is_forum: false },
            orderBy: { created_at: 'asc' },
            take: 100,
            include: {
                sender: {
                    select: { id: true, full_name: true, avatar_url: true }
                }
            }
        });

        res.status(200).json({ data: messages });
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil riwayat chat tim', error });
    }
};