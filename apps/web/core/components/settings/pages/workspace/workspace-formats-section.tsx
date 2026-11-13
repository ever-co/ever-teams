'use client';

import { useCallback, useId, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Spinner } from '@/core/components/icons';
import { CurrencySelect } from '@/core/components/rates/currency-select';
import {
	SettingsReadOnlyNote,
	SettingsRow,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';
import { cn } from '@/core/lib/helpers';
import { currencyLabelOf } from '@/core/lib/utils/rates';
import {
	AUTOMATIC_FORMAT,
	DATE_FORMAT_CHOICES,
	NUMBER_FORMAT_CHOICES,
	dateFormatChoiceOf,
	dateFormatSampleOf,
	numberFormatChoiceOf,
	numberFormatSampleOf,
	type DateFormatChoice,
	type NumberFormatChoice
} from '@/core/lib/utils/settings-workspace';
import {
	workspaceDateFormatOf,
	workspaceNumberFormatOf,
	type WorkspaceDateFormat,
	type WorkspaceNumberFormat
} from '@/core/lib/utils/workspace-formats';
import type { TOrganization } from '@/core/types/schemas';

const CONTROL_WIDTH = 'w-full sm:w-56';

const VALUE_TEXT = 'text-[13px] text-foreground';

interface ChoiceOption {
	value: string;
	label: string;
}

type SaveChoice = (value: string) => Promise<void>;

function PendingMark({ isPending }: Readonly<{ isPending: boolean }>) {
	if (!isPending) {
		return null;
	}
	return <Spinner aria-hidden="true" className="size-3.5 shrink-0 animate-spin text-muted-foreground" />;
}

/**
 * A pick saves at once. Picking the value already shown saves nothing: Automatic may stand for a format another app
 * stored, which a save would erase.
 */
function usePickedSetting(stored: string, onSave: SaveChoice) {
	const { value, isPending, change } = useOptimisticSetting<string>(stored, onSave);

	const pick = (next: string) => {
		const isSameChoice = next === value;
		if (!next || isSameChoice) {
			return;
		}
		void change(next);
	};

	return { value, isPending, pick };
}

function CurrencyControl({ id, currency, onSave }: Readonly<{ id: string; currency: string; onSave: SaveChoice }>) {
	const { value, isPending, pick } = usePickedSetting(currency, onSave);

	return (
		<div className={cn('flex items-center gap-2', CONTROL_WIDTH)}>
			<PendingMark isPending={isPending} />
			<CurrencySelect id={id} value={value} onChange={pick} disabled={isPending} />
		</div>
	);
}

function CurrencyValue({ currency }: Readonly<{ currency: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	if (!currency) {
		return <span className="text-[13px] text-muted-foreground">{t('settings.workspace.CURRENCY_NOT_SET')}</span>;
	}
	return <span className={VALUE_TEXT}>{currencyLabelOf(currency, locale)}</span>;
}

function CurrencyRow({
	currency,
	canEdit,
	onSave
}: Readonly<{ currency: string; canEdit: boolean; onSave: SaveChoice }>) {
	const t = useTranslations();
	const selectId = useId();
	const label = t('settings.workspace.CURRENCY_LABEL');
	const description = t('settings.workspace.CURRENCY_DESCRIPTION');

	if (!canEdit) {
		return (
			<SettingsRow label={label} description={description}>
				<CurrencyValue currency={currency} />
			</SettingsRow>
		);
	}
	return (
		<SettingsRow label={label} description={description} htmlFor={selectId}>
			<CurrencyControl id={selectId} currency={currency} onSave={onSave} />
		</SettingsRow>
	);
}

function labelOfChoice(options: ReadonlyArray<ChoiceOption>, value: string): string {
	const option = options.find((candidate) => candidate.value === value);
	return option?.label ?? value;
}

interface ChoiceControlProps {
	id: string;
	value: string;
	options: ReadonlyArray<ChoiceOption>;
	onSave: SaveChoice;
}

function ChoiceControl({ id, value, options, onSave }: Readonly<ChoiceControlProps>) {
	const { value: shown, isPending, pick } = usePickedSetting(value, onSave);

	return (
		<div className={cn('flex items-center gap-2', CONTROL_WIDTH)}>
			<PendingMark isPending={isPending} />
			<Select value={shown} onValueChange={pick} disabled={isPending}>
				<SelectTrigger id={id} className="h-8 w-full text-[13px]">
					<SelectValue>{labelOfChoice(options, shown)}</SelectValue>
				</SelectTrigger>
				<SelectContent align="end">
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value} className="text-[13px]">
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

interface ChoiceRowProps {
	label: string;
	description: string;
	value: string;
	options: ReadonlyArray<ChoiceOption>;
	canEdit: boolean;
	onSave: SaveChoice;
}

function ChoiceRow({ label, description, value, options, canEdit, onSave }: Readonly<ChoiceRowProps>) {
	const selectId = useId();

	if (!canEdit) {
		return (
			<SettingsRow label={label} description={description}>
				<span className={cn(VALUE_TEXT, 'tabular-nums')}>{labelOfChoice(options, value)}</span>
			</SettingsRow>
		);
	}
	return (
		<SettingsRow label={label} description={description} htmlFor={selectId}>
			<ChoiceControl id={selectId} value={value} options={options} onSave={onSave} />
		</SettingsRow>
	);
}

function dateChoiceLabelOf(choice: DateFormatChoice, year: number, automaticLabel: string): string {
	if (choice === AUTOMATIC_FORMAT) {
		return automaticLabel;
	}
	return dateFormatSampleOf(choice, year);
}

function numberChoiceLabelOf(choice: NumberFormatChoice, automaticLabel: string): string {
	if (choice === AUTOMATIC_FORMAT) {
		return automaticLabel;
	}
	return numberFormatSampleOf(choice);
}

function useFormatOptions() {
	const t = useTranslations();
	return useMemo(() => {
		const automaticLabel = t('settings.workspace.FORMAT_AUTOMATIC');
		const year = new Date().getFullYear();
		const dateOptions: ChoiceOption[] = DATE_FORMAT_CHOICES.map((choice) => ({
			value: choice,
			label: dateChoiceLabelOf(choice, year, automaticLabel)
		}));
		const numberOptions: ChoiceOption[] = NUMBER_FORMAT_CHOICES.map((choice) => ({
			value: choice,
			label: numberChoiceLabelOf(choice, automaticLabel)
		}));
		return { dateOptions, numberOptions };
	}, [t]);
}

interface WorkspaceFormatsSectionProps {
	organization: TOrganization;
	canEdit: boolean;
	saveCurrency: (currency: string) => Promise<void>;
	saveDateFormat: (dateFormat: WorkspaceDateFormat | null) => Promise<void>;
	saveNumberFormat: (numberFormat: WorkspaceNumberFormat | null) => Promise<void>;
}

export function WorkspaceFormatsSection({
	organization,
	canEdit,
	saveCurrency,
	saveDateFormat,
	saveNumberFormat
}: Readonly<WorkspaceFormatsSectionProps>) {
	const t = useTranslations();
	const { dateOptions, numberOptions } = useFormatOptions();

	const saveDateChoice = useCallback(
		(choice: string) => saveDateFormat(workspaceDateFormatOf(choice)),
		[saveDateFormat]
	);
	const saveNumberChoice = useCallback(
		(choice: string) => saveNumberFormat(workspaceNumberFormatOf(choice)),
		[saveNumberFormat]
	);

	return (
		<SettingsSection
			id="formats"
			title={t('settings.workspace.FORMATS_SECTION')}
			description={t('settings.workspace.FORMATS_DESCRIPTION')}
		>
			<SettingsSurface>
				<CurrencyRow currency={organization.currency ?? ''} canEdit={canEdit} onSave={saveCurrency} />
				<ChoiceRow
					label={t('settings.workspace.DATE_FORMAT_LABEL')}
					description={t('settings.workspace.DATE_FORMAT_DESCRIPTION')}
					value={dateFormatChoiceOf(organization.dateFormat)}
					options={dateOptions}
					canEdit={canEdit}
					onSave={saveDateChoice}
				/>
				<ChoiceRow
					label={t('settings.workspace.NUMBER_FORMAT_LABEL')}
					description={t('settings.workspace.NUMBER_FORMAT_DESCRIPTION')}
					value={numberFormatChoiceOf(organization.numberFormat)}
					options={numberOptions}
					canEdit={canEdit}
					onSave={saveNumberChoice}
				/>
			</SettingsSurface>
			{!canEdit && <SettingsReadOnlyNote>{t('settings.workspace.READ_ONLY_NOTE')}</SettingsReadOnlyNote>}
		</SettingsSection>
	);
}
