'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import { useVoiceFill, type VoiceFillAdapter, type VoiceFillError } from '@/core/hooks/ai/use-voice-fill';
import { useCurrenciesOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import {
	PROJECT_BILLING_LABEL_KEYS,
	PROJECT_BUDGET_TYPE_LABEL_KEYS,
	PROJECT_NAME_MAX_LENGTH,
	PROJECT_STATUS_LABEL_KEYS,
	PROJECT_STATUS_VALUES,
	type ProjectDraft
} from '@/core/lib/utils/project-composer';
import { normalizeStatusName } from '@/core/lib/utils/project-list';
import {
	codesOf,
	dictatedTextToHtml,
	htmlToDictationText,
	voiceChoice,
	voiceChoices,
	voiceChoiceSetOf,
	voiceDate,
	voiceNumber,
	voiceText,
	type VoiceChoiceItem
} from '@/core/lib/utils/voice-fill';
import { EProjectBilling, EProjectBudgetType } from '@/core/types/generics/enums/project';
import type { TVoiceFillFields } from '@/core/types/schemas/ai/voice-fill.schema';
import type { ProjectComposerState } from './use-project-composer';

type ProjectVoiceTarget = Pick<
	ProjectComposerState,
	| 'setName'
	| 'setDescription'
	| 'setStatus'
	| 'setStartDate'
	| 'setEndDate'
	| 'setTeamIds'
	| 'setRoles'
	| 'setTagIds'
	| 'setBudgetType'
	| 'setBudget'
	| 'setCurrency'
	| 'setBilling'
	| 'setProjectUrl'
>;

type ProjectVoiceChoiceSets = ReturnType<typeof useProjectVoiceChoiceSets>;

/** The draft values each dictated field may change: a new start can move the end too. */
const DRAFT_KEYS_OF_FIELD: Record<string, (keyof ProjectDraft)[]> = {
	name: ['name'],
	description: ['description'],
	status: ['status'],
	startDate: ['startDate', 'endDate'],
	endDate: ['endDate'],
	teams: ['teamIds'],
	managers: ['managerIds', 'memberIds'],
	members: ['managerIds', 'memberIds'],
	tags: ['tagIds'],
	budgetType: ['budgetType'],
	budget: ['budget'],
	currency: ['currency'],
	billing: ['billing'],
	projectUrl: ['projectUrl']
};

function copyDraftValue<K extends keyof ProjectDraft>(target: Partial<ProjectDraft>, draft: ProjectDraft, key: K) {
	target[key] = draft[key];
}

function previousValuesOf(draft: ProjectDraft, fieldKeys: string[]) {
	const previous: Partial<ProjectDraft> = {};
	for (const fieldKey of fieldKeys) {
		const draftKeys = DRAFT_KEYS_OF_FIELD[fieldKey] ?? [];
		for (const draftKey of draftKeys) {
			copyDraftValue(previous, draft, draftKey);
		}
	}
	return previous;
}

function dayOf(date: Date | null) {
	if (!date) {
		return null;
	}
	return format(date, 'yyyy-MM-dd');
}

function statusValueOf(status: string | null) {
	const wanted = normalizeStatusName(status);
	return PROJECT_STATUS_VALUES.find((value) => normalizeStatusName(value) === wanted);
}

function namedItems(items: { id: string; name?: string | null }[]) {
	const named: VoiceChoiceItem[] = [];
	for (const item of items) {
		if (item.name) {
			named.push({ value: item.id, label: item.name });
		}
	}
	return named;
}

function useProjectVoiceChoiceSets(composer: ProjectComposerState) {
	const t = useTranslations();
	const { teams, people, tags } = composer;
	return useMemo(() => {
		const statusItems = PROJECT_STATUS_VALUES.map((value) => ({
			value,
			label: t(PROJECT_STATUS_LABEL_KEYS[value])
		}));
		const budgetTypeItems = Object.values(EProjectBudgetType).map((value) => ({
			value,
			label: t(PROJECT_BUDGET_TYPE_LABEL_KEYS[value])
		}));
		const billingItems = Object.values(EProjectBilling).map((value) => ({
			value,
			label: t(PROJECT_BILLING_LABEL_KEYS[value])
		}));
		return {
			status: voiceChoiceSetOf(statusItems, 'S'),
			teams: voiceChoiceSetOf(namedItems(teams), 'T'),
			people: voiceChoiceSetOf(namedItems(people), 'E'),
			tags: voiceChoiceSetOf(namedItems(tags), 'L'),
			budgetType: voiceChoiceSetOf(budgetTypeItems, 'BT'),
			billing: voiceChoiceSetOf(billingItems, 'BL')
		};
	}, [t, teams, people, tags]);
}

function snapshotOf(draft: ProjectDraft, sets: ProjectVoiceChoiceSets) {
	return {
		current: {
			name: draft.name,
			description: htmlToDictationText(draft.description),
			status: sets.status.codeOf(statusValueOf(draft.status)) ?? null,
			startDate: dayOf(draft.startDate),
			endDate: dayOf(draft.endDate),
			teams: codesOf(sets.teams, draft.teamIds),
			managers: codesOf(sets.people, draft.managerIds),
			members: codesOf(sets.people, draft.memberIds),
			tags: codesOf(sets.tags, draft.tagIds),
			budgetType: sets.budgetType.codeOf(draft.budgetType) ?? null,
			budget: draft.budget,
			currency: draft.currency,
			billing: sets.billing.codeOf(draft.billing) ?? null,
			projectUrl: draft.projectUrl
		},
		choices: {
			status: sets.status.choices,
			teams: sets.teams.choices,
			managers: sets.people.choices,
			members: sets.people.choices,
			tags: sets.tags.choices,
			budgetType: sets.budgetType.choices,
			billing: sets.billing.choices
		}
	};
}

function applyTextFields(fields: TVoiceFillFields, target: ProjectVoiceTarget) {
	const filled: string[] = [];
	const name = voiceText(fields.name);
	if (name) {
		target.setName(name.slice(0, PROJECT_NAME_MAX_LENGTH));
		filled.push('name');
	}
	const description = voiceText(fields.description);
	if (description) {
		target.setDescription(dictatedTextToHtml(description));
		filled.push('description');
	}
	const projectUrl = voiceText(fields.projectUrl);
	if (projectUrl) {
		target.setProjectUrl(projectUrl);
		filled.push('projectUrl');
	}
	return filled;
}

/** The start goes first, so a dictated end wins over the end the new start would move. */
function applyScheduleFields(fields: TVoiceFillFields, sets: ProjectVoiceChoiceSets, target: ProjectVoiceTarget) {
	const filled: string[] = [];
	const status = voiceChoice(sets.status, fields.status);
	if (status) {
		target.setStatus(status);
		filled.push('status');
	}
	const startDate = voiceDate(fields.startDate);
	if (startDate) {
		target.setStartDate(startDate);
		filled.push('startDate');
	}
	const endDate = voiceDate(fields.endDate);
	if (endDate) {
		target.setEndDate(endDate);
		filled.push('endDate');
	}
	return filled;
}

function applyPeopleFields(fields: TVoiceFillFields, sets: ProjectVoiceChoiceSets, target: ProjectVoiceTarget) {
	const filled: string[] = [];
	const teamIds = voiceChoices(sets.teams, fields.teams);
	if (teamIds) {
		target.setTeamIds(teamIds);
		filled.push('teams');
	}
	const managerIds = voiceChoices(sets.people, fields.managers);
	const memberIds = voiceChoices(sets.people, fields.members);
	const hasRoles = Boolean(managerIds) || Boolean(memberIds);
	if (hasRoles) {
		target.setRoles(managerIds, memberIds);
	}
	if (managerIds) {
		filled.push('managers');
	}
	if (memberIds) {
		filled.push('members');
	}
	const tagIds = voiceChoices(sets.tags, fields.tags);
	if (tagIds) {
		target.setTagIds(tagIds);
		filled.push('tags');
	}
	return filled;
}

/** Only a currency the organization offers: the dialog's picker could not show any other. */
function knownCurrencyOf(value: TVoiceFillFields[string] | undefined, currencyCodes: Set<string>) {
	const code = voiceText(value);
	if (!code) {
		return undefined;
	}
	if (!currencyCodes.has(code)) {
		return undefined;
	}
	return code;
}

function applyBudgetFields(
	fields: TVoiceFillFields,
	sets: ProjectVoiceChoiceSets,
	target: ProjectVoiceTarget,
	currencyCodes: Set<string>
) {
	const filled: string[] = [];
	const budgetType = voiceChoice(sets.budgetType, fields.budgetType);
	if (budgetType) {
		target.setBudgetType(budgetType as EProjectBudgetType);
		filled.push('budgetType');
	}
	const budget = voiceNumber(fields.budget);
	if (budget !== undefined) {
		target.setBudget(budget);
		filled.push('budget');
	}
	const currency = knownCurrencyOf(fields.currency, currencyCodes);
	if (currency) {
		target.setCurrency(currency);
		filled.push('currency');
	}
	const billing = voiceChoice(sets.billing, fields.billing);
	if (billing) {
		target.setBilling(billing as EProjectBilling);
		filled.push('billing');
	}
	return filled;
}

/**
 * Fill the project dialog by voice: name, description, status, dates, teams, people, tags, budget and website,
 * through the dialog's own setters, so its rules hold (one role per person, the locked team, the end that follows
 * a new start). Undo puts back every value the dictation replaced.
 */
export function useProjectVoiceFill(composer: ProjectComposerState, onError: (error: VoiceFillError) => void) {
	const t = useTranslations();
	const sets = useProjectVoiceChoiceSets(composer);
	const { currencies } = useCurrenciesOwner();
	const composerRef = useSyncRef(composer);

	const currencyCodes = useMemo(() => new Set(currencies.map((item) => item.isoCode)), [currencies]);

	const adapter = useMemo<VoiceFillAdapter>(
		() => ({
			form: 'project',
			snapshot: () => snapshotOf(composerRef.current.draft, sets),
			apply: (fields) => {
				const target = composerRef.current;
				const previous = previousValuesOf(target.draft, Object.keys(fields));
				const filledKeys = [
					...applyTextFields(fields, target),
					...applyScheduleFields(fields, sets, target),
					...applyPeopleFields(fields, sets, target),
					...applyBudgetFields(fields, sets, target, currencyCodes)
				];
				const restore = () => composerRef.current.restoreFields(previous);
				return { filledKeys, restore };
			}
		}),
		[composerRef, sets, currencyCodes]
	);

	const voice = useVoiceFill({ adapter, onError });

	const fieldLabels = useMemo(() => {
		const dates = t('pages.projects.list.COLUMN_DATES');
		const budget = t('pages.projects.list.COLUMN_BUDGET');
		return {
			name: t('pages.projects.basicInformationForm.formFields.title'),
			description: t('common.DESCRIPTION'),
			status: t('common.STATUS'),
			startDate: dates,
			endDate: dates,
			teams: t('common.TEAMS'),
			managers: t('common.MANAGERS'),
			members: t('common.MEMBERS'),
			tags: t('pages.projects.categorizationForm.formFields.tags'),
			budgetType: budget,
			budget,
			currency: budget,
			billing: budget,
			projectUrl: t('pages.projects.basicInformationForm.formFields.websiteUrl')
		};
	}, [t]);

	const hasFilled = voice.filledKeys.length > 0;
	let hint = t('voiceFill.HINT_PROJECT');
	if (hasFilled) {
		hint = t('voiceFill.HINT_AGAIN');
	}

	return { voice, fieldLabels, hint };
}
