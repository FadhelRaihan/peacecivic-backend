import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { MissionStatus } from "../generated/client";

export const getProfile = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                _count: {
                    select: {
                        progress: { where: { is_completed: true } },
                        missions: { where: { status: MissionStatus.COMPLETED } },
                        badges_received: true,
                    }
                },
                badges_received: {
                    include: {
                        badge: true
                    }
                },
                team_members: {
                    include: {
                        team: true
                    }
                }
            }
        });
        
        const totalMissions = await prisma.mission.count();

        if (!user) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        let teamData = null;
        if (user.team_members.length > 0) {
            const teamId = user.team_members[0].team_id;
            const fullTeam = await prisma.team.findUnique({
                where: { id: teamId },
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    full_name: true,
                                    avatar_url: true
                                }
                            }
                        }
                    }
                }
            });

            if (fullTeam) {
                teamData = {
                    id: fullTeam.id,
                    team_name: fullTeam.team_name,
                    invite_code: fullTeam.invite_code,
                    members: fullTeam.members.map(m => ({
                        id: m.user.id,
                        full_name: m.user.full_name,
                        avatar_url: m.user.avatar_url
                    }))
                };
            }
        }

        res.status(200).json({
            data: {
                profile: {
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role,
                    class_room: user.class_room,
                    avatar_url: user.avatar_url,
                    points: user.points,
                },
                statistics: {
                    modules_completed: user._count.progress,
                    missions_completed: user._count.missions,
                    total_missions: totalMissions,
                    total_badges: user._count.badges_received,
                },
                badges: user.badges_received.map(ub => ub.badge),
                team: teamData
            }
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memuat profile', error: error.message });
    }
}

export const getLeaderboard = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId;

        const topUsers = await prisma.user.findMany({
            where: { role: 'STUDENT' },
            select: {
                id: true,
                full_name: true,
                avatar_url: true,
                points: true,
                class_room: true
            },
            orderBy: {
                points: 'desc'
            },
            take: 10
        });

        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { points: true },
        })

        let myRank: string | number = "100+";

        if (currentUser) {
            const higherScoringUsers = await prisma.user.count({
                where: {
                    role: 'STUDENT',
                    points: { gt: currentUser.points }
                }
            });

            const actualRank = higherScoringUsers + 1;

            if (actualRank <= 100) {
                myRank = actualRank;
            }
        }

        res.status(200).json({ data: topUsers, my_rank: myRank });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memuat papan peringkat', error: error.message });
    }
};

export const updateAvatar = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'File avatar wajib diunggah' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { avatar_url: file.path }
        });

        res.status(200).json({
            message: 'Avatar berhasil diperbarui',
            data: {
                avatar_url: updatedUser.avatar_url
            }
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memperbarui avatar', error: error.message });
    }
}