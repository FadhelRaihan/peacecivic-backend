import prisma from '../lib/prisma';
import { TriggerType, MissionStatus } from '../generated/client';

export const checkMissions = async (userId: string, triggerType: TriggerType) => {
    try {
        // 1. Dapatkan semua misi dengan trigger_type tersebut
        const missions = await prisma.mission.findMany({
            where: { trigger_type: triggerType }
        });

        for (const mission of missions) {
            // 2. Cek apakah user sudah menyelesaikan misi ini
            const userMission = await prisma.userMission.findUnique({
                where: {
                    user_id_mission_id: {
                        user_id: userId,
                        mission_id: mission.id
                    }
                }
            });

            if (userMission?.status === MissionStatus.COMPLETED) continue;

            // 3. Hitung progres berdasarkan trigger_type
            let currentProgress = 0;

            if (triggerType === TriggerType.READ_MODULE) {
                currentProgress = await prisma.userProgress.count({
                    where: {
                        user_id: userId,
                        is_completed: true
                    }
                });
            } else if (triggerType === TriggerType.CHAT_COUNT) {
                currentProgress = await prisma.message.count({
                    where: { sender_id: userId }
                });
            } else if (triggerType === TriggerType.PROJECT_UPLOAD) {
                // Untuk project upload, kita bisa hitung berapa proyek yang sudah diselesaikan tim dia
                // Tapi untuk simpelnya, kita cek apakah dia punya project dengan status tertentu
                const teams = await prisma.teamMember.findMany({
                    where: { user_id: userId },
                    select: { team_id: true }
                });
                
                const teamIds = teams.map(t => t.team_id);
                
                currentProgress = await prisma.project.count({
                    where: {
                        team_id: { in: teamIds },
                        status: 'COMPLETED'
                    }
                });
            }

            // 4. Jika progres mencukupi, selesaikan misi
            if (currentProgress >= mission.trigger_count) {
                await prisma.userMission.upsert({
                    where: {
                        user_id_mission_id: {
                            user_id: userId,
                            mission_id: mission.id
                        }
                    },
                    update: { status: MissionStatus.COMPLETED },
                    create: {
                        user_id: userId,
                        mission_id: mission.id,
                        status: MissionStatus.COMPLETED
                    }
                });

                // Berikan reward poin
                await prisma.user.update({
                    where: { id: userId },
                    data: { points: { increment: mission.points_reward } }
                });

                // Berikan reward lencana (jika ada)
                if (mission.badge_reward_id) {
                    await prisma.userBadge.upsert({
                        where: {
                            user_id_badge_id: {
                                user_id: userId,
                                badge_id: mission.badge_reward_id
                            }
                        },
                        update: {}, // Jika sudah ada jangan lakukan apapun
                        create: {
                            user_id: userId,
                            badge_id: mission.badge_reward_id
                        }
                    });
                }

                console.log(`Mission Completed: ${mission.title} for User ${userId}. Reward: ${mission.points_reward} points.`);
            }
        }
    } catch (error) {
        console.error('Error checking missions:', error);
    }
};
