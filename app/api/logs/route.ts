import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '0', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
        const search = searchParams.get('search') || '';
        const actionType = searchParams.get('actionType') || '';
        const entityType = searchParams.get('entityType') || '';
        const userId = searchParams.get('userId') || '';
        const broadSearch = searchParams.get('broadSearch') === 'true';

        const whereClause: any = {};

        if (actionType) {
            whereClause.actionType = actionType;
        }

        if (entityType) {
            whereClause.entityType = entityType;
        }

        if (userId) {
            whereClause.userId = userId;
        }

        let matchingIds: string[] = [];
        if (search && broadSearch) {
            try {
                const rawResults = await prisma.$queryRaw<any[]>`
                    SELECT id FROM "integron"."activity_logs"
                    WHERE CAST(metadata AS TEXT) ILIKE ${'%' + search + '%'}
                `;
                matchingIds = rawResults.map(r => r.id);
            } catch (err) {
                console.error("Deep search failed", err);
            }
        }

        if (search) {
            const orConditions: any[] = [
                { actionType: { contains: search, mode: 'insensitive' } },
                { entityType: { contains: search, mode: 'insensitive' } },
                { entityId: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } }
            ];

            if (broadSearch && matchingIds.length > 0) {
                orConditions.push({ id: { in: matchingIds } });
            }

            whereClause.OR = orConditions;
        }

        const [logs, total] = await Promise.all([
            prisma.activityLog.findMany({
                where: whereClause,
                skip: page * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { name: true, email: true } } }
            }),
            prisma.activityLog.count({ where: whereClause })
        ]);

        return NextResponse.json({
            data: logs.map((log: any) => ({
                 id: log.id,
                 actionType: log.actionType,
                 entityType: log.entityType,
                 entityId: log.entityId,
                 metadata: log.metadata,
                 createdAt: log.createdAt,
                 userName: log.user?.name || log.user?.email || 'Unknown User'
            })),
            total
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }
}
