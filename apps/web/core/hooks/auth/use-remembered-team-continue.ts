'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	forgetRememberedTeam,
	isRememberedTeamRefused,
	pickRememberedTeam,
	readRememberedTeam
} from '@/core/lib/auth/remembered-team';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { useWorkspaceAnalysis } from './use-workspace-analysis';

export const CONTINUE_TO_WORKSPACE_BUTTON_ID = 'continue-to-workspace';

/** The choosers keep their own submit: the automatic continue presses the same button the person would. */
function pressContinue() {
	document.getElementById(CONTINUE_TO_WORKSPACE_BUTTON_ID)?.click();
}

type RememberedTeamContinueOptions = {
	workspaces: ISigninEmailConfirmWorkspaces[];
	email: string;
	/** False where another rule already picks the workspace (an Ever ID token naming one). */
	rememberedTeamAllowed?: boolean;
};

/**
 * Opens a workspace chooser's team without asking: the only team of a single workspace, as before, or the remembered
 * team (see `pickRememberedTeam`). Gives the list back, with the reason, when that sign-in fails, and keeps showing it
 * on this browser until a team opens again.
 */
export function useRememberedTeamContinue({
	workspaces,
	email,
	rememberedTeamAllowed = true
}: RememberedTeamContinueOptions) {
	const t = useTranslations();
	const singleTeamAutoSubmit = useWorkspaceAnalysis(workspaces).shouldAutoSubmit;
	const [continueFailed, setContinueFailed] = useState(false);
	const [openedAt] = useState(Date.now);

	const remembered = useMemo(() => {
		const record = readRememberedTeam(email);
		const refusedBefore = isRememberedTeamRefused(record);
		if (!rememberedTeamAllowed) {
			return { pick: null, refusedBefore };
		}
		const pick = pickRememberedTeam(workspaces, record, openedAt);
		return { pick, refusedBefore };
	}, [email, openedAt, rememberedTeamAllowed, workspaces]);

	const rememberedPick = remembered.pick;
	const hasRememberedPick = rememberedPick !== null;
	const singleTeamAllowed = !remembered.refusedBefore;
	const singleTeamContinue = singleTeamAutoSubmit && singleTeamAllowed;
	const wantsAutoContinue = singleTeamContinue || hasRememberedPick;
	const autoContinue = wantsAutoContinue && !continueFailed;

	useEffect(() => {
		if (!autoContinue) {
			return;
		}
		const timer = window.setTimeout(pressContinue, 100);
		return () => window.clearTimeout(timer);
	}, [autoContinue]);

	const onContinueFailed = useCallback(
		(error: unknown) => {
			setContinueFailed(true);
			forgetRememberedTeam(email);
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t('pages.auth.WORKSPACE_OPEN_FAILED'), { description: t(reasonKey) });
		},
		[email, t]
	);

	return { rememberedPick, autoContinue, onContinueFailed };
}
