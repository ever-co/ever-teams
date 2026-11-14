'use client';

import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useGetCurrentOrganization } from '@/core/hooks/auth/use-current-organization';
import {
	applyFromOfChoice,
	pastTimeRuleOf,
	rateApplyChoiceOf,
	rateSavedDescriptionOf,
	type RateApplyChoice,
	type RateApplyFrom
} from '@/core/lib/utils/rate-apply';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { RateSaveOutcome } from '@/core/types/schemas/organization/rates.schema';

const NOTHING_KNOWN: RateSaveOutcome = { repricedTimeLogs: null };

/**
 * "Apply to time already tracked?" for a rate editor (#5212), from the current organization's rule. Before the
 * organization is read, and on a Gauzy that does not store rates on time entries, it asks nothing (`rule` is null)
 * and a save sends no day, as before.
 */
export function useRateApplyQuestion() {
	const t = useTranslations();
	// The editors open on pages that do not read the organization, whose rule the answers follow
	useGetCurrentOrganization({ enabled: true });
	const organization = useAtomValue(currentOrganizationState);
	const rule = pastTimeRuleOf(organization);
	const [pickedChoice, setPickedChoice] = useState<RateApplyChoice | null>(null);
	const [day, setDayText] = useState('');
	const [isDayMissing, setIsDayMissing] = useState(false);
	const choice = rateApplyChoiceOf(rule, pickedChoice);

	const pickChoice = (next: RateApplyChoice) => {
		setPickedChoice(next);
		setIsDayMissing(false);
	};

	const setDay = (next: string) => {
		setDayText(next);
		setIsDayMissing(false);
	};

	/** The day a save of a changed rate sends; "from a date" without one saves nothing, and the question says so. */
	const applyFromOfSave = (): RateApplyFrom => {
		if (!choice) {
			return { isDayMissing: false };
		}
		const answer = applyFromOfChoice(choice, day);
		setIsDayMissing(answer.isDayMissing);
		return answer;
	};

	/** Says the rate is saved and, when it is known, what became of the time already tracked. */
	const confirmSaved = (outcome: RateSaveOutcome | void) => {
		if (!choice) {
			return;
		}
		const description = rateSavedDescriptionOf(choice, outcome ?? NOTHING_KNOWN);
		if (!description) {
			toast.success(t('rates.RATE_SAVED'));
			return;
		}
		toast.success(t('rates.RATE_SAVED'), { description: t(description.key, { count: description.count }) });
	};

	return { rule, choice, pickChoice, day, setDay, isDayMissing, applyFromOfSave, confirmSaved };
}

export type RateApplyQuestionState = ReturnType<typeof useRateApplyQuestion>;
