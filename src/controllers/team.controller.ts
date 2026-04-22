import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import crypto from 'crypto';

export const createTeam = async (req: any, res: Response) => {
    try {
        const { team_name } = req.body;
        const userId = req.user.userId;

        const invite_code = crypto.randomBytes(3).toString('hex').toUpperCase();

        const team = await prisma.$transaction(async (tx) => {
            const newTeam = await tx.team.create({
                data: {
                    team_name,
                    invite_code,
                },
            });

            await tx.teamMember.create({
                data: {
                    team_id: newTeam.id,
                    user_id: userId,
                },
            });

            return newTeam;
        });

        res.status(201).json({ message: 'Tim berhasil dibuat', team });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal membuat tim', error: error.message || error})
    }
}

export const joinTeam = async (req: any, res: Response) => {
    try {
        const { invite_code } = req.body;
        const userId = req.user.userId;

        const team = await prisma.team.findUnique({
            where: { invite_code },
        });

        if (!team) {
            return res.status(404).json({ message: 'Kode tim tidak valid' });
        }

        const existingMember = await prisma.teamMember.findUnique({
            where: {
                team_id_user_id: {
                    team_id: team.id,
                    user_id: userId,
                },
            },
        });

        if (existingMember) {
            return res.status(400).json({ message: 'Kamu sudah berada di tim ini' });
        }

        await prisma.teamMember.create({
            data: {
                team_id: team.id,
                user_id: userId,
            },
        });

        res.status(200).json({ message: 'Berhasil bergabung dengan tim' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal bergabung dengan tim', error: error.message || error });
    }
}

export const deleteTeamManagement = async (req: any, res: Response) => {
    try {
        const { teamId } = req.params;

        if (req.user.role !== 'TEACHER' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Akses tidak diizinkan' });
        }

        // Logic to verify if team belongs to teacher's class could be added here
        // For now, simpler:
        await prisma.team.delete({
            where: { id: teamId }
        });

        res.status(200).json({ message: 'Tim berhasil dihapus' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menghapus tim', error: error.message });
    }
};

export const removeMemberManagement = async (req: any, res: Response) => {
    try {
        const { teamId, userId } = req.params;

        if (req.user.role !== 'TEACHER' && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Akses tidak diizinkan' });
        }

        await prisma.teamMember.delete({
            where: {
                team_id_user_id: {
                    team_id: teamId,
                    user_id: userId
                }
            }
        });

        res.status(200).json({ message: 'Anggota berhasil dikeluarkan' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengeluarkan anggota', error: error.message });
    }
};