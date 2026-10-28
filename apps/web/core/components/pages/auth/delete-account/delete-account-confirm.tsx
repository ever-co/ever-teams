'use client';

import { useTranslations, useFormatter } from 'next-intl';
import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, CheckCircle2, LinkIcon } from 'lucide-react';
import { Button } from '@/core/components/common/button';
import { Checkbox } from '@/core/components/common/checkbox';
import { SpinnerLoader } from '@/core/components/common/loader';
import { Text } from '@/core/components/common/typography';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { InputField } from '@/core/components/duplicated-components/_input';
import { APP_NAME, DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import {
	ACCOUNT_DELETION_CONFIRM_WORD,
	ACCOUNT_DELETION_PATH,
	type IAccountDeletionVerifyResponse
} from '@/core/lib/auth/account-deletion';
import { AccountDeletionRow } from './account-deletion-row';
import { useAccountDeletionConfirm } from '@/core/hooks/auth/use-account-deletion';

const SECONDARY_LINK = 'inline-flex gap-2 items-center text-sm font-medium text-primary hover:underline';
const INPUT =
	'dark:bg-foreground/5 ring-foreground/10 placeholder:text-muted-foreground/75 flex h-9 w-full min-w-0 rounded-md border border-transparent bg-white px-3 py-1 text-base shadow-sm outline-none ring-1 transition-[color,box-shadow] md:text-sm focus-visible:border-foreground/35 focus-visible:ring-ring/25 dark:focus-visible:border-foreground/25 focus-visible:ring-[3px] font-mono tracking-widest';

/** The one answer for an unusable link (invalid, used, replaced or expired: 410), with a way to ask for a new one. */
function InvalidLink() {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-5 items-center py-4 text-center" data-testid="delete-account-invalid">
			<div className="flex justify-center items-center w-14 h-14 rounded-full bg-muted">
				<LinkIcon className="w-6 h-6 text-muted-foreground" />
			</div>
			<p className="max-w-sm text-sm text-muted-foreground" role="alert">
				{t('pages.accountDeletion.INVALID_LINK')}
			</p>
			<Link href={ACCOUNT_DELETION_PATH} className={SECONDARY_LINK}>
				{t('pages.accountDeletion.REQUEST_NEW_LINK')}
			</Link>
		</div>
	);
}

/**
 * The review + confirmation of a `verify` preview. Keyed by the preview's `planHash` by its parent, so a preview that
 * changed (409 on confirm) starts with the checkbox and the typed word cleared: it has to be confirmed again.
 */
function ConfirmForm({
	details,
	deleting,
	confirmFailed,
	planChanged,
	onConfirm
}: Readonly<{
	details: IAccountDeletionVerifyResponse | null;
	deleting: boolean;
	confirmFailed: boolean;
	planChanged: boolean;
	onConfirm: () => void;
}>) {
	const t = useTranslations();
	const format = useFormatter();
	const [understood, setUnderstood] = useState(false);
	const [typed, setTyped] = useState('');

	const confirmed = understood && typed.trim().toUpperCase() === ACCOUNT_DELETION_CONFIRM_WORD;
	const expiresAt = details?.expiresAt ? new Date(details.expiresAt) : null;

	return (
		<form
			className="space-y-5"
			data-testid="delete-account-confirm"
			onSubmit={(e) => {
				e.preventDefault();
				if (confirmed && !deleting) onConfirm();
			}}
		>
			{planChanged && (
				<p
					className="flex gap-1.5 items-start p-2.5 text-xs rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300"
					role="alert"
					data-testid="delete-account-plan-changed"
				>
					<AlertTriangle className="mt-px w-3.5 h-3.5 shrink-0" />
					<span>{t('pages.accountDeletion.PLAN_CHANGED')}</span>
				</p>
			)}

			<div className="space-y-1">
				<p className="text-sm text-muted-foreground">
					{t('pages.accountDeletion.CONFIRM_INTRO', { email: details?.email ?? '', appName: APP_NAME })}
				</p>
				{expiresAt && !Number.isNaN(expiresAt.getTime()) && (
					<p className="text-xs text-muted-foreground">
						{t('pages.accountDeletion.LINK_EXPIRES', {
							time: format.dateTime(expiresAt, { hour: '2-digit', minute: '2-digit' })
						})}
					</p>
				)}
			</div>

			<ul className="space-y-2">
				{details?.accounts.map((account, index) => (
					<AccountDeletionRow key={`${account.workspace}-${index}`} account={account} />
				))}
			</ul>

			<p className="text-xs text-muted-foreground">{t('pages.accountDeletion.WHAT_IS_KEPT')}</p>

			<div className="space-y-4">
				<label className="flex gap-2.5 items-start text-sm cursor-pointer select-none">
					<Checkbox
						checked={understood}
						onCheckedChange={(value) => setUnderstood(value === true)}
						className="mt-0.5"
						disabled={deleting}
						data-testid="delete-account-understood"
					/>
					<span>{t('pages.accountDeletion.CONFIRM_CHECKBOX')}</span>
				</label>

				<div className="space-y-2">
					<label className="block text-sm font-medium leading-none" htmlFor="delete-account-word">
						{t('pages.accountDeletion.TYPE_TO_CONFIRM', { word: ACCOUNT_DELETION_CONFIRM_WORD })}
					</label>
					<InputField
						id="delete-account-word"
						name="confirm-word"
						value={typed}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTyped(e.target.value)}
						autoComplete="off"
						autoCapitalize="characters"
						spellCheck={false}
						placeholder={ACCOUNT_DELETION_CONFIRM_WORD}
						noWrapper
						className={INPUT}
						disabled={deleting}
					/>
				</div>

				{confirmFailed && (
					<div
						className="flex flex-wrap gap-2 justify-between items-center p-2.5 rounded-md bg-destructive/5"
						data-testid="delete-account-confirm-failed"
					>
						<Text.Error className="text-xs" role="alert">
							{t('pages.accountDeletion.CONFIRM_ERROR')}
						</Text.Error>
						<Button
							type="button"
							variant="outline"
							className="px-3 py-1 h-8 text-xs"
							disabled={deleting || !confirmed}
							onClick={onConfirm}
						>
							{t('pages.accountDeletion.TRY_AGAIN')}
						</Button>
					</div>
				)}

				<Button
					type="submit"
					variant="danger"
					loading={deleting}
					disabled={!confirmed || deleting}
					className="w-full h-9 text-sm font-medium rounded-md"
					data-testid="delete-account-submit"
				>
					{t('pages.accountDeletion.CONFIRM_BUTTON')}
				</Button>

				<div className="text-center">
					<Link href={DEFAULT_APP_PATH} className={SECONDARY_LINK}>
						<ArrowLeft className="w-4 h-4" />
						{t('pages.accountDeletion.KEEP_ACCOUNT')}
					</Link>
				</div>
			</div>
		</form>
	);
}

