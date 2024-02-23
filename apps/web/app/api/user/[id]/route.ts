import { INextParams } from '@app/interfaces';
import { IUser } from '@app/interfaces/IUserData';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getTaskCreator, updateUserAvatarRequest } from '@app/services/server/requests';
import { deleteUserRequest } from '@app/services/server/requests/user';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	if (!params.id) {
		return;
	}

	const { $res, user, access_token } = await authenticatedGuard(req, res);

	if (!user) {
		return $res('Unauthorized');
	}

	const { data } = await getTaskCreator({
		userId: params.id,
		bearer_token: access_token
	});

	return $res(data);
}

export async function PUT(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	if (!params.id) {
		return;
	}

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);

	if (!user) {
		return $res('Unauthorized');
	}

	const body = (await req.json()) as unknown as IUser;

	const response = await updateUserAvatarRequest(
		{
			data: body,
			id: user.id as string,
			tenantId
		},
		access_token
	);

	return $res(response.data);
}

export async function DELETE(req: Request, { params }: INextParams) {
	const res = new NextResponse();

	if (!params.id) {
		return;
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

export async function generateStaticParams() {
	return [{ id: '' }];
}
