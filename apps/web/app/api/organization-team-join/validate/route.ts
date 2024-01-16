import { IValidateRequestToJoin } from '@app/interfaces';
import { validateRequestToJoinRequest } from '@app/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as IValidateRequestToJoin;

	const response = await validateRequestToJoinRequest(body);

	return NextResponse.json(response.data);
}
