import { IUserLogoutInput } from '@app/interfaces';
import { logoutRequest } from '@app/services/server/requests';

export async function POST(req: Request) {
	const body = (await req.json()) as unknown as IUserLogoutInput;
	await logoutRequest(body);
}
