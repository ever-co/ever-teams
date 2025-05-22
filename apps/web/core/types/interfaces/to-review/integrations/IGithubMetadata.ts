export interface IGithubMetadata {
	id: number;
	account: {
		login: string;
		id: number;
		node_id: string;
		avatar_url: string;
		gravatar_id: string;
		url: string;
		html_url: string;
		followers_url: string;
		following_url: string;
		gists_url: string;
		starred_url: string;
		subscriptions_url: string;
		organizations_url: string;
		repos_url: string;
		events_url: string;
		received_events_url: string;
		type: string;
		site_admin: boolean;
	};
	repository_selection: string;
	access_tokens_url: string;
	repositories_url: string;
	html_url: string;
	app_id: number;
	app_slug: string;
	target_id: number;
	target_type: string;
	permissions: {
		issues: string;
		metadata: string;
	};
	events: string[];
	created_at: string | Date;
	updated_at: string | Date;
	single_file_name: string | null;
	has_multiple_single_files: boolean;
	single_file_paths: string[];
	suspended_by: string | number | null;
	suspended_at: string | number | null;
}
