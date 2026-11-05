'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { SettingsRow, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { rateAmountTextOf, rateValueOf } from '@/core/lib/utils/rates';
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

/** The employee's own rate, read only: admins set it, and the employee asks them for a change. */
export function ProfileRatesSection({ employee }: Readonly<{ employee: OwnEmployeeRates }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [isRequesting, setIsRequesting] = useState(false);

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
		</SettingsSection>
	);
}
