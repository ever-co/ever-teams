// The time spent for one client, as the host's backend gets it from the Ever Teams API with its embed credential.
export interface IClientTimeReport {
	client: { id: string; name: string };
	// The IANA zone the day and the week are counted in.
	timeZone: string;
	// date: YYYY-MM-DD
	today: { date: string; seconds: number };
	// YYYY-MM-DD, both days included.
	week: { start: string; end: string; seconds: number };
	// This week, by project.
	projects: Array<{ id: string; name: string; seconds: number }>;
}
