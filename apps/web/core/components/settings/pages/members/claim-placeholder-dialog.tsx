'use client';

import { type FormEvent, useId, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { isEmail } from 'class-validator';
import { AppDialog, APP_DIALOG_BODY, AppDialogDescription, AppDialogHeader } from '@/core/components/common/app-dialog';
import { DialogFieldLabel } from '@/core/components/common/dialog-field-label';
import { Input } from '@/core/components/common/input';
import { toastMoment } from '@/core/components/common/toast-moment';
import { Button } from '@/core/components/duplicated-components/_button';
import { Send, Spinner } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { placeholderFailureOf, type PlaceholderFailure } from '@/core/lib/utils/member-placeholder';
import type { MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import { MemberAvatar, PersonLines } from './people-parts';

const EMAIL_MAX_LENGTH = 254;

/**
 * Invites a member without an account to claim their time: one email, prefilled with the one given at creation. When
 * the person accepts, their entries, teams and rates move to their own account.
 */
export function ClaimPlaceholderDialog({
	member,
	onClose,
	onSend
}: Readonly<{
	member: MemberRowModel | null;
	onClose: () => void;
	onSend: (employeeId: string, email: string) => Promise<void>;
}>) {
	const t = useTranslations();
	const emailId = useId();
	const [shown, setShown] = useState<MemberRowModel | null>(member);
	const [email, setEmail] = useState(member?.email ?? '');
	const [isInvalid, setIsInvalid] = useState(false);
	const [failure, setFailure] = useState<PlaceholderFailure | null>(null);
	const [isSending, setIsSending] = useState(false);

	// A new member opens the dialog with their own email; the last one stays on screen while it closes
	if (member && member !== shown) {
		setShown(member);
		setEmail(member.email);
		setIsInvalid(false);
		setFailure(null);
	}
	const name = shown?.name ?? '';

	const close = () => {
		if (isSending) {
			return;
		}
		onClose();
	};

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const address = email.trim();
		const employeeId = shown?.employeeId;
		if (!employeeId) {
			return;
		}
		if (!isEmail(address)) {
			setIsInvalid(true);
			return;
		}
		setIsSending(true);
		setFailure(null);
		try {
			await onSend(employeeId, address);
			toastMoment(t('settings.members.placeholder.CLAIM_SENT', { name, email: address.toLowerCase() }), <Send />);
			onClose();
		} catch (error) {
			setFailure(placeholderFailureOf(error, 'claim'));
		} finally {
			setIsSending(false);
		}
	};

	const failureText = failure && t(failure.key as DottedLanguageObjectStringPaths, failure.values);

	return (
		<AppDialog open={Boolean(member)} onClose={close} width="sm">
			<AppDialogHeader title={t('settings.members.placeholder.CLAIM_TITLE', { name })} onClose={close} />
			<div className={cn(APP_DIALOG_BODY, 'pb-5')}>
				<form onSubmit={submit} className="flex flex-col gap-4" autoComplete="off" noValidate>
					<AppDialogDescription className="-mt-1 text-[13px] text-pretty text-muted-foreground">
						{t('settings.members.placeholder.CLAIM_DESCRIPTION', { name })}
					</AppDialogDescription>
					{shown && (
						<div className="flex items-center gap-3 rounded-xl px-1">
							<MemberAvatar name={shown.name} imageUrl={shown.imageUrl} />
							<PersonLines name={shown.name} detail={t('settings.members.placeholder.NO_ACCOUNT')} />
						</div>
					)}
					<div className="flex flex-col gap-1">
						<DialogFieldLabel htmlFor={emailId} isRequired>
							{t('settings.members.placeholder.EMAIL')}
						</DialogFieldLabel>
						<Input
							id={emailId}
							type="email"
							value={email}
							onChange={(event) => {
								setEmail(event.target.value);
								setIsInvalid(false);
								setFailure(null);
							}}
							maxLength={EMAIL_MAX_LENGTH}
							placeholder="name@example.com"
							autoFocus
							aria-invalid={isInvalid || undefined}
						/>
						{isInvalid && (
							<p role="alert" className="text-xs text-destructive-ink">
								{t('settings.members.placeholder.EMAIL_INVALID')}
							</p>
						)}
						{failureText && (
							<p role="alert" className="text-xs text-pretty text-destructive-ink">
								{t('settings.members.placeholder.CLAIM_FAILED')} {failureText}
							</p>
						)}
					</div>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={close} disabled={isSending}>
							{t('common.CANCEL')}
						</Button>
						<Button type="submit" disabled={isSending}>
							{isSending && <Spinner aria-hidden="true" className="animate-spin" />}
							{!isSending && <Send aria-hidden="true" />}
							{t('settings.members.placeholder.CLAIM_CONFIRM')}
						</Button>
					</div>
				</form>
			</div>
		</AppDialog>
	);
}
