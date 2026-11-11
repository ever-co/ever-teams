import type { NextResponse } from 'next/server';
import { INVITE_CALLBACK_PATH, INVITE_CALLBACK_URL } from '@/core/constants/config/constants';
import { provisionEverIdWorkspace, type ProvisionedWorkspace } from '@/core/services/server/ever-id/provision';
import { unwrapRejection } from '@/core/services/server/fetch';
import {
	getEmployeeRoleRequest,
	inviteByEmailsRequest,
	openWorkspaceServerRequest
} from '@/core/services/server/requests';

/**
 * Another workspace for the signed-in person (#5025), without signing them out of the one they are in first: Gauzy
 * opens the account the workspace is created with (their address, no tenant yet) and answers its workspace sign-in;
 * the sign-up's steps then create the tenant, the organization, the employee and the first team, and sign it in
 * (cookies on `response`). The addresses given are invited to that team.
 */

export type CreateWorkspaceResult =
	| { status: 'ok'; invited: number; invitesFailed: boolean }
	| { status: 'address_unconfirmed' | 'registration_closed' | 'failed' };

interface CreateWorkspaceInput {
	req: Request;
	response: NextResponse;
	/** The session of the workspace the person is in. */
	accessToken: string;
	tenantId: string;
	/** The workspace's name (its tenant's and organization's) and its first team's. */
	name: string;
	teamName: string;
	invites: string[];
	languageId?: string;
	timezone?: string;
}

/**
 * Gauzy's refusal of the opening (403), told by its message: an unconfirmed address ("Confirm your email address
 * before opening another workspace"), or tenant registration closed by the operator ("Creating new workspaces is
 * disabled on this server."). Anything else is a failure, never read as one of them.
 */
async function refusalOf(error: unknown): Promise<'address_unconfirmed' | 'registration_closed' | 'failed'> {
	const body = await unwrapRejection(error);
	const isRecord = typeof body === 'object' && body !== null;
	const statusCode = isRecord ? (body as { statusCode?: unknown }).statusCode : undefined;
	if (statusCode !== 403) {
		return 'failed';
	}
	const message = isRecord ? String((body as { message?: unknown }).message ?? '') : '';
	if (/confirm your e-?mail/i.test(message)) {
		return 'address_unconfirmed';
	}
	return /workspaces is disabled/i.test(message) ? 'registration_closed' : 'failed';
}

/** Invites the addresses to the new workspace's team, as its creator, with the employee role. */
async function inviteToWorkspace(session: ProvisionedWorkspace, emails: string[], origin: string): Promise<void> {
	const { data: employeeRole } = await getEmployeeRoleRequest({
		tenantId: session.tenantId,
		role: 'EMPLOYEE',
		bearer_token: session.accessToken
	});
	const startedWorkOn = new Date();
	startedWorkOn.setDate(startedWorkOn.getDate() - 1);
	await inviteByEmailsRequest(
		{
			emailIds: emails,
			projectIds: [],
			departmentIds: [],
			organizationContactIds: [],
			teamIds: [session.teamId],
			roleId: employeeRole?.id || '',
			invitationExpirationPeriod: 'Never',
			inviteType: 'TEAM',
			appliedDate: null,
			callbackUrl: INVITE_CALLBACK_URL || `${origin}${INVITE_CALLBACK_PATH}`,
			organizationId: session.organizationId,
			tenantId: session.tenantId,
			startedWorkOn: startedWorkOn.toISOString()
		},
		session.accessToken
	);
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<CreateWorkspaceResult> {
	let opening: { email: string; token: string };
	try {
		const { data } = await openWorkspaceServerRequest(input.accessToken, input.tenantId);
		opening = data;
	} catch (error) {
		return { status: await refusalOf(error) };
	}
	if (!opening?.email || !opening.token) {
		return { status: 'failed' };
	}

	let invited = 0;
	let invitesFailed = false;
	const { origin } = new URL(input.req.url);
	const result = await provisionEverIdWorkspace({
		req: input.req,
		response: input.response,
		email: opening.email,
		workspaceToken: opening.token,
		team: input.teamName,
		workspace: input.name,
		languageId: input.languageId,
		timezone: input.timezone,
		onProvisioned:
			input.invites.length > 0
				? async (session) => {
						try {
							await inviteToWorkspace(session, input.invites, origin);
							invited = input.invites.length;
						} catch {
							invitesFailed = true;
						}
					}
				: undefined
	});
	if (result !== 'ok') {
		return { status: 'failed' };
	}
	return { status: 'ok', invited, invitesFailed };
}
