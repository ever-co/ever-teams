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
	CLOCK_CHOICES,
	CURRENCY_POSITION_CHOICES,
	DATE_FORMAT_CHOICES,
	NUMBER_FORMAT_CHOICES,
	clockChoiceOf,
	clockSampleOf,
	currencyPositionChoiceOf,
	currencyPositionSampleOf,
	dateFormatChoiceOf,
	dateFormatSampleOf,
	numberFormatChoiceOf,
	numberFormatSampleOf,
	weekStartChoiceOf,
	weekStartChoicesOf,
	weekdayNameOf,
	type DateFormatChoice,
	type NumberFormatChoice
} from '@/core/lib/utils/settings-workspace';
import {
	workspaceClockOf,
	workspaceCurrencyPositionOf,
	workspaceDateFormatOf,
	workspaceNumberFormatOf,
	type WorkspaceClock,
	type WorkspaceCurrencyPosition,
	type WorkspaceDateFormat,
	type WorkspaceNumberFormat
} from '@/core/lib/utils/workspace-formats';
import { EWeekDays } from '@/core/types/generics/enums/date';
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

/** The week start, clock and currency symbol options, each labelled in the reader's language with a sample. */
function useCalendarAndMoneyOptions(organization: TOrganization) {
	const t = useTranslations();
	const locale = useLocale();
	const storedWeekStart = organization.startWeekOn;
	const currency = organization.currency ?? '';
	return useMemo(() => {
		const weekStartOptions: ChoiceOption[] = weekStartChoicesOf(storedWeekStart).map((day) => ({
			value: day,
			label: weekdayNameOf(day, locale)
		}));
		const clockOptions: ChoiceOption[] = CLOCK_CHOICES.map((clock) => ({
			value: String(clock),
			label: clockLabelOf(clock, clockSampleOf(clock, locale), t)
		}));
		const currencyPositionOptions: ChoiceOption[] = CURRENCY_POSITION_CHOICES.map((position) => ({
			value: position,
			label: currencyPositionLabelOf(position, currencyPositionSampleOf(position, currency, locale), t)
		}));
		return { weekStartOptions, clockOptions, currencyPositionOptions };
	}, [currency, locale, storedWeekStart, t]);
}

type Translate = ReturnType<typeof useTranslations>;

function clockLabelOf(clock: WorkspaceClock, sample: string, t: Translate): string {
	if (clock === 24) {
		return t('settings.workspace.CLOCK_24', { sample });
	}
	return t('settings.workspace.CLOCK_12', { sample });
}

function currencyPositionLabelOf(position: WorkspaceCurrencyPosition, sample: string, t: Translate): string {
	if (position === 'LEFT') {
		return t('settings.workspace.CURRENCY_POSITION_BEFORE', { sample });
	}
	return t('settings.workspace.CURRENCY_POSITION_AFTER', { sample });
}

function weekDayOf(choice: string): EWeekDays | null {
	const day = Object.values(EWeekDays).find((known) => known === choice);
	return day ?? null;
}

interface WorkspaceFormatsSectionProps {
	organization: TOrganization;
	canEdit: boolean;
	saveCurrency: (currency: string) => Promise<void>;
	saveDateFormat: (dateFormat: WorkspaceDateFormat | null) => Promise<void>;
	saveNumberFormat: (numberFormat: WorkspaceNumberFormat | null) => Promise<void>;
	saveWeekStart: (startWeekOn: EWeekDays) => Promise<void>;
	saveClock: (clock: WorkspaceClock) => Promise<void>;
	saveCurrencyPosition: (position: WorkspaceCurrencyPosition) => Promise<void>;
}

export function WorkspaceFormatsSection({
	organization,
	canEdit,
	saveCurrency,
	saveDateFormat,
	saveNumberFormat,
	saveWeekStart,
	saveClock,
	saveCurrencyPosition
}: Readonly<WorkspaceFormatsSectionProps>) {
	const t = useTranslations();
	const { dateOptions, numberOptions } = useFormatOptions();
	const { weekStartOptions, clockOptions, currencyPositionOptions } = useCalendarAndMoneyOptions(organization);

	const saveDateChoice = useCallback(
		(choice: string) => saveDateFormat(workspaceDateFormatOf(choice)),
		[saveDateFormat]
	);
	const saveNumberChoice = useCallback(
		(choice: string) => saveNumberFormat(workspaceNumberFormatOf(choice)),
		[saveNumberFormat]
	);
	const saveWeekStartChoice = useCallback(
		async (choice: string) => {
			const day = weekDayOf(choice);
			if (day === null) {
				return;
			}
			await saveWeekStart(day);
		},
		[saveWeekStart]
	);
	const saveClockChoice = useCallback(
		async (choice: string) => {
			const clock = workspaceClockOf(choice);
			if (clock === null) {
				return;
			}
			await saveClock(clock);
		},
		[saveClock]
	);
	const saveCurrencyPositionChoice = useCallback(
		async (choice: string) => {
			const position = workspaceCurrencyPositionOf(choice);
			if (position === null) {
				return;
			}
			await saveCurrencyPosition(position);
		},
		[saveCurrencyPosition]
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
				<ChoiceRow
					label={t('settings.workspace.WEEK_START_LABEL')}
					description={t('settings.workspace.WEEK_START_DESCRIPTION')}
					value={weekStartChoiceOf(organization.startWeekOn)}
					options={weekStartOptions}
					canEdit={canEdit}
					onSave={saveWeekStartChoice}
				/>
				<ChoiceRow
					label={t('settings.workspace.CLOCK_LABEL')}
					description={t('settings.workspace.CLOCK_DESCRIPTION')}
					value={String(clockChoiceOf(organization.timeFormat))}
					options={clockOptions}
					canEdit={canEdit}
					onSave={saveClockChoice}
				/>
				<ChoiceRow
					label={t('settings.workspace.CURRENCY_POSITION_LABEL')}
					description={t('settings.workspace.CURRENCY_POSITION_DESCRIPTION')}
					value={currencyPositionChoiceOf(organization.currencyPosition)}
					options={currencyPositionOptions}
					canEdit={canEdit}
					onSave={saveCurrencyPositionChoice}
				/>
			</SettingsSurface>
			{!canEdit && <SettingsReadOnlyNote>{t('settings.workspace.READ_ONLY_NOTE')}</SettingsReadOnlyNote>}
		</SettingsSection>
	);
}
