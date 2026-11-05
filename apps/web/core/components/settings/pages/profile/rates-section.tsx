'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	SETTINGS_SKELETON_BAR,
	SettingsRow,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { useMyProjectRates } from '@/core/hooks/organizations/rates/use-rates';
import { rateAmountTextOf, rateValueOf } from '@/core/lib/utils/rates';
import { cn } from '@/core/lib/helpers';
import type { TMyProjectRate } from '@/core/types/schemas/organization/rates.schema';
import { RateChangeRequestForm } from './rate-change-request-form';

interface OwnEmployeeRates {
	billRateValue?: unknown;
	billRateCurrency?: string | null;
	reWeeklyLimit?: unknown;
}

const VALUE_TEXT = 'text-[13px] tabular-nums text-foreground';
const EMPTY_TEXT = 'text-[13px] text-muted-foreground';

function RateValueText({ text, emptyLabel }: Readonly<{ text: string | null; emptyLabel: string }>) {
	if (text === null) {
		return <span className={EMPTY_TEXT}>{emptyLabel}</span>;
	}
	return <span className={VALUE_TEXT}>{text}</span>;
}

function ProjectRateRows({ rates }: Readonly<{ rates: TMyProjectRate[] }>) {
	const t = useTranslations();
	const locale = useLocale();
	return rates.map((rate) => {
		const amount = rateAmountTextOf(rate.billRateValue, rate.currency, locale);
		let text: string | null = null;
		if (amount !== null) {
			text = t('rates.PER_HOUR', { amount });
		}
		return (
			<SettingsRow key={rate.organizationProjectId} label={rate.projectName || t('rates.UNNAMED_PROJECT')}>
				<RateValueText text={text} emptyLabel={t('rates.NOT_SET')} />
			</SettingsRow>
		);
	});
}

/**
 * The employee's own rate, read only: admins set it, and the employee asks them for a change. Their effective rate
 * on each project is listed when Gauzy has the rates routes; before that the list is simply absent.
 */
export function ProfileRatesSection({ employee }: Readonly<{ employee: OwnEmployeeRates }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [isRequesting, setIsRequesting] = useState(false);
	const { data: projectRates, isLoading, isUnavailable } = useMyProjectRates(true);

	const currency = employee.billRateCurrency || null;
	const rateAmount = rateAmountTextOf(employee.billRateValue, currency, locale);
	let rateText: string | null = null;
	if (rateAmount !== null) {
		rateText = t('rates.PER_HOUR', { amount: rateAmount });
	}
	const weeklyLimit = rateValueOf(employee.reWeeklyLimit);
	let weeklyLimitText: string | null = null;
	if (weeklyLimit !== null) {
		weeklyLimitText = t('rates.WEEKLY_LIMIT_VALUE', { hours: weeklyLimit });
	}

	const listsProjectRates = !isUnavailable && Boolean(projectRates?.length);
	const loadsProjectRates = isLoading && !isUnavailable;

	return (
		<SettingsSection id="rate" title={t('rates.OWN_SECTION')} description={t('rates.OWN_SECTION_HINT')}>
			<SettingsSurface>
				<SettingsRow label={t('rates.HOURLY_RATE')}>
					<RateValueText text={rateText} emptyLabel={t('rates.NOT_SET')} />
				</SettingsRow>
				<SettingsRow label={t('rates.WEEKLY_LIMIT')}>
					<RateValueText text={weeklyLimitText} emptyLabel={t('rates.NOT_SET')} />
				</SettingsRow>
				{isRequesting && (
					<RateChangeRequestForm currentCurrency={currency} onClose={() => setIsRequesting(false)} />
				)}
				{!isRequesting && (
					<SettingsRow label={t('rates.REQUEST_CHANGE')} description={t('rates.REQUEST_CHANGE_HINT')}>
						<Button type="button" variant="outline" size="sm" onClick={() => setIsRequesting(true)}>
							{t('rates.REQUEST_CHANGE_ACTION')}
						</Button>
					</SettingsRow>
				)}
			</SettingsSurface>
			{loadsProjectRates && (
				<SettingsSurface>
					<SettingsRow
						label={<span aria-hidden="true" className={cn(SETTINGS_SKELETON_BAR, 'block h-3.5 w-32')} />}
					>
						<span aria-hidden="true" className={cn(SETTINGS_SKELETON_BAR, 'block h-3.5 w-16')} />
					</SettingsRow>
				</SettingsSurface>
			)}
			{listsProjectRates && (
				<div className="flex flex-col gap-2">
					<p className="px-1 text-xs text-muted-foreground">{t('rates.PROJECT_RATES_HINT')}</p>
					<SettingsSurface>
						<ProjectRateRows rates={projectRates ?? []} />
					</SettingsSurface>
				</div>
			)}
		</SettingsSection>
	);
}
