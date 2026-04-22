import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export const register = async (req: Request, res: Response) => {
    try {
        const { full_name, email, password, role, class_room } = req.body;

        // Cek email
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email sudah terdaftar' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Buat user
        const user = await prisma.user.create({
            data: {
                full_name,
                email,
                password_hash: hashedPassword,
                role: role || 'STUDENT',
                class_room: class_room || null,
            },
        });

        res.status(201).json({ message: 'User berhasil didaftarkan', userId: user.id });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message || error });
    }
};

export const getAvailableClasses = async (req: Request, res: Response) => {
    try {
        const teachers = await prisma.user.findMany({
            where: {
                role: 'TEACHER',
                class_room: { not: null },
            },
            select: {
                class_room: true,
            },
        });

        // Ambil nama kelas unik
        const classes = [...new Set(teachers.map((t) => t.class_room))].filter(Boolean);

        res.status(200).json({ classes });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message || error });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Cari user berdasarkan email
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }

        // Cek password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Password salah' });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: process.env.JWT_EXPIRES as any }
        );

        res.status(200).json({
            message: 'Login Berhasil',
            token,
            user: {
                id: user.id,
                full_name: user.full_name,
                role: user.role,
            },
        });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message || error });
    }
};