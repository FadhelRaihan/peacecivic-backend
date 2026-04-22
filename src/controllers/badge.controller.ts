import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { Role } from "../generated/client";

// Admin: Create Badge
export const createBadge = async (req: any, res: Response) => {
    try {
        if (req.user.role !== Role.ADMIN) {
            return res.status(403).json({ message: 'Akses khusus Admin' });
        }

        const { badge_name, description } = req.body;
        const iconFile = req.file;

        if (!badge_name || !description || !iconFile) {
            return res.status(400).json({ message: 'Data tidak lengkap (Nama, Deskripsi, dan Icon wajib)' });
        }

        const badge = await prisma.badge.create({
            data: {
                badge_name,
                description,
                badge_icon_url: (iconFile as any).path
            }
        });

        res.status(201).json({
            message: 'Lencana berhasil dibuat',
            data: badge
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal membuat lencana', error: error.message });
    }
};

// Get all badges
export const getAllBadges = async (req: Request, res: Response) => {
    try {
        const badges = await prisma.badge.findMany({
            orderBy: { badge_name: 'asc' }
        });
        res.status(200).json({ data: badges });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal mengambil data lencana', error: error.message });
    }
};

// Admin: Delete Badge
export const deleteBadge = async (req: any, res: Response) => {
    try {
        if (req.user.role !== Role.ADMIN) {
            return res.status(403).json({ message: 'Akses khusus Admin' });
        }

        const { id } = req.params;

        await prisma.badge.delete({
            where: { id }
        });

        res.status(200).json({ message: 'Lencana berhasil dihapus' });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal menghapus lencana', error: error.message });
    }
};
