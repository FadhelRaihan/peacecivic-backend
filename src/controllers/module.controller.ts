import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ModuleCategory } from '../generated/client';

export const getAllModules = async (req: Request, res: Response) => {
    try {
        const { category } = req.query;

        const whereClause = category ? { category: category as ModuleCategory } : {};

        const modules = await prisma.module.findMany({
            where: whereClause,
            select: {
                id: true,
                title: true,
                slug: true,
                category: true,
                thumbnail_url: true,
            },
            orderBy: { title: 'asc' }
        });

        res.status(200).json({ data: modules });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengambil data modul', error: error.message || error });
    }
};

export const getModuleBySlug = async (req: any, res: Response) => {
    try {
        const { slug } = req.params;
        const userId = req.user.userId;

        const moduleData = await prisma.module.findUnique({
            where: { slug },
        });

        if (!moduleData) {
            return res.status(404).json({ message: 'Module tidak ditemukan' });
        }

        const progress = await prisma.userProgress.findUnique({
            where: {
                user_id_module_id: {
                    user_id: userId,
                    module_id: moduleData.id,
                },
            },
        });

        res.status(200).json({
            data: moduleData,
            is_complete: progress?.is_completed || false,
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengambil data modul', error: error.message || error });
    }
}

export const markModuleAsComplete = async (req: any, res: Response) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user.userId;

        const existingProgress = await prisma.userProgress.findUnique({
            where: {
                user_id_module_id: {
                    user_id: userId,
                    module_id: moduleId,
                }
            }
        });

        if (existingProgress?.is_completed) {
            return res.status(200).json({
                message: 'Modul sudah pernah diselesaikan sebelumnnya, tidak ada tambahan poin'
            });
        }

        const progress = await prisma.userProgress.upsert({
            where: {
                user_id_module_id: {
                    user_id: userId,
                    module_id: moduleId,
                },
            },
            update: {
                is_completed: true,
                completed_at: new Date(),
            },
            create: {
                user_id: userId,
                module_id: moduleId,
                is_completed: true,
                completed_at: new Date(),
            },
        });

        await prisma.user.update({
            where: { id: userId },
            data: { points: { increment: 1 } }
        })

        res.status(200).json({ message: 'Modul berhasil diselesaikan', progress });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menyelesaikan modul', error: error.message || error });
    }
}