import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTaskCreator, updateUserAvatarRequest } from '@/core/services/server/requests';
import { deleteUserRequest } from '@/core/services/server/requests/user';
import { INextParams } from '@/core/types/interfaces/common/data-response';
import { TUser } from '@/core/types/schemas';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function GET(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
	}

	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) {
		return $res('Unauthorized');
	}

	const { data } = await getTaskCreator({
		userId: params.id,
		bearer_token: access_token || ''
	});

	return $res(data);
}

export async function PUT(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return $res('Unauthorized');
	}

	const body = (await req.json()) as unknown as TUser;

	try {
		const response = await updateUserAvatarRequest(
			{
				data: body,
				id: user.id as string,
				tenantId: tenantId || ''
			},
			access_token || ''
		);

		return $res(response.data);
	} catch (error) {
		return gauzyErrorResponse(error, 'The profile was not updated.');
	}
}

export async function DELETE(req: Request, props: INextParams) {
	const params = await props.params;
	const res = new NextResponse();

	if (!params.id) {
		return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return $res('Unauthorized');
	}

	const response = await deleteUserRequest({
		id: user.id,
		bearer_token: access_token,
		tenantId
	});

	return $res(response.data);
}
