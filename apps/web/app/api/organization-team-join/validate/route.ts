import { validateRequestToJoinRequest } from '@/core/services/server/requests';
import { IValidateRequestToJoinTeam } from '@/core/types/interfaces/team/request-to-join';
import { NextResponse } from 'next/server';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';

export async function POST(req: Request) {
	const body = (await req.json()) as IValidateRequestToJoinTeam;

	try {
		const response = await validateRequestToJoinRequest(body);
		return NextResponse.json(response.data);
	} catch (error) {
		// A refusal of the API goes back with its status and reason, as in direct mode (#5726)
		return await gauzyErrorResponse(error, 'The code could not be checked.');
	}
}
