import { IRequestToJoinCreate } from '@app/interfaces';
import { resendCodeRequestToJoinRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as IRequestToJoinCreate;

	return NextResponse.json(await resendCodeRequestToJoinRequest(body));
}
