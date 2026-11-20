import { clientError, isRecord } from './error-mapping';
import { Transport } from './transport';
import { EverTeamsClientOptions } from './types';

// The part of GET /user/me?includeEmployee=true&includeOrganization=true the client reads: the user's tenant and its
// employee, whose organization is the one the member works in.
interface MeAnswer {
	tenantId?: string | null;
	employee?: {
		id?: string | null;
		organizationId?: string | null;
		organization?: { id?: string | null } | null;
	} | null;
}

export interface ClientScope {
	tenantId: string;
	organizationId: string;
}

export interface ClientMember extends ClientScope {
	employeeId: string;
}

export interface Identity {
	/** The tenant and organization requests are for: the options', else read once from the token's user. */
	scope(): Promise<ClientScope>;
	/** The same, with the employee the token's user is in the organization. */
	member(): Promise<ClientMember>;
}

function organizationIdOf(answer: MeAnswer): string | undefined {
	const employee = answer.employee;
	if (!employee) {
		return undefined;
	}
	if (employee.organizationId) {
		return employee.organizationId;
	}
	return employee.organization?.id ?? undefined;
}

// An answer of GET /user/me with no user in it (null, an empty body) is a failed read: it is not kept.
function meOf(answer: unknown): MeAnswer {
	if (!isRecord(answer)) {
		throw clientError(
			'UNEXPECTED_ANSWER',
			'GET /user/me answered no user.',
			"Check that apiUrl is the Ever Teams API's address (it ends with /api), then try again."
		);
	}
	return answer as MeAnswer;
}

export function createIdentity(
	transport: Transport,
	options: Pick<EverTeamsClientOptions, 'tenantId' | 'organizationId'>
): Identity {
	let me: Promise<MeAnswer> | null = null;

	const forget = (pending: Promise<MeAnswer>) => {
		if (me === pending) {
			me = null;
		}
	};

	function readMe(): Promise<MeAnswer> {
		if (me) {
			return me;
		}
		const pending = transport
			.request<unknown>({
				method: 'GET',
				path: '/user/me',
				query: { includeEmployee: true, includeOrganization: true },
				reachableByEmbedToken: true
			})
			.then(meOf);
		me = pending;
		// A failed read is not kept: the next call reads again.
		pending.then(undefined, () => forget(pending));
		return pending;
	}

	function scopeOf(answer: MeAnswer): ClientScope {
		const tenantId = options.tenantId || answer.tenantId;
		const organizationId = options.organizationId || organizationIdOf(answer);
		if (!tenantId) {
			throw clientError(
				'NO_TENANT',
				"The token's user has no tenant.",
				'Pass tenantId to createClient, or use the token of a member who tracks time.'
			);
		}
		if (!organizationId) {
			throw clientError(
				'NO_ORGANIZATION',
				"The token's user is not a member of an organization.",
				'Pass organizationId to createClient, or use the token of a member who tracks time.'
			);
		}
		return { tenantId, organizationId };
	}

	async function scope(): Promise<ClientScope> {
		const { tenantId, organizationId } = options;
		if (tenantId && organizationId) {
			return { tenantId, organizationId };
		}
		return scopeOf(await readMe());
	}

	async function member(): Promise<ClientMember> {
		const answer = await readMe();
		const employeeId = answer.employee?.id;
		if (!employeeId) {
			throw clientError(
				'NO_EMPLOYEE',
				"The token's user is not a member (employee) of an organization.",
				'Use the token of a member who tracks time.'
			);
		}
		const memberScope = scopeOf(answer);
		// The employee read belongs to one organization: with another organizationId in the options, its id would
		// pair this organization with a member of another one.
		const employeeOrganization = organizationIdOf(answer);
		const isOtherOrganization =
			Boolean(employeeOrganization) && employeeOrganization !== memberScope.organizationId;
		if (isOtherOrganization) {
			throw clientError(
				'NO_EMPLOYEE',
				`The token's user is a member (employee) of organization ${employeeOrganization}, not of ${memberScope.organizationId}.`,
				"Leave organizationId out, or pass the organization of the token's member."
			);
		}
		return { ...memberScope, employeeId };
	}

	return { scope, member };
}
