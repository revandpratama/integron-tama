import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { CreatePartnerSchema } from '@/app/lib/validations/partner';
import { ZodError } from 'zod';
import { getSession } from '@/app/lib/auth';

const FEATURE_SELECT = { select: { id: true, name: true, category: true } };

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
                status: { not: 'DRAFT' },
                boardStage: { not: 'ARCHIVED' }
            };

            const partners = await prisma.partner.findMany({
                where: whereClause,
                orderBy: [
                    { boardStage: 'asc' },
                    { kanbanOrder: 'asc' },
                    { updatedAt: 'desc' }
                ],
                include: {
                    integrator: { select: { id: true, name: true, email: true } },
                    features: FEATURE_SELECT,
                }
            });

            // Handle Done Limitation: max 30 days old AND max 20 cards
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const activePartners = partners.filter(p => p.boardStage !== 'DONE');
            const donePartners = partners
                .filter(p => p.boardStage === 'DONE' && new Date(p.updatedAt) > thirtyDaysAgo)
                .slice(0, 20);
            
            return NextResponse.json([...activePartners, ...donePartners]);
        }

        if (status) {
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
                { integrator: { name: searchFilter } },
                { integrator: { email: searchFilter } },
            ];
        }

        const [partners, total] = await Promise.all([
            prisma.partner.findMany({
                where: whereClause,
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    integrator: { select: { id: true, name: true, email: true } },
                    features: FEATURE_SELECT,
                }
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

        const { featureIds, ...partnerData } = validatedData;

        const partner = await prisma.partner.create({
            data: {
                name: partnerData.name,
                code: partnerData.code,
                status: partnerData.status as any,
                boardStage: partnerData.boardStage as any || 'INITIATION',
                integrationType: partnerData.integrationType as any || 'INBOUND',
                complexity: partnerData.complexity as any || 'MEDIUM',
                boardTasks: partnerData.boardTasks || {},
                docStatus: partnerData.docStatus as any,
                notes: partnerData.notes,
                integratorId: partnerData.integratorId,
                kanbanOrder: partnerData.kanbanOrder || 0,
                ...(featureIds && featureIds.length > 0 && {
                    features: { connect: featureIds.map(id => ({ id })) }
                }),
            },
            include: {
                integrator: { select: { id: true, name: true, email: true } },
                features: FEATURE_SELECT,
            }
        });

        const session = await getSession();
        if (session && session.id) {
            await prisma.activityLog.create({
                data: {
                    userId: session.id as string,
                    actionType: 'CREATE_PARTNER',
                    entityType: 'partner',
                    entityId: partner.id,
                    metadata: { name: partner.name, status: partner.status }
                }
            });
        }

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
