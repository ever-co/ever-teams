import { IValidateRequestToJoin } from '@app/interfaces';
import { validateRequestToJoinRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as IValidateRequestToJoin;

	return NextResponse.json(await validateRequestToJoinRequest(body));
}
