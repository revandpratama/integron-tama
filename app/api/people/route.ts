import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { CreatePersonSchema } from '@/app/lib/validations/people';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { role: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        const [people, total] = await Promise.all([
            prisma.person.findMany({
                where,
                orderBy: { updatedAt: 'desc' },
                include: {
                    partners: { select: { id: true, name: true } },
                    features: { select: { id: true, name: true } },
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.person.count({ where })
        ]);

        return NextResponse.json({
            data: people,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching people:', error);
        return NextResponse.json(
            { error: 'Failed to fetch people' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = CreatePersonSchema.parse(body);

        const { partnerIds, featureIds, ...personData } = validatedData;

        const person = await prisma.person.create({
            data: {
                ...personData,
                partners: partnerIds ? {
                    connect: partnerIds.map(id => ({ id }))
                } : undefined,
                features: featureIds ? {
                    connect: featureIds.map(id => ({ id }))
                } : undefined,
            },
            include: {
                partners: true,
                features: true,
            }
        });

        return NextResponse.json(person, { status: 201 });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Error creating person:', error);
        return NextResponse.json(
            { error: 'Failed to create person' },
            { status: 500 }
        );
    }
}
