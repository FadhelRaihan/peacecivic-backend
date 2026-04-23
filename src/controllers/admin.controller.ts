import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { Role } from '../generated/client';

export const getUsers = async (req: any, res: Response) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Akses khusus Admin' });
        }

        const users = await prisma.user.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                _count: {
                    select: {
                        team_members: true,
                        progress: true,
                        missions: true,
                        badges_received: true
                    }
                },
                team_members: {
                    include: {
                        team: {
                            include: { projects: true }
                        }
                    }
                },
                badges_received: {
                    include: { badge: true }
                }
            }
        });

        res.status(200).json({ data: users });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memuat data user', error: error.message });
    }
};

export const createUser = async (req: any, res: Response) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Akses khusus Admin' });
        }

        const { full_name, email, password, role, class_room } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email sudah terdaftar' });
        }

        const hashedPassword = await bcrypt.hash(password || 'password123', 12);

        const user = await prisma.user.create({
            data: {
                full_name,
                email,
                password_hash: hashedPassword,
                role: role || Role.STUDENT,
                class_room: class_room || null,
            },
        });

        res.status(201).json({ message: 'User berhasil dibuat', data: user });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal membuat user', error: error.message });
    }
};

export const updateUser = async (req: any, res: Response) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Akses khusus Admin' });
        }

        const { id } = req.params;
        const { full_name, email, role, class_room, points, password } = req.body;

        // Find existing user to check class change
        const existingUser = await prisma.user.findUnique({
            where: { id },
            include: { team_members: true }
        });

        if (!existingUser) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        const data: any = {
            full_name,
            email,
            role,
            class_room,
            points: points !== undefined ? parseInt(points) : undefined
        };

        if (password) {
            data.password_hash = await bcrypt.hash(password, 12);
        }

        // Logic: If Student changes Class, remove from Team
        if (existingUser.role === 'STUDENT' && class_room && existingUser.class_room !== class_room) {
            if (existingUser.team_members.length > 0) {
                // Remove from all teams (usually students have only 1 team in this system)
                await prisma.teamMember.deleteMany({
                    where: { user_id: id }
                });
                console.log(`User ${id} removed from teams due to class change to ${class_room}`);
            }
        }

        const user = await prisma.user.update({
            where: { id },
            data
        });

        res.status(200).json({ message: 'User berhasil diperbarui', data: user });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memperbarui user', error: error.message });
    }
};

export const deleteUser = async (req: any, res: Response) => {
    try {
        if (req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Akses khusus Admin' });
        }

        const { id } = req.params;

        if (id === req.user.userId) {
            return res.status(400).json({ message: 'Tidak dapat menghapus akun sendiri' });
        }

        await prisma.user.delete({ where: { id } });

        res.status(200).json({ message: 'User berhasil dihapus secara permanen' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menghapus user', error: error.message });
    }
};

// Relation Management
export const awardBadge = async (req: any, res: Response) => {
    try {
        const { userId, badgeId } = req.body;
        const awardedBadge = await prisma.userBadge.create({
            data: {
                user_id: userId,
                badge_id: badgeId,
                awarded_by: req.user.userId
            }
        });
        res.status(201).json({ message: 'Lencana berhasil diberikan', data: awardedBadge });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal memberikan lencana', error: error.message });
    }
};

export const revokeBadge = async (req: any, res: Response) => {
    try {
        const { userBadgeId } = req.params;
        await prisma.userBadge.delete({ where: { id: userBadgeId } });
        res.status(200).json({ message: 'Lencana berhasil ditarik' });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal menarik lencana', error: error.message });
    }
};

export const removeUserFromTeam = async (req: any, res: Response) => {
    try {
        const { teamMemberId } = req.params;
        await prisma.teamMember.delete({ where: { id: teamMemberId } });
        res.status(200).json({ message: 'User berhasil dikeluarkan dari tim' });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal mengeluarkan user dari tim', error: error.message });
    }
};

// Module Management
export const getModules = async (req: any, res: Response) => {
    try {
        const modules = await prisma.module.findMany({
            orderBy: { title: 'asc' }
        });
        res.status(200).json({ data: modules });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal memuat modul', error: error.message });
    }
};

export const createModule = async (req: any, res: Response) => {
    try {
        const { title, slug, video_url, category } = req.body;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        
        const thumbnail_url = files && files['thumbnail'] ? files['thumbnail'][0].path : req.body.thumbnail_url;
        const pdf_url = files && files['pdf'] ? files['pdf'][0].path : req.body.pdf_url;

        const module = await prisma.module.create({
            data: { 
                title, 
                slug, 
                video_url, 
                pdf_url: pdf_url || null, 
                category, 
                thumbnail_url: thumbnail_url || null 
            }
        });
        res.status(201).json({ message: 'Modul berhasil dibuat', data: module });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal membuat modul', error: error.message });
    }
};

export const updateModule = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { title, slug, video_url, category } = req.body;
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        const currentModule = await prisma.module.findUnique({ where: { id } });
        if (!currentModule) return res.status(404).json({ message: 'Modul tidak ditemukan' });

        const thumbnail_url = files && files['thumbnail'] ? files['thumbnail'][0].path : req.body.thumbnail_url;
        const pdf_url = files && files['pdf'] ? files['pdf'][0].path : req.body.pdf_url;

        const module = await prisma.module.update({
            where: { id },
            data: { 
                title, 
                slug, 
                video_url, 
                pdf_url: pdf_url || currentModule.pdf_url, 
                category, 
                thumbnail_url: thumbnail_url || currentModule.thumbnail_url 
            }
        });
        res.status(200).json({ message: 'Modul berhasil diperbarui', data: module });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal memperbarui modul', error: error.message });
    }
};

export const deleteModule = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.module.delete({ where: { id } });
        res.status(200).json({ message: 'Modul berhasil dihapus' });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal menghapus modul', error: error.message });
    }
};

// Mission Management
export const getMissions = async (req: any, res: Response) => {
    try {
        const missions = await prisma.mission.findMany({
            include: { badge_reward: true },
            orderBy: { points_reward: 'asc' }
        });
        res.status(200).json({ data: missions });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal memuat misi', error: error.message });
    }
};

export const createMission = async (req: any, res: Response) => {
    try {
        const { title, description, points_reward, trigger_type, trigger_count, badge_reward_id } = req.body;
        const mission = await prisma.mission.create({
            data: { 
                title, 
                description, 
                points_reward: parseInt(points_reward) || 0, 
                trigger_type, 
                trigger_count: parseInt(trigger_count) || 1,
                badge_reward_id: badge_reward_id || null
            }
        });
        res.status(201).json({ message: 'Misi berhasil dibuat', data: mission });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal membuat misi', error: error.message });
    }
};

export const updateMission = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, points_reward, trigger_type, trigger_count, badge_reward_id } = req.body;
        const mission = await prisma.mission.update({
            where: { id },
            data: { 
                title, 
                description, 
                points_reward: parseInt(points_reward) || 0, 
                trigger_type, 
                trigger_count: parseInt(trigger_count) || 1,
                badge_reward_id: badge_reward_id || null
            }
        });
        res.status(200).json({ message: 'Misi berhasil diperbarui', data: mission });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal memperbarui misi', error: error.message });
    }
};

export const deleteMission = async (req: any, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.mission.delete({ where: { id } });
        res.status(200).json({ message: 'Misi berhasil dihapus' });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal menghapus misi', error: error.message });
    }
};
