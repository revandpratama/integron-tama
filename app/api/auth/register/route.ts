import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const RegisterSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password } = RegisterSchema.parse(body);

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }

        // Bootstrap: If this is the FIRST user, make them ADMIN and APPROVED
        const userCount = await prisma.user.count();
        const isFirstUser = userCount === 0;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash: hashedPassword,
                role: isFirstUser ? 'ADMIN' : 'USER',
                isApproved: isFirstUser, // Auto-approve first user
            },
        });

        // Don't return passwordHash
        const { passwordHash, ...userWithoutPassword } = user;

        return NextResponse.json({
            message: isFirstUser
                ? 'Account created and auto-approved (Admin).'
                : 'Account created. Waiting for admin approval.',
            user: userWithoutPassword
        }, { status: 201 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
        }
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
