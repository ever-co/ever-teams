import { z } from 'zod';

/**
 * Zod schemas for GitHub Integration-related interfaces
 */

// GitHub Account schema (nested in metadata)
export const githubAccountSchema = z.object({
	login: z.string(),
	id: z.number(),
	node_id: z.string(),
	avatar_url: z.string(),
	gravatar_id: z.string(),
	url: z.string(),
	html_url: z.string(),
	followers_url: z.string(),
	following_url: z.string(),
	gists_url: z.string(),
	starred_url: z.string(),
	subscriptions_url: z.string(),
	organizations_url: z.string(),
	repos_url: z.string(),
	events_url: z.string(),
	received_events_url: z.string(),
	type: z.string(),
	site_admin: z.boolean()
});

// GitHub Permissions schema (nested in metadata)
export const githubPermissionsSchema = z.object({
	issues: z.string(),
	metadata: z.string()
});

// GitHub Metadata schema (IGithubMetadata interface)
export const githubMetadataSchema = z.object({
	id: z.number(),
	account: githubAccountSchema,
	repository_selection: z.string(),
	access_tokens_url: z.string(),
	repositories_url: z.string(),
	html_url: z.string(),
	app_id: z.number(),
	app_slug: z.string(),
	target_id: z.number(),
	target_type: z.string(),
	permissions: githubPermissionsSchema,
	events: z.array(z.string()),
	created_at: z.string(),
	updated_at: z.string(),
	single_file_name: z.string().nullable(),
	has_multiple_single_files: z.boolean(),
	single_file_paths: z.array(z.string()),
	suspended_by: z.union([z.string(), z.number()]).nullable(),
	suspended_at: z.union([z.string(), z.number()]).nullable()
});

// GitHub Repository Owner schema (nested in repositories)
export const githubRepositoryOwnerSchema = z.object({
	login: z.string(),
	id: z.number(),
	node_id: z.string(),
	avatar_url: z.string(),
	gravatar_id: z.string(),
	url: z.string(),
	html_url: z.string(),
	followers_url: z.string(),
	following_url: z.string(),
	gists_url: z.string(),
	starred_url: z.string(),
	subscriptions_url: z.string(),
	organizations_url: z.string(),
	repos_url: z.string(),
	events_url: z.string(),
	received_events_url: z.string(),
	type: z.string(),
	site_admin: z.boolean()
});

// GitHub Repository License schema (nested in repository)
export const githubRepositoryLicenseSchema = z.object({
	key: z.string(),
	name: z.string(),
	spdx_id: z.string(),
	url: z.string(),
	node_id: z.string()
});

// GitHub Repository Permissions schema (nested in repository)
export const githubRepositoryPermissionsSchema = z.object({
	admin: z.boolean(),
	maintain: z.boolean(),
	push: z.boolean(),
	triage: z.boolean(),
	pull: z.boolean()
});

// GitHub Repository schema (single repository in the array)
export const githubRepositorySchema = z.object({
	id: z.number(),
	node_id: z.string(),
	name: z.string(),
	full_name: z.string(),
	private: z.boolean(),
	owner: githubRepositoryOwnerSchema,
	html_url: z.string(),
	description: z.string().nullable(),
	fork: z.boolean(),
	url: z.string(),
	forks_url: z.string(),
	keys_url: z.string(),
	collaborators_url: z.string(),
	teams_url: z.string(),
	hooks_url: z.string(),
	issue_events_url: z.string(),
	events_url: z.string(),
	assignees_url: z.string(),
	branches_url: z.string(),
	tags_url: z.string(),
	blobs_url: z.string(),
	git_tags_url: z.string(),
	git_refs_url: z.string(),
	trees_url: z.string(),
	statuses_url: z.string(),
	languages_url: z.string(),
	stargazers_url: z.string(),
	contributors_url: z.string(),
	subscribers_url: z.string(),
	subscription_url: z.string(),
	commits_url: z.string(),
	git_commits_url: z.string(),
	comments_url: z.string(),
	issue_comment_url: z.string(),
	contents_url: z.string(),
	compare_url: z.string(),
	merges_url: z.string(),
	archive_url: z.string(),
	downloads_url: z.string(),
	issues_url: z.string(),
	pulls_url: z.string(),
	milestones_url: z.string(),
	notifications_url: z.string(),
	labels_url: z.string(),
	releases_url: z.string(),
	deployments_url: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
	pushed_at: z.string(),
	git_url: z.string(),
	ssh_url: z.string(),
	clone_url: z.string(),
	svn_url: z.string(),
	homepage: z.string().nullable(),
	size: z.number(),
	stargazers_count: z.number(),
	watchers_count: z.number(),
	language: z.string(),
	has_issues: z.boolean(),
	has_projects: z.boolean(),
	has_downloads: z.boolean(),
	has_wiki: z.boolean(),
	has_pages: z.boolean(),
	has_discussions: z.boolean(),
	forks_count: z.number(),
	mirror_url: z.string().nullable(),
	archived: z.boolean(),
	disabled: z.boolean(),
	open_issues_count: z.number(),
	license: githubRepositoryLicenseSchema,
	allow_forking: z.boolean(),
	is_template: z.boolean(),
	web_commit_signoff_required: z.boolean(),
	topics: z.array(z.any()),
	visibility: z.string(),
	forks: z.number(),
	open_issues: z.number(),
	watchers: z.number(),
	default_branch: z.string(),
	permissions: githubRepositoryPermissionsSchema
});

// GitHub Repositories schema (IGithubRepositories interface)
export const githubRepositoriesSchema = z.object({
	total_count: z.number(),
	repository_selection: z.string(),
	repositories: z.array(githubRepositorySchema)
});

// Minimal schemas for fallback validation
export const minimalGithubMetadataSchema = z.object({
	id: z.number(),
	account: z.object({
		login: z.string(),
		id: z.number()
	}).passthrough(),
	app_id: z.number()
}).passthrough();

export const minimalGithubRepositoriesSchema = z.object({
	total_count: z.number(),
	repositories: z.array(z.object({
		id: z.number(),
		name: z.string(),
		full_name: z.string()
	}).passthrough())
}).passthrough();

// Inferred TypeScript types from Zod schemas
export type TGithubMetadata = z.infer<typeof githubMetadataSchema>;
export type TGithubRepositories = z.infer<typeof githubRepositoriesSchema>;
export type TGithubRepository = z.infer<typeof githubRepositorySchema>;
export type TMinimalGithubMetadata = z.infer<typeof minimalGithubMetadataSchema>;
export type TMinimalGithubRepositories = z.infer<typeof minimalGithubRepositoriesSchema>;
