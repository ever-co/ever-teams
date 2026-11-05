'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { getActiveTeamIdCookie } from '@/core/lib/helpers/cookies';
import type { TOrganizationTeam } from '@/core/types/schemas';

const SNAPSHOT_STORAGE_KEY = 'ever-teams:active-team-snapshot';

/** What the team switcher needs to name the active team before the list of teams has arrived. */
export interface ActiveTeamSnapshot {
	id: string;
	name: string;
	color: string | null;
	imageUrl: string | null;
	memberCount: number;
}

function snapshotOf(team: TOrganizationTeam, imageUrl: string | undefined): ActiveTeamSnapshot {
	return {
		id: team.id,
		name: team.name,
		color: team.color ?? null,
		imageUrl: imageUrl ?? null,
		memberCount: team.members?.length ?? 0
	};
}

function isSnapshot(value: unknown): value is ActiveTeamSnapshot {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const candidate = value as Partial<ActiveTeamSnapshot>;
	const hasId = typeof candidate.id === 'string';
	const hasName = typeof candidate.name === 'string';
	return hasId && hasName;
}

function readStoredSnapshot() {
	try {
		return window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
	} catch {
		return null;
	}
}

function noStoredSnapshotOnServer() {
	return null;
}

/** The snapshot is read once per mount; nothing needs to be told when it changes. */
function subscribeToNothing() {
	return () => undefined;
}

/** The last active team, only when it is still the team the active-team cookie names. */
function parseSnapshot(stored: string | null): ActiveTeamSnapshot | null {
	if (!stored) {
		return null;
	}
	try {
		const parsed: unknown = JSON.parse(stored);
		if (!isSnapshot(parsed)) {
			return null;
		}
		const activeTeamId = getActiveTeamIdCookie();
		if (parsed.id !== activeTeamId) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

/**
 * The active team as it was on the last visit, so the switcher names it at once on a reload instead of a skeleton
 * held until the slow teams list arrives; the live team replaces it as soon as it is known, and is saved for the next
 * visit. Read through `useSyncExternalStore` with no server value, so the server output and hydration agree.
 */
export function useActiveTeamSnapshot(activeTeam: TOrganizationTeam | null | undefined, imageUrl: string | undefined) {
	const stored = useSyncExternalStore(subscribeToNothing, readStoredSnapshot, noStoredSnapshotOnServer);
	const snapshot = useMemo(() => parseSnapshot(stored), [stored]);

	useEffect(() => {
		if (!activeTeam?.id) {
			return;
		}
		try {
			const next = snapshotOf(activeTeam, imageUrl);
			window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(next));
		} catch {
			// Storage can be full or disabled; the switcher then simply waits for the teams list.
		}
	}, [activeTeam, imageUrl]);

	return snapshot;
}
