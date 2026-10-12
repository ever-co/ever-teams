/**
 * What the paired API's Ever Platform routes answer (organization level), and what this app's own
 * /api/ever-stats routes answer. Only the fields the settings read are typed.
 */

export interface IEverConnectHealth {
	connected: boolean;
}

export interface IEverConnectLink {
	integration_tenant_id: string | null;
	link_id: string;
	ever_org_id: string;
	handle: string | null;
	status: string;
	linked_at: string;
}

export interface IEverConnectStatus {
	enabled: boolean;
	install_source: string;
	managed_by: 'ever_cloud' | 'operator';
	operator: boolean;
	connected: boolean;
	link: IEverConnectLink | null;
}

export interface IEverConnectScopeRow {
	field_path: string;
	direction: string;
	form: string;
	frequency: string;
	purpose: string;
	retention: string;
}

export interface IEverConnectIntegration {
	key: string;
	name: string;
	description: string;
	instance_wide: boolean;
	app_ever_co_only: boolean;
	scope_version: number;
	scope: IEverConnectScopeRow[];
	state: string;
	enabled: boolean;
	policy: 'allowed' | 'denied_by_env' | 'denied_by_policy';
}

export interface IEverConnectEntitlementSummary {
	subject: 'instance' | 'link';
	status: string;
	expires_at: string | null;
	fetched_at: string | null;
	handle: string | null;
	tier: string | null;
	plan: string | null;
	features: Record<string, boolean>;
}

export interface IEverConnectEntitlement {
	instance: IEverConnectEntitlementSummary | null;
	link: IEverConnectEntitlementSummary | null;
}

/** This web app's own reporter, as the operator sees it. */
export interface IEverStatsTeamsReporter {
	reporter: string;
	next_send_at: string | null;
}

/** GET /api/ever-stats/status for the operator. */
export interface IEverStatsStatus {
	enabled: boolean;
	/** Why nothing is sent (`ui`, `config`, `key_unreadable`), or null while reports go out. */
	reason: string | null;
	install_source: string;
	serves: string[];
	country: string;
	next_send_at: string | null;
	schema_url: string;
	teams: IEverStatsTeamsReporter;
}

/** One report as it was sent. */
export interface IEverStatsAttempt {
	payload: string;
	sent_at: string | null;
	http_status: number | null;
	outcome?: string;
	status?: string;
	period: string;
	final?: boolean;
}

/** GET /api/ever-stats/last for the operator. */
export interface IEverStatsLast {
	api: IEverStatsAttempt | null;
	teams: { last: IEverStatsAttempt[] };
}

/**
 * What the statistics card shows: the operator's view, who manages them when this person may not
 * see them, or nothing when this web app runs without its statistics module.
 */
export type TEverStatsView =
	| { kind: 'operator'; status: IEverStatsStatus }
	| { kind: 'managed'; managedBy: 'ever_cloud' | 'operator' }
	| { kind: 'off' };
