import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getHealthStatus = async (req: Request, res: Response) => {
    const status: any = {
        database: 'Offline',
        storage: 'Disconnected',
        uptime: process.uptime()
    };

    try {
        // Check Database
        await prisma.$queryRaw`SELECT 1`;
        status.database = 'Optimal';
    } catch (error) {
        status.database = 'Error';
    }

    try {
        // Check Cloudinary
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
            status.storage = 'Connected';
        } else {
            status.storage = 'Unconfigured';
        }
    } catch (error) {
        status.storage = 'Error';
    }

    res.status(200).json({ data: status });
};
