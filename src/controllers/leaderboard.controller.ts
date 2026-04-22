import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            where: { role: 'STUDENT' },
            orderBy: { points: 'desc' },
            take: 100,
            select: {
                id: true,
                full_name: true,
                avatar_url: true,
                points: true,
                class_room: true
            }
        });

        res.status(200).json({ data: users });
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ message: 'Gagal mengambil data peringkat', error });
    }
};
