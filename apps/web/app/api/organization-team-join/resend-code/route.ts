import { resendCodeRequestToJoinRequest } from '@/core/services/server/requests';
import { IJoinTeamRequest } from '@/core/types/interfaces/team/IRequestToJoin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as IJoinTeamRequest;

	const response = await resendCodeRequestToJoinRequest(body);

	return NextResponse.json(response.data);
}
