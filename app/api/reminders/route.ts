import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

const CreateReminderSchema = z.object({
    title: z.string().min(1),
    scheduledAt: z.string(), // ISO String
    level: z.enum(['Info', 'Important', 'Critical']),
});

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const active = searchParams.get('active');

        const where: any = {};
        if (active === 'true') {
            where.isCompleted = false;
            where.scheduledAt = { lte: new Date() }; // Due now or earlier
        }

        const reminders = await prisma.reminder.findMany({
            where,
            orderBy: { scheduledAt: 'asc' },
        });

        return NextResponse.json(reminders);
    } catch (error) {
        console.error('Error fetching reminders:', error);
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
    
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validated = CreateReminderSchema.parse(body);

        const reminder = await prisma.reminder.create({
            data: {
                title: validated.title,
                scheduledAt: new Date(validated.scheduledAt),
                level: validated.level,
            },
        });

        return NextResponse.json(reminder, { status: 201 });
    } catch (error) {
        console.error('Error creating reminder:', error);
        return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
    }
}
