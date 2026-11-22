'use client';

import { getAccessTokenCookie } from '@/core/lib/helpers/index';
import { useAuthenticateUser, useModal, useQueryCall } from '@/core/hooks';
import { TUser } from '@/core/types/schemas';
import { Button, Modal, SpinnerLoader, Text } from '@/core/components';
import { useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { emailVerificationService } from '@/core/services/client/api/users/emails/email-verification.service';
import { AuthCodeInputField } from '../auth/auth-code-input';
import { AUTH_CODE_LENGTH } from '@/core/constants/config/constants';
import { Notice } from './notice';
import { Mail } from '@/core/components/icons';
import { Button as UiButton } from '@/core/components/duplicated-components/_button';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { errorReasonKeyOf, errorReasonOf } from '@/core/lib/utils/error-feedback';
import { toast } from 'sonner';
import { useEmailVerificationStatus } from '@/core/hooks/auth/use-email-verification-status';
import { asksForEmailVerification, wasVerificationEmailSent } from '@/core/lib/auth/email-verification';

interface UnverifiedEmailProps {
	user?: TUser | null; // Accept user as prop for conditional rendering optimization
}

/** Why no new code went out, with what to do about it. */
function resendFailureMessageOf(error: unknown, t: ReturnType<typeof useTranslations>): string {
	const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
	const reason = t(reasonKey);
	return t('settings.profile.VERIFY_SEND_FAILED', { reason });
}

/**
 * Sends the signed-in user a new verification code, and says on screen whether it went out. Once sent, the status is
 * read again, so the notice says a code was sent.
 */
function useResendVerificationCode(user: TUser | null | undefined) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { loading, queryCall } = useQueryCall(authService.resendVerifyUserLink);

	const resendCode = useCallback(() => {
		if (!user) {
			return;
		}
		const onSent = () => {
			toast.success(t('settings.profile.VERIFY_SENT', { email: user.email ?? '' }));
			const queryKey = queryKeys.users.emailVerificationStatus(user.id, user.lastOrganizationId, user.email);
			void queryClient.invalidateQueries({ queryKey });
		};
		const onFailed = (error: unknown) => {
			logErrorInDev('UnverifiedEmail: no new verification code was sent', error);
			toast.error(resendFailureMessageOf(error, t));
		};
		void queryCall(user).then(onSent, onFailed);
	}, [queryCall, queryClient, t, user]);

	return { isSending: loading, resendCode };
}

export function UnverifiedEmail({ user: propUser }: UnverifiedEmailProps = {}) {
	// Use prop user if provided, otherwise fallback to hook (for backward compatibility)
	const { user: hookUser } = useAuthenticateUser();
	const user = propUser !== undefined ? propUser : hookUser;
	const t = useTranslations();
	const [verified, setVerified] = useState(true);
	// Asked only once the API confirmed the deployment verifies addresses: where it verifies none, no code is ever sent
	const verificationState = useEmailVerificationStatus(user);
	const asksForCode = asksForEmailVerification(user, verificationState);
	const codeWasSent = wasVerificationEmailSent(verificationState);

	const { isSending, resendCode } = useResendVerificationCode(user);

	const { openModal, isOpen, closeModal } = useModal();

	useEffect(() => {
		if (!asksForCode) {
			setVerified(true);
			return;
		}

		const closed = window.localStorage.getItem('unverified-message-closed') === getAccessTokenCookie();

		if (closed) {
			setVerified(true);
			return;
		}

		setVerified(false);
	}, [asksForCode, user]);

	if (verified) {
		return null;
	}

	return (
		<>
			<Notice
				tone="info"
				glyph={<Mail />}
				className="my-3 w-full"
				title={t('notifications.NOTICES.VERIFY_TITLE')}
				description={<VerifyEmailLine email={user?.email} codeWasSent={codeWasSent} />}
				actions={
					<>
						<ResendCodeButton isSending={isSending} onResend={resendCode} />
						<UiButton type="button" variant="outline" size="sm" onClick={openModal}>
							{t('notifications.NOTICES.VERIFY_ACTION')}
						</UiButton>
					</>
				}
			/>
			<ConfirmUserModal open={isOpen} user={user} closeModal={closeModal} />
		</>
	);
}

/** Says a code was sent only when the API says a valid one went out; otherwise it offers to send one. */
function VerifyEmailLine({ email, codeWasSent }: Readonly<{ email?: string | null; codeWasSent: boolean }>) {
	const t = useTranslations();
	if (!codeWasSent) {
		return <SendCodeLine email={email} />;
	}
	if (!email) {
		return <>{t('notifications.NOTICES.VERIFY_TEXT_GENERIC')}</>;
	}

	return <>{t('notifications.NOTICES.VERIFY_TEXT', { email })}</>;
}

