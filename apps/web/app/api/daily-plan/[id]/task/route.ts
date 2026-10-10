import { POST as addTaskToPlan, PUT as removeTaskFromPlan } from '@/app/api/daily-plan/plan/[planId]/route';

type Context = { params: Promise<{ id: string }> };

// The client and Gauzy use /daily-plan/:id/task; the handlers themselves live in plan/[planId]
const withPlanId = ({ params }: Context) => ({ params: params.then(({ id }) => ({ planId: id })) });

export function POST(req: Request, context: Context) {
	return addTaskToPlan(req, withPlanId(context));
}

export function PUT(req: Request, context: Context) {
	return removeTaskFromPlan(req, withPlanId(context));
}
