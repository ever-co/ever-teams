'use client';

import { useTranslations, useFormatter } from 'next-intl';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Alert, ArrowLeft, Check, Link as LinkGlyph, Trash } from '@/core/components/icons';
import { Button } from '@/core/components/common/button';
import { Checkbox } from '@/core/components/common/checkbox';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { APP_NAME, DEFAULT_APP_PATH } from '@/core/constants/config/constants';
import {
	ACCOUNT_DELETION_CONFIRM_WORD,
	ACCOUNT_DELETION_PATH,
	type IAccountDeletionVerifyResponse
} from '@/core/lib/auth/account-deletion';
import { AccountDeletionRow } from './account-deletion-row';
import { useAccountDeletionConfirm } from '@/core/hooks/auth/use-account-deletion';
import { AuthHeading, AuthMark } from '@/core/components/auth/kit/auth-heading';
import { AuthField } from '@/core/components/auth/kit/auth-field';
import { AuthNotice } from '@/core/components/auth/kit/auth-notice';
import { AuthState } from '@/core/components/auth/kit/auth-state';
import { AUTH_HINT, AUTH_QUIET_LINK } from '@/core/components/auth/kit/auth-recipes';
import { cn } from '@/core/lib/helpers';

const REQUEST_NEW_LINK_CLASS = cn(AUTH_QUIET_LINK, 'self-center');

function expiryOf(details: IAccountDeletionVerifyResponse | null) {
	if (!details?.expiresAt) {
		return null;
	}
	const expiresAt = new Date(details.expiresAt);
	if (Number.isNaN(expiresAt.getTime())) {
		return null;
	}
	return expiresAt;
}

