'use client';

import { getAccessTokenCookie } from '@/core/lib/helpers/index';
import { useAuthenticateUser, useModal, useQueryCall } from '@/core/hooks';
import { TUser } from '@/core/types/schemas';
import { clsxm } from '@/core/lib/utils';
import { Button, Modal, SpinnerLoader, Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { authService } from '@/core/services/client/api/auth/auth.service';
import { emailVerificationService } from '@/core/services/client/api/users/emails/email-verification.service';
import { AuthCodeInputField } from '../auth/auth-code-input';
import { EverCard } from '../common/ever-card';

export function UnverifiedEmail() {
	const { user } = useAuthenticateUser();
	const t = useTranslations();
	const [verified, setVerified] = useState(true);

	const { loading: resendLinkLoading, queryCall: resendLinkQueryCall } = useQueryCall(
		authService.resendVerifyUserLink
	);

	const { openModal, isOpen, closeModal } = useModal();

	useEffect(() => {
		const hasVerified = user ? user.isEmailVerified : true;

		if (hasVerified) {
			setVerified(true);
			return;
		}

		const closed = window.localStorage.getItem('unverified-message-closed') === getAccessTokenCookie();

		if (closed) {
			setVerified(true);
			return;
		}

		setVerified(false);
	}, [user]);

	return !verified ? (
		<>
			<EverCard
				shadow="bigger"
				className={clsxm(
					'w-full mt-4 py-3 px-2 flex justify-between',
					'border dark:border-[#28292F] dark:shadow-lg dark:bg-[#1B1D22] my-3'
				)}
			>
				<Text className="flex items-center gap-1">
					{t('pages.home.SENT_EMAIL_VERIFICATION_YOU_NEED_TO')}
					<span className="cursor-pointer text-primary dark:text-primary-light" onClick={openModal}>
						{t('common.VERIFY')}
					</span>
					{t('pages.home.SENT_EMAIL_VERIFICATION_YOUR_EMAIL_ADDRESS')}

					{resendLinkLoading && <SpinnerLoader size={18} className="self-center" />}

					{!resendLinkLoading && (
						<button
							type="button"
							className="cursor-pointer text-primary dark:text-primary-light"
							onClick={() => user && resendLinkQueryCall(user as TUser)}
						>
							{t('common.HERE')}
						</button>
					)}
					{t('pages.home.SENT_EMAIL_VERIFICATION_RESEND')}
				</Text>

				{/* <button onClick={closeIt}>
					<CloseIcon />
				</button> */}
			</EverCard>
			<ConfirmUserModal open={isOpen} user={user} closeModal={closeModal} />
		</>
	) : (
		<></>
	);
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
	const { loading: resendLinkLoading, queryCall: resendLinkQueryCall } = useQueryCall(
		authService.resendVerifyUserLink
	);

	const [code, setCode] = useState('');
	const t = useTranslations();

	const handleVerifyEmail = useCallback(
		(e: React.MouseEvent<HTMLFormElement, MouseEvent>) => {
			e.preventDefault();
			if (code.length < 6 || !user) return;

			queryCall(code, user.email || '').finally(() => {
				window.location.reload();
			});
		},
		[code, queryCall, user]
	);

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form onSubmit={handleVerifyEmail} className="w-[98%] md:w-[530px]" autoComplete="off">
				<EverCard className="w-full" shadow="custom">
					<div className="flex flex-col items-center justify-between">
						<Text.Heading as="h3" className="text-center">
							{t('common.SECURITY_CODE')}
						</Text.Heading>

						<div className="w-full mt-5">
							<AuthCodeInputField
								allowedCharacters="alphanumeric"
								length={6}
								containerClassName="mt-[21px] w-full flex justify-between"
								inputClassName="w-[40px] xs:w-[50px]"
								onChange={(code) => {
									setCode(code);
								}}
							/>
						</div>

						<div className="flex items-center justify-between w-full mt-6">
							<div className="flex flex-col items-start">
								<div className="text-xs font-normal text-gray-500 dark:text-gray-400">
									{"Didn't recieve code ?"}
								</div>

								{resendLinkLoading && <SpinnerLoader size={22} className="self-center" />}

								{!resendLinkLoading && (
									<button
										type="button"
										className="text-xs font-normal text-gray-500 dark:text-gray-400"
										onClick={() => user && resendLinkQueryCall(user)}
									>
										{'Re'}
										<span className="text-primary dark:text-primary-light">
											{t('pages.auth.SEND_CODE')}
										</span>
									</button>
								)}
							</div>

							<Button disabled={code.length < 6 || loading} type="submit" loading={loading}>
								{t('common.CONFIRM')}
							</Button>
						</div>
					</div>
				</EverCard>
			</form>
		</Modal>
	);
}
