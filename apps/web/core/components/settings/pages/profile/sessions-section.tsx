'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { type DottedLanguageObjectStringPaths, useFormatter, useNow, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { Desktop, Globe, Smartphone, Spinner } from '@/core/components/icons';
import {
	SettingsReadOnlyNote,
	SettingsRow,
	SettingsRowSkeleton,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { useUserSessions } from '@/core/hooks/settings/use-user-sessions';
import {
	deviceKindOf,
	deviceOf,
	type IUserSession,
	type TSessionDeviceKind,
	USER_SESSION_REFUSAL
} from '@/core/lib/auth/user-sessions';
import { errorReasonKeyOf, gauzyErrorCodeOf } from '@/core/lib/utils/error-feedback';
import { SignOutOthersDialog } from './sign-out-others-dialog';

type Translate = ReturnType<typeof useTranslations>;

/** "Last active" is read again every minute while the page stays open. */
const NOW_UPDATE_INTERVAL_MS = 60_000;

const PLACEHOLDER_ROWS = 2;

function appNameOf(app: 'DESKTOP' | 'MOBILE', os: string | null, t: Translate): string {
	if (app === 'DESKTOP') {
		if (!os) {
			return t('settings.sessions.DEVICE_DESKTOP_APP');
		}
		return t('settings.sessions.DEVICE_DESKTOP_APP_ON', { os });
	}
	if (!os) {
		return t('settings.sessions.DEVICE_MOBILE_APP');
	}
	return t('settings.sessions.DEVICE_MOBILE_APP_ON', { os });
}

function deviceNameOf(session: IUserSession, t: Translate): string {
	const device = deviceOf(session);
	if (device.kind === 'browser') {
		if (!device.os) {
			return device.browser;
		}
		return t('settings.sessions.DEVICE_BROWSER_ON', { browser: device.browser, os: device.os });
	}
	if (device.kind === 'app') {
		return appNameOf(device.app, device.os, t);
	}
	return t('settings.sessions.UNKNOWN_DEVICE');
}

function DeviceIcon({ kind }: Readonly<{ kind: TSessionDeviceKind }>) {
	let icon = <Globe />;
	if (kind === 'phone') {
		icon = <Smartphone />;
	}
	if (kind === 'computer') {
		icon = <Desktop />;
	}
	return (
		<span
			aria-hidden="true"
			className="flex size-8 items-center justify-center rounded-lg bg-foreground/[0.04] hairline-ring ring-border [&_svg]:size-4"
		>
			{icon}
		</span>
	);
}

function signOutFailureOf(failure: unknown, t: Translate): string {
	if (gauzyErrorCodeOf(failure) === USER_SESSION_REFUSAL.UNNAMED) {
		return t('settings.sessions.SIGN_OUT_UNNAMED');
	}
	return t(errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths);
}

type SessionRowProps = {
	session: IUserSession;
	isSigningOut: boolean;
	isBusy: boolean;
	onSignOut: (session: IUserSession) => void;
};

function SessionRow({ session, isSigningOut, isBusy, onSignOut }: Readonly<SessionRowProps>) {
	const t = useTranslations();
	const format = useFormatter();
	const now = useNow({ updateInterval: NOW_UPDATE_INTERVAL_MS });
	const name = deviceNameOf(session, t);
	const signedIn = t('settings.sessions.SIGNED_IN', {
		date: format.dateTime(new Date(session.signedInAt), { dateStyle: 'medium' })
	});
	const lastActive = t('settings.sessions.LAST_ACTIVE', {
		time: format.relativeTime(new Date(session.lastActiveAt), now)
	});

	return (
		<SettingsRow
			leading={<DeviceIcon kind={deviceKindOf(session)} />}
			label={
				<span className="flex flex-wrap items-center gap-2">
					{name}
					{session.current && (
						<span className="rounded-full bg-primary/10 px-2 py-px text-[11px] font-medium text-primary">
							{t('settings.sessions.THIS_DEVICE')}
						</span>
					)}
				</span>
			}
			description={
				<span className="flex flex-wrap gap-x-2">
					<span>{signedIn}</span>
					{!session.current && <span>{lastActive}</span>}
				</span>
			}
		>
			{!session.current && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={isBusy}
					aria-label={`${t('settings.sessions.SIGN_OUT_SESSION')}: ${name}`}
					onClick={() => onSignOut(session)}
				>
					{isSigningOut && <Spinner className="size-3.5 animate-spin" />}
					{t('settings.sessions.SIGN_OUT_SESSION')}
				</Button>
			)}
		</SettingsRow>
	);
}

