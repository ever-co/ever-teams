import { validateRequestToJoinRequest } from '@/core/services/server/requests';
import { IValidateRequestToJoinTeam } from '@/core/types/interfaces/team/IRequestToJoin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as IValidateRequestToJoinTeam;

	const response = await validateRequestToJoinRequest(body);

	return NextResponse.json(response.data);
}
