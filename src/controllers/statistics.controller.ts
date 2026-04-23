import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { Role, MissionStatus } from "../generated/client";

export const getOverviewStats = async (req: any, res: Response) => {
    try {
        const [
            totalStudents,
            totalTeachers,
            totalProjects,
            totalMissionsCompleted,
            totalPoints
        ] = await Promise.all([
            prisma.user.count({ where: { role: Role.STUDENT } }),
            prisma.user.count({ where: { role: Role.TEACHER } }),
            prisma.project.count({ where: { status: 'COMPLETED' } }),
            prisma.userMission.count({ where: { status: MissionStatus.COMPLETED } }),
            prisma.user.aggregate({ _sum: { points: true } })
        ]);

        res.status(200).json({
            data: {
                totalStudents,
                totalTeachers,
                totalProjects,
                totalMissionsCompleted,
                totalPointsAwarded: totalPoints._sum.points || 0
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal memuat statistik ringkasan', error: error.message });
    }
};

export const getActivityStats = async (req: any, res: Response) => {
    try {
        const days = 30; // Last 30 days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // 1. Fetch Student Actions
        const [modules, missions, messages, projects] = await Promise.all([
            prisma.userProgress.findMany({
                where: { is_completed: true, completed_at: { gte: startDate } },
                select: { completed_at: true }
            }),
            prisma.userMission.findMany({
                where: { status: MissionStatus.COMPLETED, updated_at: { gte: startDate } },
                select: { updated_at: true }
            }),
            prisma.message.findMany({
                where: { created_at: { gte: startDate } },
                select: { created_at: true }
            }),
            prisma.project.findMany({
                where: { created_at: { gte: startDate } },
                select: { created_at: true }
            })
        ]);

        // 2. Fetch Teacher Actions
        const [badgesGiven, projectReviews] = await Promise.all([
            prisma.userBadge.findMany({
                where: { awarded_by: { not: null }, awarded_at: { gte: startDate } },
                select: { awarded_at: true }
            }),
            prisma.project.findMany({
                where: { 
                    teacher_feedback: { not: null },
                    // Assuming projects are reviewed roughly when they are updated with feedback
                    // In a more complex system, we'd track status changes in a separate table
                    created_at: { gte: startDate } 
                },
                select: { created_at: true }
            })
        ]);

        // 3. Process Data into Daily Buckets
        const dailyData: Record<string, { date: string, student: number, teacher: number }> = {};

        // Helper to get local date string YYYY-MM-DD
        const getLocalDate = (d: Date) => d.toISOString().split('T')[0];

        // Fill initial buckets for all days in range
        for (let i = 0; i <= days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = getLocalDate(d);
            dailyData[dateStr] = { date: dateStr, student: 0, teacher: 0 };
        }

        // Student actions
        modules.forEach(m => { if (m.completed_at) dailyData[getLocalDate(m.completed_at)].student++ });
        missions.forEach(m => { dailyData[getLocalDate(m.updated_at)].student++ });
        messages.forEach(m => { dailyData[getLocalDate(m.created_at)].student++ });
        projects.forEach(m => { dailyData[getLocalDate(m.created_at)].student++ });

        // Teacher actions
        badgesGiven.forEach(m => { dailyData[getLocalDate(m.awarded_at)].teacher++ });
        projectReviews.forEach(m => { dailyData[getLocalDate(m.created_at)].teacher++ });

        const result = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

        res.status(200).json({ data: result });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal memuat statistik aktivitas', error: error.message });
    }
};

export const getBadgeDistribution = async (req: any, res: Response) => {
    try {
        const badges = await prisma.badge.findMany({
            include: {
                _count: {
                    select: { user_badges: true }
                }
            }
        });

        const data = badges.map(b => ({
            name: b.badge_name,
            count: b._count.user_badges,
            fill: `var(--color-${b.badge_name.toLowerCase().replace(/\s+/g, '-')})`
        }));

        res.status(200).json({ data });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal memuat distribusi lencana', error: error.message });
    }
};

export const getLeaderboard = async (req: any, res: Response) => {
    try {
        const topStudents = await prisma.user.findMany({
            where: { role: Role.STUDENT },
            orderBy: { points: 'desc' },
            take: 10,
            select: {
                id: true,
                full_name: true,
                points: true,
                avatar_url: true,
                class_room: true,
                _count: {
                    select: { badges_received: true }
                }
            }
        });

        res.status(200).json({ data: topStudents });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal memuat leaderboard', error: error.message });
    }
};

export const getClassroomStats = async (req: any, res: Response) => {
    try {
        const stats = await prisma.user.groupBy({
            by: ['class_room'],
            where: { role: Role.STUDENT },
            _sum: { points: true },
            _avg: { points: true },
            _count: { id: true },
        });

        const formattedStats = stats.map(s => ({
            classroom: s.class_room || "Tanpa Kelas",
            totalPoints: s._sum.points || 0,
            avgPoints: Math.round(s._avg.points || 0),
            studentCount: s._count.id
        })).sort((a, b) => b.totalPoints - a.totalPoints);

        res.status(200).json({ data: formattedStats });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal memuat statistik kelas', error: error.message });
    }
};

export const getMissionInsights = async (req: any, res: Response) => {
    try {
        const missions = await prisma.mission.findMany({
            include: {
                _count: {
                    select: { user_missions: true }
                },
                user_missions: {
                    where: { status: MissionStatus.COMPLETED },
                    select: { id: true }
                }
            }
        });

        const insights = missions.map(m => {
            const totalAttempts = m._count.user_missions;
            const completedCount = m.user_missions.length;
            const completionRate = totalAttempts > 0 ? (completedCount / totalAttempts) * 100 : 0;
            
            return {
                id: m.id,
                title: m.title,
                totalAttempts,
                completedCount,
                completionRate: Math.round(completionRate),
                difficultyScore: Math.round(100 - completionRate)
            };
        }).sort((a, b) => b.difficultyScore - a.difficultyScore);

        res.status(200).json({ data: insights });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal memuat wawasan misi', error: error.message });
    }
};

export const getDetailedClassStats = async (req: any, res: Response) => {
    try {
        const { classroom } = req.query;
        const whereClause = classroom && classroom !== 'ALL' ? { class_room: classroom as string } : {};
        const studentWhere = { role: Role.STUDENT, ...whereClause };

        // 1. Modul Stats (Completed vs Not)
        const totalModules = await prisma.module.count();
        const userProgress = await prisma.userProgress.findMany({
            where: { 
                user: studentWhere,
                is_completed: true 
            }
        });
        const totalStudents = await prisma.user.count({ where: studentWhere });
        const completedCount = userProgress.length;
        const pendingCount = (totalModules * totalStudents) - completedCount;

        // 2. Project Stats (By Status)
        const projectStats = await prisma.project.groupBy({
            by: ['status'],
            where: { team: { members: { some: { user: studentWhere } } } },
            _count: { id: true }
        });

        // 3. Classroom Comparison (if classroom is ALL)
        let classroomComparison: any[] = [];
        if (!classroom || classroom === 'ALL') {
            const classrooms = await prisma.user.findMany({
                where: { role: Role.STUDENT },
                distinct: ['class_room'],
                select: { class_room: true }
            });

            classroomComparison = await Promise.all(classrooms.map(async (c) => {
                const cName = c.class_room || "Tanpa Kelas";
                const cWhere = { class_room: c.class_room };
                
                // Project Completion rate
                const cProjects = await prisma.project.count({
                    where: { team: { members: { some: { user: cWhere } } } }
                });
                const cCompletedProjects = await prisma.project.count({
                    where: { 
                        team: { members: { some: { user: cWhere } } },
                        status: 'COMPLETED'
                    }
                });

                // Activity (Avg Points)
                const cAvgPoints = await prisma.user.aggregate({
                    where: { role: Role.STUDENT, ...cWhere },
                    _avg: { points: true }
                });

                // Forum Usage
                const cForumMsgs = await prisma.message.count({
                    where: { 
                        is_forum: true,
                        sender: cWhere
                    }
                });

                return {
                    name: cName,
                    projectRate: cProjects > 0 ? Math.round((cCompletedProjects / cProjects) * 100) : 0,
                    activityScore: Math.round(cAvgPoints._avg.points || 0),
                    forumUsage: cForumMsgs
                };
            }));
        }

        res.status(200).json({
            data: {
                moduleStats: [
                    { name: 'Selesai', value: completedCount, fill: '#800000' },
                    { name: 'Belum Selesai', value: pendingCount > 0 ? pendingCount : 0, fill: '#475569' }
                ],
                projectStats: projectStats.map(ps => ({
                    name: ps.status,
                    value: ps._count.id
                })),
                classroomComparison
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal memuat detail statistik', error: error.message });
    }
};
