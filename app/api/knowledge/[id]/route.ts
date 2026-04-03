import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { CreateNoteSchema } from '@/app/knowledge/types';
import { ZodError } from 'zod';
import { getSession } from '@/app/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const validatedData = CreateNoteSchema.parse(body);

        const existingNote = await prisma.knowledgeNote.findUnique({ where: { id } });

        const note = await prisma.knowledgeNote.update({
            where: { id },
            data: validatedData,
        });

        const session = await getSession();
        if (session && session.id && existingNote) {
            const changedFields: string[] = [];
            for (const key of Object.keys(validatedData)) {
                if (JSON.stringify((validatedData as any)[key]) !== JSON.stringify((existingNote as any)[key])) {
                    changedFields.push(key);
                }
            }

            if (changedFields.length > 0) {
                const isPinToggle = existingNote.isPinned !== note.isPinned && changedFields.length === 1 && changedFields[0] === 'isPinned';
                
                await prisma.activityLog.create({
                    data: {
                        userId: session.id as string,
                        actionType: isPinToggle ? 'PIN_KNOWLEDGE' : 'UPDATE_KNOWLEDGE',
                        entityType: 'knowledge',
                        entityId: note.id,
                        metadata: isPinToggle ? { isPinned: note.isPinned, title: note.title } : { updatedFields: changedFields, title: note.title }
                    }
                });
            }
        }

        return NextResponse.json(note);
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.issues },
                { status: 400 }
            );
        }
        console.error('Error updating note:', error);
        return NextResponse.json(
            { error: 'Failed to update note' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const existingNoteForDelete = await prisma.knowledgeNote.findUnique({ where: { id } });
        if (existingNoteForDelete) {
             await prisma.knowledgeNote.delete({
                 where: { id },
             });

             const session = await getSession();
             if (session && session.id) {
                 await prisma.activityLog.create({
                      data: {
                          userId: session.id as string,
                          actionType: 'DELETE_KNOWLEDGE',
                          entityType: 'knowledge',
                          entityId: id,
                          metadata: { title: existingNoteForDelete.title }
                      }
                  });
             }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting note:', error);
        return NextResponse.json(
            { error: 'Failed to delete note' },
            { status: 500 }
        );
    }
}
