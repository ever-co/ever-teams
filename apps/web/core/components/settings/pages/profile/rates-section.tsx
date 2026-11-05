'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { SettingsRow, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { useEmployeePayRate } from '@/core/hooks/organizations/rates/use-rates';
import { rateAmountTextOf, rateValueOf } from '@/core/lib/utils/rates';
import { RateChangeRequestForm } from './rate-change-request-form';

interface OwnEmployeeRates {
	id?: string;
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

/** What the employee is paid, read only. A Gauzy without pay rates (404) or a refusal (403) shows nothing. */
function OwnPayRateRow({ employeeId }: Readonly<{ employeeId: string | undefined }>) {
	const t = useTranslations();
	const locale = useLocale();
	const payRate = useEmployeePayRate(employeeId, true);
	const payRateData = payRate.data;
	const hasPayRate = Boolean(payRateData);
	const failsToLoad = payRate.isError && !payRate.isUnavailable && !hasPayRate;
	if (failsToLoad) {
		return (
			<SettingsRow label={t('rates.PAY_RATE')} description={t('rates.OWN_PAY_RATE_HINT')}>
				<Button type="button" variant="outline" size="sm" onClick={() => void payRate.refetch()}>
					{t('notifications.RETRY')}
				</Button>
			</SettingsRow>
		);
	}
	if (!payRateData) {
		return null;
	}
	const amount = rateAmountTextOf(payRateData.payRateValue, payRateData.currency, locale);
	let text: string | null = null;
	if (amount !== null) {
		text = t('rates.PER_HOUR', { amount });
	}
	return (
		<SettingsRow label={t('rates.PAY_RATE')} description={t('rates.OWN_PAY_RATE_HINT')}>
			<RateValueText text={text} emptyLabel={t('rates.NOT_SET')} />
		</SettingsRow>
	);
}

/** The employee's own rates, read only: admins set them, and the employee asks them for a change. */
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
				<SettingsRow label={t('rates.BILLING_RATE')}>
					<RateValueText text={rateText} emptyLabel={t('rates.NOT_SET')} />
				</SettingsRow>
				<OwnPayRateRow employeeId={employee.id} />
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
