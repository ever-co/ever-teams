import { IUpdateEmployee } from '@/core/types/interfaces/organization/employee';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { updateEmployees } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const res = new NextResponse();
	const { id } = params;
	if (!id) {
		return;
	}
	const { $res, user, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');
	const body = (await req.json()) as unknown as IUpdateEmployee;

	try {
		const response = await updateEmployees({
			bearer_token: access_token || '',
			body,
			id
		});
		return $res(response.data);
	} catch (error) {
		return gauzyErrorResponse(error, 'The employee could not be saved.');
	}
}
