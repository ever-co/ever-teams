'use client';

import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Badge } from '@/core/components/common/badge';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Key, ShieldCheck } from '@/core/components/icons';
import {
	SettingsPage,
	SettingsRow,
	SettingsRowSkeleton,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { useTwoFactorSettings } from '@/core/hooks/auth/use-two-factor-settings';
import type { ITwoFactorEnrollment, ITwoFactorProof, ITwoFactorStatus } from '@/core/types/interfaces/auth/two-factor';
import { ProofForm, RecoveryCodesPanel, SetupPanel, writeFailureMessageOf } from './two-factor-parts';

type Settings = ReturnType<typeof useTwoFactorSettings>;

/** What the section shows besides the rows: a setup, a proof asked for a change, or recovery codes shown once. */
type Panel =
	| { kind: 'none' }
	| { kind: 'setup'; enrollment: ITwoFactorEnrollment }
	| { kind: 'disable' }
	| { kind: 'regenerate' }
	| { kind: 'codes'; codes: string[] };

const NO_PANEL: Panel = { kind: 'none' };

function OffRow({
	status,
	starting,
	onTurnOn
}: Readonly<{ status: ITwoFactorStatus; starting: boolean; onTurnOn: () => void }>) {
	const t = useTranslations();
	return (
		<SettingsRow
			leading={<ShieldCheck />}
			label={t('settings.security.APP_LABEL')}
			description={t('settings.security.OFF_DESCRIPTION')}
		>
			<Badge variant="secondary">{t('settings.security.OFF')}</Badge>
			{status.available && (
				<Button type="button" size="sm" onClick={onTurnOn} disabled={starting}>
					{t('settings.security.TURN_ON')}
				</Button>
			)}
		</SettingsRow>
	);
}

function OnRows({
	status,
	panel,
	onTurnOff,
	onNewCodes
}: Readonly<{ status: ITwoFactorStatus; panel: Panel; onTurnOff: () => void; onNewCodes: () => void }>) {
	const t = useTranslations();
	const format = useFormatter();
	let since = t('settings.security.ON_DESCRIPTION');
	if (status.enabledAt) {
		since = t('settings.security.ON_SINCE', {
			date: format.dateTime(new Date(status.enabledAt), { dateStyle: 'medium' })
		});
	}
	const isChanging = panel.kind !== 'none';

	return (
		<>
			<SettingsRow leading={<ShieldCheck />} label={t('settings.security.APP_LABEL')} description={since}>
				<Badge variant="success">{t('settings.security.ON')}</Badge>
				<Button type="button" size="sm" variant="outline" onClick={onTurnOff} disabled={isChanging}>
					{t('settings.security.TURN_OFF')}
				</Button>
			</SettingsRow>
			<SettingsRow
				leading={<Key />}
				label={t('settings.security.CODES_LABEL')}
				description={t('settings.security.CODES_LEFT', { count: status.recoveryCodesLeft })}
			>
				<Button type="button" size="sm" variant="outline" onClick={onNewCodes} disabled={isChanging}>
					{t('settings.security.NEW_CODES')}
				</Button>
			</SettingsRow>
		</>
	);
}

function TwoFactorSection({ settings }: Readonly<{ settings: Settings }>) {
	const t = useTranslations();
	const { status, availability, retry, enroll, confirm, disable, regenerate } = settings;
	const [panel, setPanel] = useState<Panel>(NO_PANEL);
	const [error, setError] = useState<string | null>(null);

	const closePanel = () => {
		setPanel(NO_PANEL);
		setError(null);
	};

	const startSetup = async () => {
		setError(null);
		try {
			const enrollment = await enroll.mutateAsync();
			setPanel({ kind: 'setup', enrollment });
		} catch (failure) {
			toast.error(t('settings.security.SETUP_FAILED'), { description: writeFailureMessageOf(t, failure) });
		}
	};

	const confirmSetup = async (code: string) => {
		setError(null);
		try {
			const { recoveryCodes } = await confirm.mutateAsync(code);
			setPanel({ kind: 'codes', codes: recoveryCodes });
			toast.success(t('settings.security.TURNED_ON'));
		} catch (failure) {
			setError(writeFailureMessageOf(t, failure));
		}
	};

	const turnOff = async (proof: ITwoFactorProof) => {
		setError(null);
		try {
			await disable.mutateAsync(proof);
			closePanel();
			toast.success(t('settings.security.TURNED_OFF'));
		} catch (failure) {
			setError(writeFailureMessageOf(t, failure));
		}
	};

	const replaceCodes = async (proof: ITwoFactorProof) => {
		setError(null);
		try {
			const { recoveryCodes } = await regenerate.mutateAsync(proof);
			setPanel({ kind: 'codes', codes: recoveryCodes });
		} catch (failure) {
			setError(writeFailureMessageOf(t, failure));
		}
	};

	if (availability === 'loading') {
		return (
			<SettingsSurface>
				<SettingsRowSkeleton leading withDescription control="button" />
				<SettingsRowSkeleton leading withDescription control="button" />
			</SettingsSurface>
		);
	}
	if (availability === 'unsupported') {
		return (
			<Notice
				tone="info"
				title={t('settings.security.UNSUPPORTED_TITLE')}
				description={t('settings.security.UNSUPPORTED_DESCRIPTION')}
			/>
		);
	}
	if (availability === 'error' || !status) {
		return (
			<Notice
				tone="error"
				title={t('settings.security.READ_FAILED')}
				actions={
					<Button type="button" size="sm" variant="outline" onClick={() => void retry()}>
						{t('settings.security.RETRY')}
					</Button>
				}
			/>
		);
	}

	const showsRequired = status.requiredByOrganization && !status.enabled;
	const showsUnavailable = !status.available && !status.enabled;

	return (
		<div className="flex flex-col gap-3">
			{showsRequired && (
				<Notice
					tone="warning"
					title={t('settings.security.REQUIRED_TITLE')}
					description={t('settings.security.REQUIRED_DESCRIPTION')}
				/>
			)}
			{showsUnavailable && (
				<Notice
					tone="info"
					title={t('settings.security.UNAVAILABLE_TITLE')}
					description={t('settings.security.UNAVAILABLE_DESCRIPTION')}
				/>
			)}
			<SettingsSurface>
				{status.enabled ? (
					<OnRows
						status={status}
						panel={panel}
						onTurnOff={() => setPanel({ kind: 'disable' })}
						onNewCodes={() => setPanel({ kind: 'regenerate' })}
					/>
				) : (
					panel.kind !== 'setup' &&
					panel.kind !== 'codes' && (
						<OffRow status={status} starting={enroll.isPending} onTurnOn={() => void startSetup()} />
					)
				)}
				{panel.kind === 'setup' && (
					<SetupPanel
						enrollment={panel.enrollment}
						confirming={confirm.isPending}
						error={error}
						onConfirm={(code) => void confirmSetup(code)}
						onCancel={closePanel}
					/>
				)}
				{panel.kind === 'disable' && (
					<ProofForm
						label={t('settings.security.TURN_OFF_PROOF')}
						confirmLabel={t('settings.security.TURN_OFF')}
						destructive
						busy={disable.isPending}
						error={error}
						onConfirm={(proof) => void turnOff(proof)}
						onCancel={closePanel}
					/>
				)}
				{panel.kind === 'regenerate' && (
					<ProofForm
						label={t('settings.security.NEW_CODES_PROOF')}
						confirmLabel={t('settings.security.NEW_CODES')}
						busy={regenerate.isPending}
						error={error}
						onConfirm={(proof) => void replaceCodes(proof)}
						onCancel={closePanel}
					/>
				)}
				{panel.kind === 'codes' && <RecoveryCodesPanel codes={panel.codes} onDone={closePanel} />}
			</SettingsSurface>
		</div>
	);
}

/**
 * Settings > Security: two-factor authentication with an authenticator app, off until the person turns it on. A
 * server without it says so; nothing else changes for anyone who leaves it off.
 */
export function SecuritySettingsPage() {
	const t = useTranslations();
	const settings = useTwoFactorSettings();

	return (
		<SettingsPage
			title={t('settings.entries.security.TITLE')}
			description={t('settings.entries.security.DESCRIPTION')}
		>
			<SettingsSection
				id="two-factor"
				title={t('settings.security.SECTION_TITLE')}
				description={t('settings.security.SECTION_DESCRIPTION')}
			>
				<TwoFactorSection settings={settings} />
			</SettingsSection>
		</SettingsPage>
	);
}
