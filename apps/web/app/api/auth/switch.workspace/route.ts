import { getUserOrganizationsRequest, signInWorkspaceRequest } from '@/core/services/server/requests';
import { setAuthCookies } from '@/core/lib/helpers/cookies';
import { IOrganizationTeam } from '@/core/types/interfaces/team/organization-team';

import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, appendFile } from 'node:fs/promises';
import { join } from 'path';
import { tmpdir } from 'node:os';

// Function to save debug logs to file
async function saveDebugLog(filename: string, data: any) {
	const logContent = JSON.stringify(data, null, 2);
	const paths = [
		join(process.cwd(), 'apps/web/ai-guides', filename),
		join(tmpdir(), filename),
		join(process.cwd(), filename)
	];

	console.log(`🔍 Attempting to save log: ${filename}`);
	console.log(`🔍 Current working directory: ${process.cwd()}`);

	for (const logPath of paths) {
		try {
			console.log(`🔍 Trying path: ${logPath}`);
			await writeFile(logPath, logContent);
			console.log(`✅ Debug log saved successfully to: ${logPath}`);
			return; // Success, exit function
		} catch (error) {
			console.error(`❌ Failed to save to ${logPath}:`, {
				message: (error as Error).message,
				code: (error as any).code
			});
		}
	}

	console.error('❌ Failed to save debug log to any location');
}

// Simple log function that writes to root directory
async function logToFile(message: string) {
	try {
		// Write to project root (not apps/web)
		const logPath = join(process.cwd(), '../../workspace-switch-debug.log');
		const timestamp = new Date().toISOString();
		const logEntry = `\n[${timestamp}] SERVER: ${message}\n`;
		await appendFile(logPath, logEntry);
		console.log(`📝 Logged to: ${logPath}`);
	} catch (error) {
		// Try alternative path
		try {
			const altPath = join(process.cwd(), 'workspace-switch-debug.log');
			const timestamp = new Date().toISOString();
			const logEntry = `\n[${timestamp}] SERVER: ${message}\n`;
			await appendFile(altPath, logEntry);
			console.log(`📝 Logged to: ${altPath}`);
		} catch (altError) {
			console.error('Failed to log to file:', altError);
		}
	}
}

export const POST = async (req: NextRequest) => {
	const res = new NextResponse();

	// After user check, we know we have the success case
	// (access_token and tenantId are available in guardResult if needed)
	const body = (await req.json()) as unknown as {
		email: string;
		token: string;
		teamId: string;
		defaultTeamId?: IOrganizationTeam['id'];
		lastTeamId?: IOrganizationTeam['id'];
	};

	const { email, token, defaultTeamId, lastTeamId } = body;
	const { data } = await signInWorkspaceRequest({ email, token, defaultTeamId, lastTeamId });

	/**
	 * Get the first team from first organization
	 */
	const newTenantId = data.user?.tenantId || '';
	const newAccessToken = data.token;
	const userId = data.user?.id;

	const { data: organizations } = await getUserOrganizationsRequest(
		{ tenantId: newTenantId, userId },
		newAccessToken
	);

	const organization = organizations?.items[0];

	if (!organization) {
		return NextResponse.json(
			{
				errors: {
					email: 'Your account is not yet ready to be used on the Ever Teams Platform'
				}
			},
			{ status: 400 }
		);
	}

	setAuthCookies(
		{
			access_token: newAccessToken,
			refresh_token: {
				token: data.refresh_token
			},
			teamId: body.teamId,
			tenantId: newTenantId,
			organizationId: organization?.organizationId || '',
			languageId: 'en', // TODO: not sure what should be here
			noTeamPopup: true,
			userId
		},
		{ req, res }
	);

	NextResponse.json({ loginResponse: data }, { status: 200 });
};
