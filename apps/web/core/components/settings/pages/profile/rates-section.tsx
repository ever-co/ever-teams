'use client';

import { type ReactNode, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	SETTINGS_SURFACE,
	SettingsRow,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { useEmployeePayRate, useOwnRatesMutation } from '@/core/hooks/organizations/rates/use-rates';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import {
	holdsEmployeeRatesPermission,
	holdsOwnRatesPermission,
	rateAmountTextOf,
	rateValueOf
} from '@/core/lib/utils/rates';
import type { IEmployeeRatesInput } from '@/core/types/schemas/organization/rates.schema';
import { MemberRateEditor, type RateEditorSubject } from '../members/member-rate-editor';
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

function sectionHintKeyOf(changesOwnRates: boolean) {
	if (changesOwnRates) {
		return 'rates.OWN_SECTION_EDIT_HINT' as const;
	}
	return 'rates.OWN_SECTION_HINT' as const;
}

/**
 * The employee's own rates. With CHANGE_OWN_RATES they change them here, the pay rate too when they also hold
 * ORG_EMPLOYEES_EDIT (the only route that takes it); without it they read them and ask the admins for a change.
 */
export function ProfileRatesSection({
	employee,
	name,
	imageUrl
}: Readonly<{ employee: OwnEmployeeRates; name: string; imageUrl: string | null }>) {
	const t = useTranslations();
	const locale = useLocale();
	const [isRequesting, setIsRequesting] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const { myPermissions } = useMyRolePermissionsQuery();
	const changesOwnRates = holdsOwnRatesPermission(myPermissions);
	const editsEmployees = holdsEmployeeRatesPermission(myPermissions);
	const editsPayRate = changesOwnRates && editsEmployees;
	const { saveOwnRates } = useOwnRatesMutation(editsEmployees);
	const employeeId = employee.id ?? null;
	const canEditOwnRates = changesOwnRates && Boolean(employeeId);

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

	const subject: RateEditorSubject = {
		id: employeeId ?? '',
		name,
		imageUrl,
		employeeId,
		canEditRate: canEditOwnRates,
		rate: { value: rateValueOf(employee.billRateValue), currency, weeklyLimit }
	};
	const saveRates = async (_rowId: string, rates: IEmployeeRatesInput) => {
		if (!employeeId) {
			return;
		}
		await saveOwnRates({ employeeId, rates });
	};
	const showsEditAction = canEditOwnRates && !isEditing;
	let editAction: ReactNode = null;
	if (showsEditAction) {
		editAction = (
			<Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
				{t('rates.EDIT_RATE')}
			</Button>
		);
	}

	return (
		<SettingsSection
			id="rate"
			title={t('rates.OWN_SECTION')}
			description={t(sectionHintKeyOf(changesOwnRates))}
			actions={editAction}
		>
			{isEditing && (
				<ul className={SETTINGS_SURFACE}>
					<MemberRateEditor
						row={subject}
						editsPayRate={editsPayRate}
						onCancel={() => setIsEditing(false)}
						onSaveRates={saveRates}
					/>
				</ul>
			)}
			{!isEditing && (
				<SettingsSurface>
					<SettingsRow label={t('rates.BILLING_RATE')}>
						<RateValueText text={rateText} emptyLabel={t('rates.NOT_SET')} />
					</SettingsRow>
					<OwnPayRateRow employeeId={employee.id} />
					<SettingsRow label={t('rates.WEEKLY_LIMIT')}>
						<RateValueText text={weeklyLimitText} emptyLabel={t('rates.NOT_SET')} />
					</SettingsRow>
					{!changesOwnRates && isRequesting && (
						<RateChangeRequestForm currentCurrency={currency} onClose={() => setIsRequesting(false)} />
					)}
					{!changesOwnRates && !isRequesting && (
						<SettingsRow label={t('rates.REQUEST_CHANGE')} description={t('rates.REQUEST_CHANGE_HINT')}>
							<Button type="button" variant="outline" size="sm" onClick={() => setIsRequesting(true)}>
								{t('rates.REQUEST_CHANGE_ACTION')}
							</Button>
						</SettingsRow>
					)}
				</SettingsSurface>
			)}
		</SettingsSection>
	);
}
