'use client';

import { useEffect, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AuthCodeInputField } from '@/core/components/auth/auth-code-input';
import { AUTH_CODE_CONTAINER_CLASS, AUTH_CODE_SLOT_CLASS } from '@/core/components/auth/auth-code-recipe';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { controlRecipe } from '@/core/components/common/input';
import { Spinner } from '@/core/components/common/spinner';
import { Button } from '@/core/components/duplicated-components/_button';
import { UsersGroup } from '@/core/components/icons';
import { FocusCard, FocusIconTile, FocusPanel } from '@/core/components/layouts/focus/focus-shell';
import { APP_NAME, AUTH_CODE_LENGTH } from '@/core/constants/config/constants';
import { useAuthenticationPasscode } from '@/core/hooks';
import { useAuthenticateUser } from '@/core/hooks/auth/use-authenticate-user';
import { useResendCooldown } from '@/core/hooks/auth/use-resend-cooldown';
import { cn } from '@/core/lib/helpers';

const LABEL = 'text-[13px] font-medium text-foreground';

const FIELD_ERROR = 'text-xs text-destructive-ink';

function initialsOf(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const letters = words.slice(0, 2).map((word) => word[0] ?? '');
	return letters.join('').toUpperCase();
}

function SignedInAccountSkeleton() {
	return (
		<FocusPanel className="flex items-center gap-3" isDecorative>
			<span className="size-8 shrink-0 animate-pulse rounded-full bg-foreground/[0.07]" />
			<span className="flex min-w-0 flex-1 flex-col gap-1.5">
				<span className="h-2.5 w-20 animate-pulse rounded-full bg-foreground/[0.06]" />
				<span className="h-3 w-32 animate-pulse rounded-full bg-foreground/[0.07]" />
			</span>
			<span className="h-7 w-16 animate-pulse rounded-full bg-foreground/[0.05]" />
		</FocusPanel>
	);
}

/** The account the code will be redeemed for, with the way out when it is not the right one. */
function SignedInAccount() {
	const t = useTranslations();
	const { user, userLoading, logOut } = useAuthenticateUser();
	const isUserPending = Boolean(userLoading) && !user;
	if (isUserPending) {
		return <SignedInAccountSkeleton />;
	}
	if (!user) {
		return null;
	}
	const name = user.name || user.email || '';
	return (
		<FocusPanel className="flex items-center gap-3">
			<Avatar className="size-8">
				<AvatarImage src={user.imageUrl ?? undefined} alt="" />
				<AvatarFallback>{initialsOf(name)}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="text-xs text-muted-foreground">{t('pages.joinTeam.SIGNED_IN_AS')}</span>
				<span className="truncate text-[13px] font-medium text-foreground">{name}</span>
			</div>
			<Button type="button" variant="outline" size="sm" onClick={() => void logOut()}>
				{t('pages.joinTeam.NOT_YOU')}
			</Button>
		</FocusPanel>
	);
}

/**
 * Joining a team with the code of an invitation, on a page of its own outside the workspace. The sequence is the
 * one of the Join team dialog (`JoinTeamModal`): the email and the code go through `useAuthenticationPasscode`, which
 * confirms the code (invitation codes included) and signs the user into the team's workspace.
 */
export function JoinTeamPage() {
	const t = useTranslations();
	const { user } = useAuthenticateUser();
	const {
		loading,
		formValues,
		setFormValues,
		errors,
		handleChange,
		handleSubmit,
		signInEmailLoading,
		sendAuthCodeHandler,
		inputCodeRef
	} = useAuthenticationPasscode();
	const resendCooldown = useResendCooldown();

	const userEmail = user?.email ?? '';
	const hasEmail = formValues.email.length > 0;

	useEffect(() => {
		if (hasEmail || !userEmail) {
			return;
		}
		setFormValues((values) => ({ ...values, email: userEmail }));
	}, [hasEmail, setFormValues, userEmail]);

	// Only a code that went out starts the wait; the hook already shows the error of a failed send
	const resendCode = () => sendAuthCodeHandler()?.then(resendCooldown.start, () => undefined);

	const emailError = errors['email'];
	const codeError = errors['code'];
	const isResendLocked = resendCooldown.locked;
	const showsResend = !signInEmailLoading;

	return (
		<>
			<form onSubmit={handleSubmit} autoComplete="off" className="w-full max-w-md" noValidate>
				<FocusCard
					mark={
						<FocusIconTile>
							<UsersGroup aria-hidden="true" />
						</FocusIconTile>
					}
					title={t('pages.joinTeam.TITLE')}
					description={t('pages.joinTeam.DESCRIPTION')}
					footer={
						<>
							<div className="flex min-h-7 items-center gap-1.5 text-xs text-muted-foreground">
								<span>{t('pages.joinTeam.NO_CODE')}</span>
								{showsResend && (
									<button
										type="button"
										onClick={resendCode}
										disabled={isResendLocked}
										className="rounded-sm font-medium text-primary-ink outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
									>
										{isResendLocked &&
											t('pages.joinTeam.SEND_AGAIN_IN', { countdown: resendCooldown.countdown })}
										{!isResendLocked && t('pages.joinTeam.SEND_AGAIN')}
									</button>
								)}
								{signInEmailLoading && <Spinner className="size-3.5" />}
							</div>
							<Button type="submit" size="lg" disabled={loading} className="min-w-28">
								{loading && <Spinner className="size-4" />}
								{t('pages.joinTeam.SUBMIT')}
							</Button>
						</>
					}
				>
					<SignedInAccount />

					<label className="flex flex-col gap-2">
						<span className={LABEL}>{t('pages.joinTeam.EMAIL_LABEL')}</span>
						<input
							type="email"
							name="email"
							value={formValues.email}
							onChange={(event: ChangeEvent<HTMLInputElement>) => handleChange(event)}
							placeholder={t('form.EMAIL_PLACEHOLDER')}
							aria-invalid={Boolean(emailError)}
							className={cn(controlRecipe, 'h-9 px-2.5')}
							required
						/>
						{emailError && <span className={FIELD_ERROR}>{emailError}</span>}
					</label>

					<div className="flex flex-col gap-2">
						<span className={LABEL} id="join-team-code-label">
							{t('pages.joinTeam.CODE_LABEL')}
						</span>
						<fieldset aria-labelledby="join-team-code-label" className="min-w-0">
							<AuthCodeInputField
								allowedCharacters="alphanumeric"
								length={AUTH_CODE_LENGTH}
								ref={inputCodeRef}
								autoFocus={false}
								containerClassName={AUTH_CODE_CONTAINER_CLASS}
								inputClassName={AUTH_CODE_SLOT_CLASS}
								defaultValue={formValues.code}
								onChange={(code) => {
									setFormValues((values) => ({ ...values, code }));
								}}
							/>
						</fieldset>
						{codeError && <span className={FIELD_ERROR}>{codeError}</span>}
					</div>
				</FocusCard>
			</form>
			<Link
				href="/"
				className="rounded-sm text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				{t('pages.joinTeam.BACK', { appName: APP_NAME })}
			</Link>
		</>
	);
}
