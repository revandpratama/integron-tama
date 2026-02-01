import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { UpdatePersonSchema } from '@/app/lib/validations/people';
import { ZodError } from 'zod';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const person = await prisma.person.findUnique({
            where: { id },
            include: {
                partners: { select: { id: true, name: true } },
                features: { select: { id: true, name: true } },
            }
        });

        if (!person) {
            return NextResponse.json({ error: 'Person not found' }, { status: 404 });
        }

        return NextResponse.json(person);
    } catch (error) {
        console.error('Error fetching person:', error);
        return NextResponse.json(
            { error: 'Failed to fetch person' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        // Ensure ID in body matches param if validated, or merge
        const validatedData = UpdatePersonSchema.parse({ ...body, id });

        const { partnerIds, featureIds, ...personData } = validatedData;

        const person = await prisma.person.update({
            where: { id },
            data: {
                ...personData,
                partners: partnerIds ? {
                    set: [], // Clear existing
                    connect: partnerIds.map(pid => ({ id: pid }))
                } : undefined,
                features: featureIds ? {
                    set: [], // Clear existing
                    connect: featureIds.map(fid => ({ id: fid }))
                } : undefined,
            },
            include: {
                partners: true,
                features: true,
            }
        });

        return NextResponse.json(person);
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Error updating person:', error);
        return NextResponse.json(
            { error: 'Failed to update person' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        await prisma.person.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting person:', error);
        return NextResponse.json(
            { error: 'Failed to delete person' },
            { status: 500 }
        );
    }
}
