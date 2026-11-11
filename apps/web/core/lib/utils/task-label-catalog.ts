/**
 * The labels a team can add from Settings › Labels › Browse labels (#5016), by category, with the names and colours
 * the issue proposes (after GitHub, GitLab, Jira and Linear). They are added as the team's own labels, which the
 * team can then rename, recolour or remove like any other. Names stay in English: a label is the team's data, shared
 * by people who read the app in different languages.
 */

export type LabelCategoryKey = 'type' | 'priority' | 'workflow' | 'area' | 'release' | 'feedback' | 'project';

export interface CatalogLabel {
	name: string;
	color: string;
}

export interface LabelCategory {
	key: LabelCategoryKey;
	labels: ReadonlyArray<CatalogLabel>;
}

const label = (name: string, color: string): CatalogLabel => ({ name, color });

export const LABEL_CATALOG: ReadonlyArray<LabelCategory> = [
	{
		key: 'type',
		labels: [
			label('Bug', '#D73A4A'),
			label('Feature', '#8957E5'),
			label('Enhancement', '#1D76DB'),
			label('Improvement', '#54A3FF'),
			label('Task', '#6B7280'),
			label('Chore', '#9CA3AF'),
			label('Maintenance', '#64748B'),
			label('Refactoring', '#F59E0B'),
			label('Documentation', '#0EA5E9'),
			label('Research', '#06B6D4'),
			label('Design', '#EC4899'),
			label('Spike', '#6366F1'),
			label('Epic', '#7C3AED'),
			label('Story', '#16A34A'),
			label('Subtask', '#94A3B8')
		]
	},
	{
		key: 'priority',
		labels: [
			label('Priority: Critical', '#B91C1C'),
			label('Priority: High', '#EF4444'),
			label('Priority: Medium', '#F97316'),
			label('Priority: Low', '#EAB308'),
			label('Priority: None', '#9CA3AF')
		]
	},
	{
		key: 'workflow',
		labels: [
			label('Needs Triage', '#EAB308'),
			label('Needs Review', '#3B82F6'),
			label('In Progress', '#6366F1'),
			label('Blocked', '#DC2626'),
			label('On Hold', '#F97316'),
			label('Ready for Development', '#06B6D4'),
			label('Ready for Testing', '#14B8A6'),
			label('Verified', '#22C55E'),
			label('Duplicate', '#6B7280'),
			label("Won't Fix", '#6B7280'),
			label('Invalid', '#9CA3AF'),
			label('Completed', '#16A34A')
		]
	},
	{
		key: 'area',
		labels: [
			label('Frontend', '#3B82F6'),
			label('Backend', '#16A34A'),
			label('API', '#0D9488'),
			label('Database', '#EA580C'),
			label('UI/UX', '#EC4899'),
			label('Accessibility', '#0891B2'),
			label('Performance', '#CA8A04'),
			label('Security', '#B91C1C'),
			label('DevOps', '#4F46E5'),
			label('Infrastructure', '#64748B'),
			label('Mobile', '#9333EA'),
			label('Desktop', '#7C3AED'),
			label('Testing', '#0F766E'),
			label('CI/CD', '#2563EB'),
			label('Internationalization (i18n)', '#0891B2'),
			label('Dependencies', '#EA580C')
		]
	},
	{
		key: 'release',
		labels: [
			label('Breaking Change', '#991B1B'),
			label('Backward Compatibility', '#15803D'),
			label('Release', '#7E22CE'),
			label('Hotfix', '#DC2626'),
			label('Regression', '#EA580C'),
			label('Migration', '#4F46E5'),
			label('Deprecated', '#6B7280'),
			label('Technical Debt', '#D97706')
		]
	},
	{
		key: 'feedback',
		labels: [
			label('Customer Request', '#2563EB'),
			label('User Feedback', '#0891B2'),
			label('Usability', '#DB2777'),
			label('Accessibility Request', '#0D9488'),
			label('Customer Impact', '#EA580C'),
			label('Internal', '#64748B')
		]
	},
	{
		key: 'project',
		labels: [
			label('Planning', '#6366F1'),
			label('Meeting', '#2563EB'),
			label('Follow-up', '#0891B2'),
			label('Milestone', '#7C3AED'),
			label('Urgent', '#DC2626'),
			label('Blocked by Dependency', '#F97316'),
			label('Waiting for Feedback', '#EAB308'),
			label('Needs Estimation', '#0D9488')
		]
	}
];

/**
 * What two label names are compared by: trimmed, in lower case, with dashes and runs of spaces as one space. The
 * app shows a stored dash as a space, so "Follow-up" and "follow up" are the same label to anyone reading it.
 */
export function labelNameKeyOf(name: string | null | undefined): string {
	// Trimmed last: a leading or trailing dash becomes a space, which must not tell two names apart
	return (name ?? '').toLowerCase().replaceAll('-', ' ').replaceAll(/\s+/g, ' ').trim();
}

/** The keys of a team's label names, to tell which catalog labels it already has. */
export function labelNameKeysOf(names: ReadonlyArray<string | null | undefined>): Set<string> {
	return new Set(names.map(labelNameKeyOf).filter(Boolean));
}

export interface CatalogEntry {
	label: CatalogLabel;
	/** The team already has a label of that name: it shows as added and cannot be picked again. */
	isAdded: boolean;
}

export interface CatalogGroup {
	key: LabelCategoryKey;
	entries: CatalogEntry[];
}

/**
 * The catalog as the dialog lists it: the categories whose labels match the search (on the name, or on the
 * category's own name, so "priority" lists the whole category), each label marked when the team has it already.
 */
export function catalogGroupsOf(
	query: string,
	existingKeys: ReadonlySet<string>,
	categoryNameOf: (key: LabelCategoryKey) => string
): CatalogGroup[] {
	const search = labelNameKeyOf(query);
	const groups: CatalogGroup[] = [];
	for (const category of LABEL_CATALOG) {
		const isCategoryMatch = search !== '' && labelNameKeyOf(categoryNameOf(category.key)).includes(search);
		const entries = category.labels
			.filter((item) => isCategoryMatch || labelNameKeyOf(item.name).includes(search))
			.map((item) => ({ label: item, isAdded: existingKeys.has(labelNameKeyOf(item.name)) }));
		if (entries.length > 0) {
			groups.push({ key: category.key, entries });
		}
	}
	return groups;
}
