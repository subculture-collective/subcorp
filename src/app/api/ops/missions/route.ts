import { buildApprovalEvaluation } from '@/lib/ops/proposal-service';

export async function POST(req: NextRequest) {
    const authResult = await requireOpsWrite();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await req.json();
        
        // Validate approval decision ID is present and valid
        const approvalDecisionId = body.approval_decision_id;
        if (!approvalDecisionId) {
            return NextResponse.json({
                error: 'Missing required approval decision ID'
            }, { status: 400 });
        }

        // Verify approval decision exists and is valid for this mission
        const approvalDecision = await buildApprovalEvaluation(approvalDecisionId);
        if (!approvalDecision || approvalDecision.status !== 'approved') {
            return NextResponse.json({
                error: 'Invalid or unapproved decision ID: ' + approvalDecisionId
            }, { status: 403 });
        }

        // Proceed with mission creation
        const mission = await createMission({
            ...body,
            approval_decision_id: approvalDecisionId
        });

        return NextResponse.json({
            mission: mission
        }, { status: 201 });
    } catch (err) {
        return NextResponse.json({
            error: (err as Error).message
        }, { status: 500 });
    }
}