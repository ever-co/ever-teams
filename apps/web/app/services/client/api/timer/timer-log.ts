import { get } from '../../axios';

export async function getTimerLogs(
	tenantId: string,
	organizationId: string,
	employeeId: string,
	organizationTeamId: string | null
) {
	const endpoint = `/timer/status?tenantId=${tenantId}&organizationId=${organizationId}&organizationTeamId=${organizationTeamId}&employeeIds[0]=${employeeId}`;

	const data = await get(endpoint, true, { tenantId });

	return data;
}

// todayStart, todayEnd;
