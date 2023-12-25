'use client';

import { getAccessTokenCookie } from '@app/helpers';
import { useAuthenticateUser, useModal, useQuery } from '@app/hooks';
import { resentVerifyUserLinkAPI, verifyUserEmailByCodeAPI } from '@app/services/client/api';
import { clsxm } from '@app/utils';
import { AuthCodeInputField, Button, Card, Modal, SpinnerLoader, Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

export function UnverifiedEmail() {
	const { user } = useAuthenticateUser();
	const t = useTranslations();
	const [verified, setVefified] = useState(true);

	const { loading: resendLinkLoading, queryCall: resendLinkQueryCall } = useQuery(resentVerifyUserLinkAPI);

	const { openModal, isOpen, closeModal } = useModal();

	useEffect(() => {
		const hasVerified = user ? user.isEmailVerified : true;

		if (hasVerified) {
			setVefified(true);
			return;
		}

		const closed = window.localStorage.getItem('unverified-message-closed') === getAccessTokenCookie();

		if (closed) {
			setVefified(true);
			return;
		}

		setVefified(false);
	}, [user]);

	return !verified ? (
		<>
			<Card
				shadow="bigger"
				className={clsxm(
					'w-full mt-6 flex justify-between',
					'border dark:border-[#28292F] dark:shadow-lg dark:bg-[#1B1D22]'
				)}
			>
				<Text>
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
							onClick={resendLinkQueryCall}
						>
							{t('common.HERE')}
						</button>
					)}
					{t('pages.home.SENT_EMAIL_VERIFICATION_RESEND')}
				</Text>

				{/* <button onClick={closeIt}>
					<CloseIcon />
				</button> */}
			</Card>
			<ConfirmUserModal open={isOpen} closeModal={closeModal} />
		</>
	) : (
		<></>
	);
}

export function ConfirmUserModal({ open, closeModal }: { open: boolean; closeModal: () => void }) {
	const { loading, queryCall } = useQuery(verifyUserEmailByCodeAPI);
	const { loading: resendLinkLoading, queryCall: resendLinkQueryCall } = useQuery(resentVerifyUserLinkAPI);

	const [code, setCode] = useState('');
	const t = useTranslations();

	const handleVerifyEmail = useCallback(
		(e: React.MouseEvent<HTMLFormElement, MouseEvent>) => {
			e.preventDefault();
			if (code.length < 6) return;

			queryCall(code).finally(() => {
				window.location.reload();
			});
		},
		[code, queryCall]
	);

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<form onSubmit={handleVerifyEmail} className="w-[98%] md:w-[530px]" autoComplete="off">
				<Card className="w-full" shadow="custom">
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
										onClick={resendLinkQueryCall}
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
				</Card>
			</form>
		</Modal>
	);
}
