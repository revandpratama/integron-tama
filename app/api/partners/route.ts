import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { CreatePartnerSchema } from '@/app/lib/validations/partner';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const activeKanban = searchParams.get('activeKanban') === 'true';
        const search = searchParams.get('search');

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const sortBy = searchParams.get('sortBy') || 'updatedAt';
        const sortOrder = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

        let whereClause: any = {};

        if (activeKanban) {
            whereClause = {
                OR: [
                    { status: 'ONBOARDING' },
                    { status: 'MAINTENANCE' }
                ]
            };

            // Kanban needs all items, so we skip pagination for now
            const partners = await prisma.partner.findMany({
                where: whereClause,
                orderBy: { updatedAt: 'desc' },
            });
            return NextResponse.json(partners);
        }

        if (status) { // Client might pass 'All' implicitly if logic isn't clean, but let's assume 'All' is handled by not sending param or checking here
            // Using logic from page.tsx: "if (statusFilter !== 'All') params.append('status', statusFilter);"
            // So here we trust `status` is valid filter
            whereClause.status = status as any;
        }

        if (search) {
            const searchFilter = {
                contains: search,
                mode: 'insensitive' as const,
            };
            whereClause.OR = [
                { name: searchFilter },
                { code: searchFilter },
                { integrator: searchFilter },
            ];
        }

        // Pagination for Partner Management
        const [partners, total] = await Promise.all([
            prisma.partner.findMany({
                where: whereClause,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.partner.count({ where: whereClause })
        ]);

        return NextResponse.json({
            data: partners,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching partners:', error);
        return NextResponse.json(
            { error: 'Failed to fetch partners' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedData = CreatePartnerSchema.parse(body);

        const partnerData = validatedData;

        const partner = await prisma.partner.create({
            data: {
                ...partnerData,
                status: partnerData.status as any,
                kanbanStage: partnerData.kanbanStage as any,
                docStatus: partnerData.docStatus as any,
            },
        });

        return NextResponse.json(partner, { status: 201 });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { error: 'Validation failed', details: error.issues },
                { status: 400 }
            );
        }

        console.error('Error creating partner:', error);
        return NextResponse.json(
            { error: 'Failed to create partner' },
            { status: 500 }
        );
    }
}
