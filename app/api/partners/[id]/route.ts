import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

import { CreatePartnerSchema } from '@/app/lib/validations/partner';

import { canMoveToReady } from '@/app/kanban/utils';
import { PartnerDocStatus } from '@/app/lib/validations/partner';
import { getSession } from '@/app/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Use Partial of CreateSchema to allow updating single fields (like status or notes)
        const UpdateSchema = CreatePartnerSchema.partial();
        const result = UpdateSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid data', details: result.error.issues },
                { status: 400 }
            );
        }

        const data: any = result.data;

        // Fetch existing partner for transition logic
        const existingPartner = await prisma.partner.findUnique({ where: { id } });
        if (!existingPartner) {
            return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
        }

        // Logic 1: DRAFT -> ONBOARDING trigger
        if (existingPartner.status === 'DRAFT' && data.status === 'ONBOARDING') {
            if (!data.kanbanStage) {
                // Automatically set to first stage if not provided
                data.kanbanStage = 'AWAITING_KICKOFF';
            }
        }

        // Guardrail removed as per request 

        const partner = await prisma.partner.update({
            where: { id },
            data: data,
        });

        const session = await getSession();
        if (session && session.id) {
            const changedFields: string[] = [];
            for (const key of Object.keys(data)) {
                if (JSON.stringify(data[key]) !== JSON.stringify((existingPartner as any)[key])) {
                    changedFields.push(key);
                }
            }

            if (changedFields.length > 0) {
                await prisma.activityLog.create({
                     data: {
                         userId: session.id as string,
                         actionType: 'UPDATE_PARTNER',
                         entityType: 'partner',
                         entityId: partner.id,
                         metadata: { updatedFields: changedFields, details: data }
                     }
                 });
            }
        }

        return NextResponse.json(partner);
    } catch (error) {
        console.error('Error updating partner:', error);
        return NextResponse.json(
            { error: 'Failed to update partner' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;

        // Check if partner exists
        const existingPartner = await prisma.partner.findUnique({ where: { id } });
        if (!existingPartner) {
            return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
        }

        await prisma.partner.delete({
            where: { id },
        });

        const session = await getSession();
        if (session && session.id) {
            await prisma.activityLog.create({
                 data: {
                     userId: session.id as string,
                     actionType: 'DELETE_PARTNER',
                     entityType: 'partner',
                     entityId: id,
                     metadata: { name: existingPartner.name }
                 }
             });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting partner:', error);
        return NextResponse.json(
            { error: 'Failed to delete partner' },
            { status: 500 }
        );
    }
}
