
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
    try {
        const [
            partnerCounts,
            featureCounts,
            knowledgeCount,
            pinnedNotes,
            recentPartners
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
            // Pinned Notes
            prisma.knowledgeNote.findMany({
                where: { isPinned: true },
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: { id: true, title: true, tags: true, updatedAt: true }
            }),
            // Recently Updated Partners
            prisma.partner.findMany({
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    status: true,
                    updatedAt: true,
                    code: true
                }
            })
        ]);

        const stats = {
            partners: {
                total: partnerCounts.reduce((acc, curr) => acc + curr._count.id, 0),
                byStatus: partnerCounts.reduce((acc, curr) => {
                    acc[curr.status] = curr._count.id;
                    return acc;
                }, {} as Record<string, number>),
            },
            features: {
                total: featureCounts.reduce((acc, curr) => acc + curr._count.id, 0),
                byCategory: featureCounts.reduce((acc, curr) => {
                    acc[curr.category] = curr._count.id;
                    return acc;
                }, {} as Record<string, number>),
            },
            knowledge: {
                total: knowledgeCount,
                pinned: pinnedNotes.length, // We might want total pinned count if more than 5, but for now length is fine or distinct count
            },
            pinnedNotes,
            recentPartners
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