/**
 * `/delete-account/confirm#token=…`: the page the e-mailed link opens. Public, no sign-in, no session created.
 * Shows what will be deleted (`verify`), asks for an explicit confirmation, then deletes (`confirm`).
 */
export default function DeleteAccountConfirm() {
	const t = useTranslations();
	const { phase, details, result, confirmFailed, planChanged, sessionCleared, confirm, retry } =
		useAccountDeletionConfirm();

	let content: React.ReactNode;
	if (phase === 'verifying') {
		content = (
			<div className="flex flex-col gap-3 items-center py-8" data-testid="delete-account-verifying">
				<SpinnerLoader size={28} />
				<p className="text-sm text-muted-foreground">{t('pages.accountDeletion.CHECKING_LINK')}</p>
			</div>
		);
	} else if (phase === 'invalid') {
		content = <InvalidLink />;
	} else if (phase === 'error') {
		content = (
			<div className="flex flex-col gap-4 items-center py-4 text-center" data-testid="delete-account-error">
				<p className="text-sm text-muted-foreground" role="alert">
					{t('pages.accountDeletion.GENERIC_ERROR')}
				</p>
				<Button type="button" variant="outline" className="h-9 text-sm" onClick={retry}>
					{t('pages.accountDeletion.TRY_AGAIN')}
				</Button>
				<Link href={ACCOUNT_DELETION_PATH} className={SECONDARY_LINK}>
					{t('pages.accountDeletion.REQUEST_NEW_LINK')}
				</Link>
			</div>
		);
	} else if (phase === 'deleted') {
		content = (
			<div className="flex flex-col gap-5 items-center py-4 text-center" data-testid="delete-account-deleted">
				<div className="flex justify-center items-center w-16 h-16 bg-green-100 rounded-full dark:bg-green-900/30">
					<CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
				</div>
				<div className="space-y-2">
					<output className="block max-w-sm text-sm text-muted-foreground">
						{t('pages.accountDeletion.DELETED_MESSAGE', {
							accounts: result?.accounts ?? 0,
							workspaces: result?.workspacesDeleted ?? 0
						})}
					</output>
					{sessionCleared && (
						<p className="max-w-sm text-sm text-muted-foreground">{t('pages.accountDeletion.SIGNED_OUT')}</p>
					)}
				</div>
				<Link href={DEFAULT_APP_PATH} className={SECONDARY_LINK}>
					<ArrowLeft className="w-4 h-4" />
					{t('pages.accountDeletion.BACK_TO_SIGN_IN')}
				</Link>
			</div>
		);
	} else {
		// ready | deleting
		content = (
			<ConfirmForm
				key={details?.planHash ?? 'plan'}
				details={details}
				deleting={phase === 'deleting'}
				confirmFailed={confirmFailed}
				planChanged={planChanged}
				onConfirm={() => void confirm()}
			/>
		);
	}

	return (
		<AuthLayout
			title={
				phase === 'deleted' ? t('pages.accountDeletion.DONE_TITLE') : t('pages.accountDeletion.CONFIRM_TITLE')
			}
			// While the page holds a token, switching language (a new locale route) would remount it and lose the token
			hideLanguageSwitcher={phase !== 'deleted' && phase !== 'invalid'}
		>
			<div className="overflow-x-hidden w-full overflow-y-clip p-1.5">{content}</div>
		</AuthLayout>
	);
}
