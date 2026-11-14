'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTimeGoalWrites } from '@/core/hooks/time-goals/use-time-goals';
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import {
	createInputOf,
	draftOfGoal,
	EMPTY_GOAL_DRAFT,
	goalDraftErrorsOf,
	type GoalDraft,
	type GoalOwnerChoice,
	updateInputOf
} from '@/core/lib/utils/time-goals';
import type { ETimeGoalComparison, ETimeGoalPeriod, ITimeGoal } from '@/core/types/interfaces/timesheet/time-goal';

export type GoalComposerMode = 'create' | 'edit';

/** Why a save failed: the platform refused whom the goal counts (403), or anything else. */
export type GoalSaveError = 'forbidden' | 'save' | null;

function toggled(ids: ReadonlyArray<string>, id: string) {
	if (ids.includes(id)) {
		return ids.filter((value) => value !== id);
	}
	return [...ids, id];
}

interface GoalComposerOptions {
	mode: GoalComposerMode;
	goal?: ITimeGoal | null;
	activeTeamId: string | null;
	onDone: (goal: ITimeGoal) => void;
}

/**
 * The New goal and Edit goal form: the draft, what keeps it from being saved (shown once a save was tried), and the
 * save itself. Whom a goal counts is picked at creation only.
 */
export function useGoalComposer({ mode, goal, activeTeamId, onDone }: GoalComposerOptions) {
	const isEdit = mode === 'edit' && Boolean(goal);
	const [draft, setDraft] = useState<GoalDraft>(() => {
		if (isEdit && goal) {
			return draftOfGoal(goal);
		}
		return EMPTY_GOAL_DRAFT;
	});
	const [hasTriedSaving, setHasTriedSaving] = useState(false);
	const [saveError, setSaveError] = useState<GoalSaveError>(null);
	const { write, isWriting } = useTimeGoalWrites();

	const allErrors = useMemo(() => goalDraftErrorsOf(draft), [draft]);
	const errors = hasTriedSaving ? allErrors : {};

	const change = useCallback((changes: Partial<GoalDraft>) => {
		setDraft((current) => ({ ...current, ...changes }));
		setSaveError(null);
	}, []);

	const setName = useCallback((name: string) => change({ name }), [change]);
	const setComparison = useCallback((comparison: ETimeGoalComparison) => change({ comparison }), [change]);
	const setHours = useCallback((hours: string) => change({ hours }), [change]);
	const setPeriod = useCallback((period: ETimeGoalPeriod) => change({ period }), [change]);
	const setOwner = useCallback((owner: GoalOwnerChoice) => change({ owner }), [change]);
	const setMemberId = useCallback((memberId: string) => change({ memberId }), [change]);
	const setBillableOnly = useCallback((billableOnly: boolean) => change({ billableOnly }), [change]);
	const toggleProject = useCallback(
		(projectId: string) =>
			setDraft((current) => ({ ...current, projectIds: toggled(current.projectIds, projectId) })),
		[]
	);
	const toggleClient = useCallback(
		(clientId: string) => setDraft((current) => ({ ...current, clientIds: toggled(current.clientIds, clientId) })),
		[]
	);

	const submit = useCallback(async () => {
		setHasTriedSaving(true);
		const hasErrors = Object.keys(allErrors).length > 0;
		if (hasErrors || isWriting) {
			return;
		}
		setSaveError(null);
		try {
			let saved: ITimeGoal;
			if (isEdit && goal) {
				saved = await write({ kind: 'update', goalId: goal.id, input: updateInputOf(draft) });
			} else {
				saved = await write({ kind: 'create', input: createInputOf(draft, activeTeamId) });
			}
			onDone(saved);
		} catch (error) {
			const isForbidden = errorStatusOf(error) === 403;
			setSaveError(isForbidden ? 'forbidden' : 'save');
		}
	}, [activeTeamId, allErrors, draft, goal, isEdit, isWriting, onDone, write]);

	return {
		draft,
		errors,
		isEdit,
		isSubmitting: isWriting,
		saveError,
		setName,
		setComparison,
		setHours,
		setPeriod,
		setOwner,
		setMemberId,
		setBillableOnly,
		toggleProject,
		toggleClient,
		submit
	};
}

export type GoalComposer = ReturnType<typeof useGoalComposer>;
