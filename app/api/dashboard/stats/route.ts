
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || !session.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [
            partnerCounts,
            featureCounts,
            knowledgeCount,
            userTodos,
            activityLogs
        ] = await Promise.all([
            // Partner Stats
            prisma.partner.groupBy({
                by: ['status'],
                _count: {
                    id: true,
                },
            }),
            // Feature Stats
            prisma.feature.groupBy({
                by: ['category'],
                _count: {
                    id: true,
                },
            }),
            // Knowledge Base Count
            prisma.knowledgeNote.count(),
            // User Todos
            prisma.todo.findMany({
                where: { userId: session.id as string },
                orderBy: { createdAt: 'desc' },
                select: { id: true, title: true, isCompleted: true, createdAt: true }
            }),
            // Activity Logs
            prisma.activityLog.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                     user: { select: { name: true, email: true } }
                }
            })
        ]);

        const stats = {
            partners: {
                total: partnerCounts.reduce((acc: number, curr: any) => acc + curr._count.id, 0),
                byStatus: partnerCounts.reduce((acc: Record<string, number>, curr: any) => {
                    acc[curr.status] = curr._count.id;
                    return acc;
                }, {} as Record<string, number>),
            },
            features: {
                total: featureCounts.reduce((acc: number, curr: any) => acc + curr._count.id, 0),
                byCategory: featureCounts.reduce((acc: Record<string, number>, curr: any) => {
                    acc[curr.category] = curr._count.id;
                    return acc;
                }, {} as Record<string, number>),
            },
            knowledge: {
                total: knowledgeCount
            },
            todos: userTodos,
            activityLogs: activityLogs.map((log: any) => ({
                 id: log.id,
                 actionType: log.actionType,
                 entityType: log.entityType,
                 entityId: log.entityId,
                 metadata: log.metadata,
                 createdAt: log.createdAt,
                 userName: log.user?.name || log.user?.email || 'Unknown User'
            }))
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard statistics' },
            { status: 500 }
        );
    }
}
