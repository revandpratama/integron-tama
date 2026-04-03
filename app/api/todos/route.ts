import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';
import { z } from 'zod';

const TodoSchema = z.object({
    title: z.string().min(1),
});

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session || !session.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { title } = TodoSchema.parse(body);

        const todo = await prisma.todo.create({
            data: {
                title,
                userId: session.id as string
            }
        });

        return NextResponse.json(todo, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }
        console.error('Error creating todo:', error);
        return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
    }
}