/** The one answer for an unusable link (invalid, used, replaced or expired: 410), with a way to ask for a new one. */
function InvalidLink() {
	const t = useTranslations();
	return (
		<div data-testid="delete-account-invalid">
			<AuthState
				tone="warning"
				glyph={<LinkGlyph aria-hidden="true" />}
				title={t('auth.deleteAccount.INVALID_TITLE')}
				description={t('pages.accountDeletion.INVALID_LINK')}
				actions={
					<Button asChild variant="outline" className="w-full max-sm:h-11">
						<Link href={ACCOUNT_DELETION_PATH}>{t('pages.accountDeletion.REQUEST_NEW_LINK')}</Link>
					</Button>
				}
			/>
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

	const typedWord = typed.trim().toUpperCase();
	const typedRightWord = typedWord === ACCOUNT_DELETION_CONFIRM_WORD;
	// Only a preview with its planHash can be confirmed: the deletion must be the one shown (the API requires it)
	const confirmed = understood && typedRightWord && !!details?.planHash;
	const expiresAt = expiryOf(details);
	const accounts = details?.accounts ?? [];

	return (
		<form
			className="flex flex-col"
			data-testid="delete-account-confirm"
			onSubmit={(e) => {
				e.preventDefault();
				if (confirmed && !deleting) onConfirm();
			}}
		>
			<AuthHeading
				mark={
					<AuthMark className="text-destructive-ink">
						<Trash />
					</AuthMark>
				}
				title={t('pages.accountDeletion.CONFIRM_TITLE')}
				description={t('pages.accountDeletion.CONFIRM_INTRO', {
					email: details?.email ?? '',
					appName: APP_NAME
				})}
				className="mb-6"
			/>

			{planChanged && (
				<div data-testid="delete-account-plan-changed" className="mb-4">
					<AuthNotice tone="warning" title={t('pages.accountDeletion.PLAN_CHANGED')} />
				</div>
			)}

			<ul className="flex flex-col gap-2">
				{accounts.map((account, index) => (
					<AccountDeletionRow key={`${account.workspace}-${index}`} account={account} />
				))}
			</ul>

			<div className="mt-3 flex flex-col gap-1">
				<p className={AUTH_HINT}>{t('pages.accountDeletion.WHAT_IS_KEPT')}</p>
				{expiresAt && (
					<p className={AUTH_HINT}>
						{t('pages.accountDeletion.LINK_EXPIRES', {
							time: format.dateTime(expiresAt, { hour: '2-digit', minute: '2-digit' })
						})}
					</p>
				)}
			</div>

			<div className="mt-6 flex flex-col gap-5">
				<label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-foreground select-none">
					<Checkbox
						checked={understood}
						onCheckedChange={(value) => setUnderstood(value === true)}
						className="mt-px"
						disabled={deleting}
						data-testid="delete-account-understood"
					/>
					<span>{t('pages.accountDeletion.CONFIRM_CHECKBOX')}</span>
				</label>

				<AuthField
					id="delete-account-word"
					name="confirm-word"
					label={t('pages.accountDeletion.TYPE_TO_CONFIRM', { word: ACCOUNT_DELETION_CONFIRM_WORD })}
					value={typed}
					onChange={(e) => setTyped(e.target.value)}
					autoComplete="off"
					autoCapitalize="characters"
					spellCheck={false}
					placeholder={ACCOUNT_DELETION_CONFIRM_WORD}
					inputClassName="font-mono tracking-wide"
					trailing={
						typedRightWord && (
							<Check aria-hidden="true" className="size-4 shrink-0 text-success-foreground" />
						)
					}
					disabled={deleting}
				/>

				{confirmFailed && (
					<div
						className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-destructive/[0.06] px-3 py-2.5"
						data-testid="delete-account-confirm-failed"
					>
						<p role="alert" className="flex items-start gap-2 text-[13px] text-destructive-ink">
							<Alert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
							<span>{t('pages.accountDeletion.CONFIRM_ERROR')}</span>
						</p>
						<Button
							type="button"
							variant="outline"
							size="default"
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
					className="w-full max-sm:h-11"
					data-testid="delete-account-submit"
				>
					{t('pages.accountDeletion.CONFIRM_BUTTON')}
				</Button>

				<Link href={DEFAULT_APP_PATH} className={cn(AUTH_QUIET_LINK, 'self-center')}>
					<ArrowLeft aria-hidden="true" />
					{t('pages.accountDeletion.KEEP_ACCOUNT')}
				</Link>
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

	let content: ReactNode = (
		<ConfirmForm
			key={details?.planHash ?? 'plan'}
			details={details}
			deleting={phase === 'deleting'}
			confirmFailed={confirmFailed}
			planChanged={planChanged}
			onConfirm={() => void confirm()}
		/>
	);

	if (phase === 'verifying') {
		content = (
			<div data-testid="delete-account-verifying">
				<AuthState tone="loading" title={t('pages.accountDeletion.CHECKING_LINK')} />
			</div>
		);
	}

	if (phase === 'invalid') {
		content = <InvalidLink />;
	}

	if (phase === 'error') {
		content = (
			<div data-testid="delete-account-error">
				<AuthState
					tone="error"
					title={t('pages.accountDeletion.GENERIC_ERROR')}
					actions={
						<>
							<Button type="button" variant="outline" onClick={retry} className="w-full max-sm:h-11">
								{t('pages.accountDeletion.TRY_AGAIN')}
							</Button>
							<Link href={ACCOUNT_DELETION_PATH} className={REQUEST_NEW_LINK_CLASS}>
								{t('pages.accountDeletion.REQUEST_NEW_LINK')}
							</Link>
						</>
					}
				/>
			</div>
		);
	}

	if (phase === 'deleted') {
		content = (
			<div data-testid="delete-account-deleted">
				<AuthState
					tone="success"
					glyph={<Check aria-hidden="true" />}
					title={t('pages.accountDeletion.DONE_TITLE')}
					description={t('pages.accountDeletion.DELETED_MESSAGE', {
						accounts: result?.accounts ?? 0,
						workspaces: result?.workspacesDeleted ?? 0
					})}
					actions={
						<Button asChild variant="outline" className="w-full max-sm:h-11">
							<Link href={DEFAULT_APP_PATH}>{t('pages.accountDeletion.BACK_TO_SIGN_IN')}</Link>
						</Button>
					}
				>
					{sessionCleared && <p className={AUTH_HINT}>{t('pages.accountDeletion.SIGNED_OUT')}</p>}
				</AuthState>
			</div>
		);
	}

	return (
		<AuthLayout
			// While the page holds a token, switching language (a new locale route) would remount it and lose the token
			hideLanguageSwitcher={phase !== 'deleted' && phase !== 'invalid'}
			// Added after the egress audit's UI baseline: no built-in Ever links
			operatorLinksOnly
		>
			{content}
		</AuthLayout>
	);
}
