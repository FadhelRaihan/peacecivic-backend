import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { ProjectStatus, Role, MissionStatus, TriggerType } from "../generated/client";
import { checkMissions } from "../services/automation.service";

// Siswa: Submit Project Plan
export const submitProjectPlan = async (req: any, res: Response) => {
    try {
        const { teamId, title } = req.body;
        const userId = req.user.userId;
        const planFile = req.file; // From multer

        if (!planFile) {
            return res.status(400).json({ message: 'File rencana (PDF) wajib diupload.' });
        }

        const isMember = await prisma.teamMember.findUnique({
            where: { team_id_user_id: { team_id: teamId, user_id: userId } }
        });

        if (!isMember) {
            return res.status(403).json({ message: 'Akses ditolak. Anda bukan anggota tim ini.' });
        }

        // Cek apakah ada proyek yang sedang berjalan (status bukan COMPLETED)
        const activeProject = await prisma.project.findFirst({
            where: { 
                team_id: teamId,
                status: { not: ProjectStatus.COMPLETED }
            }
        });

        if (activeProject) {
            return res.status(400).json({ 
                message: 'Tim Anda masih memiliki proyek yang sedang berjalan. Selesaikan proyek saat ini sebelum membuat yang baru.' 
            });
        }

        const savedProject = await prisma.project.create({
            data: {
                team_id: teamId,
                title,
                plan_file_url: (planFile as any).path,
                status: ProjectStatus.PLAN_SUBMITTED
            }
        });

        res.status(200).json({
            message: 'Rencana proyek berhasil dikirim. Menunggu persetujuan Guru.',
            data: savedProject
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengirim rencana proyek', error: error.message || error });
    }
};

export const getMyTeamProjects = async (req: any, res: Response) => {
    try {
        const userId = req.user.userId;
        const teamMember = await prisma.teamMember.findFirst({
            where: { user_id: userId }
        });

        if (!teamMember) {
            return res.status(404).json({ message: 'Anda belum memiliki tim.' });
        }

        const projects = await prisma.project.findMany({
            where: { team_id: teamMember.team_id },
            include: {
                team: { select: { team_name: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({ data: projects });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal mengambil data proyek tim', error: error.message });
    }
};

// Guru: Approve Project Plan
export const approveProjectPlan = async (req: any, res: Response) => {
    try {
        if (req.user.role !== Role.TEACHER) {
            return res.status(403).json({ message: 'Akses khusus Guru' });
        }

        const { projectId } = req.params;

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: { status: ProjectStatus.PLAN_APPROVED }
        });

        res.status(200).json({
            message: 'Rencana proyek disetujui. Tim sekarang dapat mengirimkan laporan.',
            data: updatedProject
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal menyetujui rencana', error: error.message });
    }
};

// Siswa: Submit Final Report
export const submitProjectReport = async (req: any, res: Response) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.userId;
        const reportFiles = req.files as any[]; // From multer upload.array

        if (!reportFiles || reportFiles.length === 0) {
            return res.status(400).json({ message: 'Minimal upload 1 file laporan.' });
        }

        const project = await prisma.project.findUnique({
            where: { id: projectId }
        });

        if (!project || project.status !== ProjectStatus.PLAN_APPROVED) {
            return res.status(400).json({ message: 'Laporan hanya bisa dikirim jika rencana sudah disetujui.' });
        }

        const isMember = await prisma.teamMember.findUnique({
            where: { team_id_user_id: { team_id: project.team_id, user_id: userId } }
        });

        if (!isMember) {
            return res.status(403).json({ message: 'Akses ditolak.' });
        }

        const fileUrls = reportFiles.map(file => file.path);

        const updatedProject = await prisma.project.update({
            where: { id: projectId },
            data: { 
                report_files: fileUrls, 
                status: ProjectStatus.REPORT_SUBMITTED 
            }
        });

        res.status(200).json({
            message: 'Laporan proyek berhasil dikirim. Menunggu penilaian akhir Guru.',
            data: updatedProject
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Gagal mengirim laporan', error: error.message });
    }
};

// Guru: Finalize & Grade Project
export const finalizeProject = async (req: any, res: Response) => {
    try {
        if (req.user.role !== Role.TEACHER) {
            return res.status(403).json({ message: 'Akses khusus Guru' });
        }

        const { projectId } = req.params;
    const { points, teacher_feedback, badgeId } = req.body;

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { team: { include: { members: true } } }
    });

    if (!project) return res.status(404).json({ message: 'Proyek tidak ditemukan' });

    // Update Project
    const finalizedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
            status: ProjectStatus.COMPLETED,
            points_awarded: parseInt(points),
            teacher_feedback
        }
    });

    // Award points to each team member
    const memberIds = project.team.members.map(m => m.user_id);
    await prisma.user.updateMany({
        where: { id: { in: memberIds } },
        data: { points: { increment: parseInt(points) } }
    });

    // Award Selected Badge (Only if badgeId provided)
    if (badgeId) {
        const userBadgeData = memberIds.map(uid => ({
            user_id: uid,
            badge_id: badgeId,
            awarded_by: req.user.userId
        }));

        await prisma.userBadge.createMany({
            data: userBadgeData,
            skipDuplicates: true
        });
    }

        // Automation: Check Missions for all members
        for (const uid of memberIds) {
            await checkMissions(uid, TriggerType.PROJECT_UPLOAD);
        }

        res.status(200).json({
            message: 'Proyek selesai! Poin dan Lencana telah diberikan kepada seluruh anggota tim.',
            data: finalizedProject
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Gagal merampungkan proyek', error: error.message });
    }
};

// Guru: Get all projects for checking
export const getAllProjects = async (req: any, res: Response) => {
    try {
        if (req.user.role !== Role.TEACHER) {
            return res.status(403).json({ message: 'Akses khusus Guru' });
        }

        const projects = await prisma.project.findMany({
            include: {
                team: { select: { team_name: true } }
            },
            orderBy: { created_at: 'desc' }
        });

        res.status(200).json({ data: projects });
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data proyek', error });
    }
};