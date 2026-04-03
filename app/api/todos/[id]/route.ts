import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || !session.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const { isCompleted } = body;

        // Verify ownership
        const todo = await prisma.todo.findUnique({ where: { id } });
        if (!todo || todo.userId !== session.id) {
            return NextResponse.json({ error: 'Not Found or Unauthorized' }, { status: 404 });
        }

        const updatedTodo = await prisma.todo.update({
            where: { id },
            data: { isCompleted }
        });

        return NextResponse.json(updatedTodo);
    } catch (error) {
        console.error('Error updating todo:', error);
        return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || !session.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const todo = await prisma.todo.findUnique({ where: { id } });
        if (!todo || todo.userId !== session.id) {
            return NextResponse.json({ error: 'Not Found or Unauthorized' }, { status: 404 });
        }

        await prisma.todo.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting todo:', error);
        return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
    }
}
