import { IUser } from '@app/interfaces/IUserData';
import { authenticatedGuard } from '@app/services/server/guards/authenticated-guard-app';
import { getTaskCreator, updateUserAvatarRequest } from '@app/services/server/requests';
import { deleteUserRequest } from '@app/services/server/requests/user';
import { NextResponse } from 'next/server';

export async function GET(req: Request,  { params }: { params: { id: string } }) {
	const res = new NextResponse();

	const { $res, user, access_token } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const { id: userId } = params;
	return $res(
		await getTaskCreator({
			userId: userId as string,
			bearer_token: access_token
		})
	);
}

export async function POST(req: Request) {
	const res = new NextResponse();

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as IUser;

	return $res(
		await updateUserAvatarRequest(
			{
				data: body,
				id: user.id as string,
				tenantId
			},
			access_token
		)
	);
}

export async function DELETE(req: Request) {
	const res = new NextResponse();

	const { $res, user, access_token, tenantId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	return $res(
		await deleteUserRequest({
			id: user.id,
			bearer_token: access_token,
			tenantId
		})
	);
}
