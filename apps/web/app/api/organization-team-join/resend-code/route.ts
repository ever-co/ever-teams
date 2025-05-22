import { IRequestToJoinCreate } from '@/core/types/interfaces/to-review';
import { resendCodeRequestToJoinRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const body = (await req.json()) as IRequestToJoinCreate;

	const response = await resendCodeRequestToJoinRequest(body);

	return NextResponse.json(response.data);
}
