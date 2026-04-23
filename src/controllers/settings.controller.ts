// import { Request, Response } from 'express';
// import prisma from '../lib/prisma';

// export const getSettings = async (req: Request, res: Response) => {
//     try {
//         const settings = await prisma.systemSetting.findMany();
        
//         // Transform to object for easier consumption
//         const settingsMap = settings.reduce((acc: any, curr) => {
//             acc[curr.key] = curr.value;
//             return acc;
//         }, {});

//         res.status(200).json({ data: settingsMap });
//     } catch (error: any) {
//         res.status(500).json({ message: 'Gagal memuat pengaturan', error: error.message });
//     }
// };

// export const updateSettings = async (req: Request, res: Response) => {
//     try {
//         const updates = req.body; // Expecting { key: value, ... }

//         const operations = Object.entries(updates).map(([key, value]) => {
//             return prisma.systemSetting.upsert({
//                 where: { key },
//                 update: { value: String(value) },
//                 create: { key, value: String(value) }
//             });
//         });

//         await Promise.all(operations);

//         res.status(200).json({ message: 'Pengaturan berhasil diperbarui' });
//     } catch (error: any) {
//         res.status(500).json({ message: 'Gagal memperbarui pengaturan', error: error.message });
//     }
// };
