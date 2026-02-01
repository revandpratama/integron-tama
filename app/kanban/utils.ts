import { PartnerDocStatus } from '../lib/validations/partner';

export function canMoveToReady(docStatus: PartnerDocStatus | null | undefined): boolean {
    if (!docStatus) return false;
    return (
        docStatus.sit === 'APPROVED' &&
        docStatus.reconcile === 'APPROVED' &&
        docStatus.devsite === 'APPROVED'
    );
}
