import { IValidateRequestToJoin } from '@/core/types/interfaces/to-review';
import { validateRequestToJoinRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as IValidateRequestToJoin;

	const response = await validateRequestToJoinRequest(body);

	return NextResponse.json(response.data);
}
