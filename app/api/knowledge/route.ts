import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { CreateNoteSchema } from '@/app/knowledge/types';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const tag = searchParams.get('tag');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const where: any = {};

        if (query) {
            where.OR = [
                { title: { contains: query, mode: 'insensitive' } },
                { content: { contains: query, mode: 'insensitive' } },
            ];
        }

        if (tag) {
            where.tags = { has: tag };
        }

        const [notes, total] = await Promise.all([
            prisma.knowledgeNote.findMany({
                where,
                orderBy: [
                    { isPinned: 'desc' },
                    { updatedAt: 'desc' }
                ],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.knowledgeNote.count({ where })
        ]);

        return NextResponse.json({
            data: notes,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching notes:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notes' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = CreateNoteSchema.parse(body);

        const note = await prisma.knowledgeNote.create({
            data: validatedData,
        });

        return NextResponse.json(note, { status: 201 });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.issues },
                { status: 400 }
            );
        }
        console.error('Error creating note:', error);
        return NextResponse.json(
            { error: 'Failed to create note' },
            { status: 500 }
        );
    }
}
