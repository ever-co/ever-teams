import {
	Bell,
	Clock,
	FlagPriority,
	Integration,
	Layers,
	Preferences,
	Ruler,
	Settings,
	ShieldUser,
	StatusCircle,
	Tag,
	UserCircle,
	Users,
	Version
} from '@/core/components/icons';

export type SettingsIcon = React.ComponentType<{ className?: string }>;

export type SettingsGroupId = 'account' | 'team' | 'taskProperties';

export type SettingsEntryId =
	| 'profile'
	| 'preferences'
	| 'workingHours'
	| 'notifications'
	| 'teamGeneral'
	| 'members'
	| 'integrations'
	| 'permissions'
	| 'statuses'
	| 'priorities'
	| 'sizes'
	| 'labels'
	| 'issueTypes'
	| 'versions';

export interface SettingsEntry {
	id: SettingsEntryId;
	group: SettingsGroupId;
	href: string;
	icon: SettingsIcon;
	managerOnly?: boolean;
}

export const SETTINGS_ROOT = '/settings';

const PERMISSIONS_PATH = '/permissions';

export const SETTINGS_ENTRIES: ReadonlyArray<SettingsEntry> = [
	{ id: 'profile', group: 'account', href: '/settings/personal', icon: UserCircle },
	{ id: 'preferences', group: 'account', href: '/settings/personal/preferences', icon: Preferences },
	{ id: 'workingHours', group: 'account', href: '/settings/personal/working-hours', icon: Clock },
	{ id: 'notifications', group: 'account', href: '/settings/personal/notifications', icon: Bell },
	{ id: 'teamGeneral', group: 'team', href: '/settings/team', icon: Settings },
	{ id: 'members', group: 'team', href: '/settings/team/members', icon: Users, managerOnly: true },
	{ id: 'integrations', group: 'team', href: '/settings/team/integrations', icon: Integration, managerOnly: true },
	// The roles page keeps its own route, so links to it still work; the settings sidebar stays on it.
	{ id: 'permissions', group: 'team', href: PERMISSIONS_PATH, icon: ShieldUser, managerOnly: true },
	{ id: 'statuses', group: 'taskProperties', href: '/settings/team/statuses', icon: StatusCircle },
	{ id: 'priorities', group: 'taskProperties', href: '/settings/team/priorities', icon: FlagPriority },
	{ id: 'sizes', group: 'taskProperties', href: '/settings/team/sizes', icon: Ruler },
	{ id: 'labels', group: 'taskProperties', href: '/settings/team/labels', icon: Tag },
	{ id: 'issueTypes', group: 'taskProperties', href: '/settings/team/issue-types', icon: Layers },
	{ id: 'versions', group: 'taskProperties', href: '/settings/team/versions', icon: Version }
];

export const SETTINGS_GROUPS: ReadonlyArray<SettingsGroupId> = ['account', 'team', 'taskProperties'];

/** Links in emails, bookmarks and the GitHub install callback still carry the hashes of the former long pages. */
const LEGACY_HASH_TARGETS: Readonly<Record<string, string>> = {
	'personal#general': '/settings/personal',
	'personal#danger-zone': '/settings/personal',
	'personal#working-hours': '/settings/personal/working-hours',
	'personal#sync-zone': '/settings/personal/preferences',
	'personal#notifications': '/settings/personal/notifications',
	'team#general-settings': '/settings/team',
	'team#danger-zones': '/settings/team',
	'team#invitations': '/settings/team/members',
	'team#member': '/settings/team/members',
	'team#integrations': '/settings/team/integrations',
	'team#ever-platform': '/settings/team/integrations',
	'team#issues-settings': '/settings/team/statuses',
	'team#statuses': '/settings/team/statuses',
	'team#priorities': '/settings/team/priorities',
	'team#sizes': '/settings/team/sizes',
	'team#labels': '/settings/team/labels'
};

export function legacySettingsTarget(scope: 'personal' | 'team', hash: string): string | null {
	const section = hash.replace(/^#/, '');
	if (!section) {
		return null;
	}
	const key = `${scope}#${section}`;
	const target = LEGACY_HASH_TARGETS[key];
	if (!target) {
		return null;
	}
	return target;
}

export function isEntryVisible(entry: SettingsEntry, isTeamManager: boolean): boolean {
	if (!entry.managerOnly) {
		return true;
	}
	return isTeamManager;
}

export function entriesOfGroup(group: SettingsGroupId, isTeamManager: boolean): SettingsEntry[] {
	return SETTINGS_ENTRIES.filter((entry) => {
		const isInGroup = entry.group === group;
		const isVisible = isEntryVisible(entry, isTeamManager);
		return isInGroup && isVisible;
	});
}

export function isSettingsPath(strippedPathname: string): boolean {
	const isRoot = strippedPathname === SETTINGS_ROOT;
	const isBelow = strippedPathname.startsWith(`${SETTINGS_ROOT}/`);
	const isPermissions = strippedPathname === PERMISSIONS_PATH;
	return isRoot || isBelow || isPermissions;
}

export function activeSettingsEntry(strippedPathname: string): SettingsEntry | null {
	let best: SettingsEntry | null = null;
	for (const entry of SETTINGS_ENTRIES) {
		const isSamePage = strippedPathname === entry.href;
		const isBelow = strippedPathname.startsWith(`${entry.href}/`);
		const matches = isSamePage || isBelow;
		const isLonger = !best || entry.href.length > best.href.length;
		if (matches && isLonger) {
			best = entry;
		}
	}
	return best;
}
