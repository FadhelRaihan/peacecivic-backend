import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ProjectStatus } from '../generated/client';

export const getDashboardStats = async (req: any, res: Response) => {
    try {
        if (req.user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Akses khusus Guru' });
        }

        const [
            totalStudents,
            totalTeams,
            pendingProjects,
            recentSubmissions
        ] = await Promise.all([
            prisma.user.count({ where: { role: 'STUDENT' } }),
            
            prisma.team.count(),

            prisma.project.count({ 
                where: { 
                    status: { in: [ProjectStatus.PLAN_SUBMITTED, ProjectStatus.REPORT_SUBMITTED] } 
                } 
            }),

            prisma.project.findMany({
                where: { 
                    status: { in: [ProjectStatus.PLAN_SUBMITTED, ProjectStatus.REPORT_SUBMITTED] } 
                },
                include: { team: { select: { team_name: true } } },
                orderBy: { created_at: 'desc' },
                take: 5
            })
        ]);

        res.status(200).json({
            data: {
                statistics: {
                    total_students: totalStudents,
                    total_teams: totalTeams,
                    pending_grading: pendingProjects
                },
                needs_attention: recentSubmissions
            }
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memuat dashboard guru', error: error.message });
    }
};

export const getManagedTeams = async (req: any, res: Response) => {
    try {
        if (req.user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Akses khusus Guru' });
        }

        const teacher = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!teacher || !teacher.class_room) {
            return res.status(400).json({ message: 'Data kelas guru tidak ditemukan' });
        }

        const teams = await prisma.team.findMany({
            where: {
                members: {
                    some: {
                        user: {
                            class_room: teacher.class_room
                        }
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                full_name: true,
                                email: true,
                                avatar_url: true,
                                class_room: true
                            }
                        }
                    }
                },
                projects: {
                    orderBy: { created_at: 'desc' }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({ data: teams });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memuat data tim', error: error.message });
    }
};

export const getManagedStudents = async (req: any, res: Response) => {
    try {
        if (req.user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Akses khusus Guru' });
        }

        const teacher = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!teacher || !teacher.class_room) {
            return res.status(400).json({ message: 'Data kelas guru tidak ditemukan' });
        }

        const students = await prisma.user.findMany({
            where: {
                role: 'STUDENT',
                class_room: teacher.class_room
            },
            include: {
                team_members: {
                    include: { 
                        team: {
                            include: { projects: true }
                        } 
                    }
                },
                missions: {
                    where: { status: 'COMPLETED' },
                    include: { mission: true }
                },
                progress: {
                    where: { is_completed: true },
                    include: { module: true }
                },
                badges_received: {
                    include: { badge: true }
                }
            },
            orderBy: { full_name: 'asc' }
        });

        // Transform data for easier consumption on frontend
        const result = students.map(student => ({
            id: student.id,
            full_name: student.full_name,
            email: student.email,
            avatar_url: student.avatar_url,
            points: student.points,
            class_room: student.class_room,
            team_name: student.team_members[0]?.team.team_name || 'Belum ada tim',
            
            // Detail Lists
            completed_missions: student.missions.map(um => um.mission),
            completed_modules: student.progress.map(up => up.module),
            team_projects: student.team_members[0]?.team.projects || [],
            badges: student.badges_received.map(ub => ub.badge)
        }));

        res.status(200).json({ data: result });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memuat data siswa', error: error.message });
    }
};

export const deleteStudent = async (req: any, res: Response) => {
    try {
        if (req.user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Akses khusus Guru' });
        }

        const { id } = req.params;

        // Verify student belongs to this teacher's class
        const teacher = await prisma.user.findUnique({ where: { id: req.user.userId } });
        const student = await prisma.user.findUnique({ where: { id } });

        if (!student || student.role !== 'STUDENT' || student.class_room !== teacher?.class_room) {
            return res.status(403).json({ message: 'Tidak diizinkan menghapus siswa ini' });
        }

        await prisma.user.delete({ where: { id } });

        res.status(200).json({ message: 'Akun siswa berhasil dihapus secara permanen' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menghapus siswa', error: error.message });
    }
};

export const awardSpecialBadge = async (req: any, res: Response) => {
    try {
        if (req.user.role !== 'TEACHER') {
            return res.status(403).json({ message: 'Akses khusus Guru' });
        }

        const { id } = req.params; // student_id
        const { badgeId } = req.body;

        if (!badgeId) {
            return res.status(400).json({ message: 'ID Lencana wajib dipilih' });
        }

        // Check duplicate
        const existing = await prisma.userBadge.findFirst({
            where: { user_id: id, badge_id: badgeId }
        });

        if (existing) {
            return res.status(400).json({ message: 'Siswa sudah memiliki lencana ini' });
        }

        const awardedBadge = await prisma.userBadge.create({
            data: {
                user_id: id,
                badge_id: badgeId,
                awarded_by: req.user.userId
            },
            include: { badge: true }
        });

        res.status(201).json({ 
            message: `Lencana ${awardedBadge.badge.badge_name} berhasil diberikan!`,
            data: awardedBadge 
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memberikan lencana', error: error.message });
    }
};