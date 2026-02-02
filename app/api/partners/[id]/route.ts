import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

import { CreatePartnerSchema } from '@/app/lib/validations/partner';

import { canMoveToReady } from '@/app/kanban/utils';
import { PartnerDocStatus } from '@/app/lib/validations/partner';

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

        // Logic 2: Guardrail for moving to READY_FOR_DEPLOY
        if (data.kanbanStage === 'READY_FOR_DEPLOY' && existingPartner.kanbanStage !== 'READY_FOR_DEPLOY') {
            // Check doc status (use incoming docStatus if provided, else existing)
            const currentDocStatus = (data.docStatus || existingPartner.docStatus) as PartnerDocStatus;

            if (!canMoveToReady(currentDocStatus)) {
                return NextResponse.json(
                    { error: 'Cannot move to Ready for Deploy: Missing required document approvals.' },
                    { status: 400 }
                );
            }
        }

        const partner = await prisma.partner.update({
            where: { id },
            data: data,
        });

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

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting partner:', error);
        return NextResponse.json(
            { error: 'Failed to delete partner' },
            { status: 500 }
        );
    }
}
