import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { UpdatePersonSchema } from '@/app/lib/validations/people';
import { ZodError } from 'zod';
import { getSession } from '@/app/lib/auth';

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

        const existingPerson = await prisma.person.findUnique({ where: { id } });

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

        const session = await getSession();
        if (session && session.id && existingPerson) {
            const changedFields: string[] = [];
            for (const key of Object.keys(personData)) {
                if (JSON.stringify((personData as any)[key]) !== JSON.stringify((existingPerson as any)[key])) {
                    changedFields.push(key);
                }
            }
            if (partnerIds) changedFields.push('partners');
            if (featureIds) changedFields.push('features');

            if (changedFields.length > 0) {
                await prisma.activityLog.create({
                     data: {
                         userId: session.id as string,
                         actionType: 'UPDATE_PERSON',
                         entityType: 'people',
                         entityId: person.id,
                         metadata: { updatedFields: changedFields }
                     }
                 });
            }
        }

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
        const existingPerson = await prisma.person.findUnique({ where: { id } });
        if (existingPerson) {
             await prisma.person.delete({
                 where: { id },
             });

             const session = await getSession();
             if (session && session.id) {
                 await prisma.activityLog.create({
                      data: {
                          userId: session.id as string,
                          actionType: 'DELETE_PERSON',
                          entityType: 'people',
                          entityId: id,
                          metadata: { name: existingPerson.name, role: existingPerson.role }
                      }
                  });
             }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting person:', error);
        return NextResponse.json(
            { error: 'Failed to delete person' },
            { status: 500 }
        );
    }
}