function SessionsPlaceholder() {
	const t = useTranslations();
	return (
		<div aria-busy="true" aria-label={t('settings.sessions.TITLE')}>
			<SettingsSurface>
				{Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
					<SettingsRowSkeleton key={index} leading control="button" labelWidth="w-36" />
				))}
			</SettingsSurface>
		</div>
	);
}

/**
 * Settings > Profile > Sessions: where the account is signed in, this browser first. Each other session signs out on
 * its own; all of them at once once the person confirms with their password, or the e-mailed code for an account
 * without one. Against an API without sessions (a Gauzy before ever-co/ever-gauzy#11943) nothing is shown.
 */
export function SessionsSection() {
	const t = useTranslations();
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	/** The count the dialog was opened with, kept while it plays its closing transition over a list read again. */
	const [dialogCount, setDialogCount] = useState(0);
	const {
		sessions,
		isLoading,
		isError,
		isUnavailable,
		retry,
		signOut,
		signingOutId,
		signOutOthers,
		sendCode,
		email
	} = useUserSessions();
	// Before the user is known nothing is asked, and nothing is shown
	const hasNothingToShow = !isLoading && !isError && sessions.length === 0;
	if (isUnavailable || hasNothingToShow) {
		return null;
	}
	const others = sessions.filter((session) => !session.current);
	const hasCurrent = sessions.some((session) => session.current);
	const isOnlyThisDevice = hasCurrent && others.length === 0;

	const openDialog = () => {
		setDialogCount(others.length);
		setIsDialogOpen(true);
	};

	const signOutOne = async (session: IUserSession) => {
		const name = deviceNameOf(session, t);
		try {
			await signOut(session.id);
			toast.success(t('settings.sessions.SIGNED_OUT_ONE', { device: name }));
		} catch (failure) {
			toast.error(t('settings.sessions.SIGN_OUT_FAILED'), { description: signOutFailureOf(failure, t) });
		}
	};

	let body = (
		<>
			<SettingsSurface>
				{sessions.map((session) => (
					<SessionRow
						key={session.id}
						session={session}
						isSigningOut={signingOutId === session.id}
						isBusy={signingOutId !== null}
						onSignOut={(picked) => void signOutOne(picked)}
					/>
				))}
				{others.length > 0 && (
					<SettingsRow
						label={t('settings.sessions.OTHER_SESSIONS', { count: others.length })}
						description={t('settings.sessions.OTHER_SESSIONS_HINT')}
					>
						<Button
							type="button"
							variant="outline"
							onClick={openDialog}
							className="text-destructive-ink hover:bg-destructive/[0.06]"
						>
							{t('settings.sessions.SIGN_OUT_OTHERS')}
						</Button>
					</SettingsRow>
				)}
			</SettingsSurface>
			{isOnlyThisDevice && <SettingsReadOnlyNote>{t('settings.sessions.ONLY_THIS_DEVICE')}</SettingsReadOnlyNote>}
		</>
	);
	if (isLoading) {
		body = <SessionsPlaceholder />;
	}
	if (isError) {
		body = (
			<SettingsSurface>
				<SettingsRow label={t('settings.sessions.LOAD_FAILED')}>
					<Button type="button" variant="outline" size="sm" onClick={retry}>
						{t('settings.sessions.RETRY')}
					</Button>
				</SettingsRow>
			</SettingsSurface>
		);
	}

	return (
		<SettingsSection
			id="sessions"
			title={t('settings.sessions.TITLE')}
			description={t('settings.sessions.DESCRIPTION')}
		>
			{body}
			<SignOutOthersDialog
				open={isDialogOpen}
				count={dialogCount}
				email={email}
				onClose={() => setIsDialogOpen(false)}
				onSignOut={signOutOthers}
				onSendCode={sendCode}
			/>
		</SettingsSection>
	);
}