function SendCodeLine({ email }: Readonly<{ email?: string | null }>) {
	const t = useTranslations();
	if (!email) {
		return <>{t('notifications.NOTICES.VERIFY_TEXT_NOT_SENT_GENERIC')}</>;
	}

	return <>{t('notifications.NOTICES.VERIFY_TEXT_NOT_SENT', { email })}</>;
}

/** The recovery stays a quiet link beside the main action, with its own pending state. */
function ResendCodeButton({ isSending, onResend }: Readonly<{ isSending: boolean; onResend: () => void }>) {
	const t = useTranslations();
	if (isSending) {
		return (
			<output className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
				<SpinnerLoader size={12} />
				{t('notifications.NOTICES.VERIFY_SENDING')}
			</output>
		);
	}

	return (
		<button
			type="button"
			onClick={onResend}
			className="cursor-pointer rounded-sm text-xs font-medium text-muted-foreground underline decoration-foreground/25 underline-offset-2 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			{t('notifications.NOTICES.VERIFY_RESEND')}
		</button>
	);
}

/** Why a confirmation code was not taken: a refused code asks for another try, any other failure names its cause. */
function confirmationFailureMessageOf(error: unknown, t: ReturnType<typeof useTranslations>): string {
	const reason = errorReasonOf(error);
	const isRefusedCode = reason === 'invalid' || reason === 'notFound';
	if (isRefusedCode) {
		return t('pages.auth.INVALID_CODE_TRY_AGAIN');
	}
	const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
	return t(reasonKey);
}

export function ConfirmUserModal({
	open,
	user,
	closeModal
}: {
	open: boolean;
	user?: TUser | null;
	closeModal: () => void;
}) {
	const { loading, queryCall } = useQueryCall(emailVerificationService.verifyUserEmailByCode);
	const { isSending: resendLinkLoading, resendCode } = useResendVerificationCode(user);

	const [code, setCode] = useState('');
	const t = useTranslations();
	const router = useRouter();
	const queryClient = useQueryClient();

	const handleVerifyEmail = useCallback(
		(e: React.MouseEvent<HTMLFormElement, MouseEvent>) => {
			e.preventDefault();
			if (code.length < AUTH_CODE_LENGTH || !user) return;

			void queryCall({ code, email: user.email || '' })
				.then(() => queryClient.invalidateQueries({ queryKey: queryKeys.users.me }))
				// A refused code leaves the address unconfirmed: say so, and leave no unhandled rejection
				.catch((error: unknown) => {
					logErrorInDev('ConfirmUserModal: address confirmation failed', error);
					toast.error(confirmationFailureMessageOf(error, t));
				})
				.finally(() => {
					router.refresh();
				});
		},
		[code, queryCall, queryClient, router, t, user]
	);

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form onSubmit={handleVerifyEmail} className="w-[98%] md:w-[530px]" autoComplete="off">
				<div className="w-full">
					<div className="flex flex-col justify-between items-center">
						<Text.Heading as="h3" className="text-lg font-semibold text-center text-balance">
							{t('common.SECURITY_CODE')}
						</Text.Heading>

						<div className="mt-5 w-full">
							<AuthCodeInputField
								allowedCharacters="alphanumeric"
								length={AUTH_CODE_LENGTH}
								containerClassName="mt-[21px] w-full flex justify-between"
								inputClassName="w-[40px] xs:w-[50px]"
								onChange={(code) => {
									setCode(code);
								}}
							/>
						</div>

						<div className="flex justify-between items-center mt-6 w-full">
							<div className="flex flex-col items-start">
								<div className="text-xs text-muted-foreground">{t('pages.auth.UNRECEIVED_CODE')}</div>

								{resendLinkLoading && <SpinnerLoader size={22} className="self-center" />}

								{!resendLinkLoading && (
									<button
										type="button"
										className="text-xs text-muted-foreground"
										onClick={resendCode}
									>
										{'Re'}
										<span className="font-medium text-primary-ink">
											{t('pages.auth.SEND_CODE')}
										</span>
									</button>
								)}
							</div>

							<Button
								disabled={code.length < AUTH_CODE_LENGTH || loading}
								type="submit"
								loading={loading}
							>
								{t('common.CONFIRM')}
							</Button>
						</div>
					</div>
				</div>
			</form>
		</Modal>
	);
}
