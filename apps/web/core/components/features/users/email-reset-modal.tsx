import { useAuthenticateUser, useEmailReset } from '@/core/hooks';
import { Button, Modal, Text } from '@/core/components';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { AuthCodeInputField } from '../../auth/auth-code-input';
import { EverCard } from '../../common/ever-card';
import { InputField } from '../../duplicated-components/_input';

export type ISteps = 'EMAIL' | 'CODE_VERIFICATION';

/**
 * Email Reset modal
 */
export function EmailResetModal({ open, closeModal, email }: { open: boolean; closeModal: () => void; email: string }) {
	const t = useTranslations();
	const { register, setValue, getValues } = useForm();
	const [code, setCode] = useState('');
	const [step, setStep] = useState<ISteps>('EMAIL');
	const [message, setMessage] = useState<string>('');

	useEffect(() => {
		setValue('email', email);
	}, [email, setValue]);

	const { updateUserFromAPI } = useAuthenticateUser();

	const {
		emailResetRequestLoading,
		emailResetRequestQueryCall,
		verifyChangeEmailRequestLoading,
		verifyChangeEmailRequestQueryCall
	} = useEmailReset();

	const onCloseModal = useCallback(() => {
		setMessage('');
		setStep('EMAIL');
		closeModal();
	}, [setMessage, setStep, closeModal]);
	const handleContinue = useCallback(() => {
		const newEmail = getValues().email;
		emailResetRequestQueryCall(newEmail).then(() => {
			setMessage(t('pages.home.SENT_EMAIL_VERIFICATION'));
			setStep('CODE_VERIFICATION');
		});
	}, [emailResetRequestQueryCall, getValues, t]);
	const handleConfirm = useCallback(() => {
		verifyChangeEmailRequestQueryCall(code).then(() => {
			updateUserFromAPI();
			onCloseModal();
		});
	}, [code, verifyChangeEmailRequestQueryCall, updateUserFromAPI, onCloseModal]);

	return (
		<Modal isOpen={open} closeModal={onCloseModal}>
			<form className="w-[98%] md:w-[480px]" autoComplete="off" onSubmit={handleConfirm}>
				{step === 'EMAIL' && (
					<EverCard className="w-full" shadow="custom">
						<div className="flex flex-col items-center justify-between">
							<Text.Heading as="h3" className="gap-32 text-center">
								{t('pages.settingsPersonal.ABOUT_TO_CHANGE_EMAIL')}
							</Text.Heading>
							<div className="w-full mt-5">
								<InputField
									type="email"
									placeholder="Email Address"
									{...register('email', {
										required: true,
										pattern:
											/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
									})}
									className={`md:w-[220px] m-0 h-[54px]`}
								/>
								{message && (
									<Text.Error className="self-start justify-self-start">{message}</Text.Error>
								)}
							</div>
							<div className="flex items-center justify-between w-full mt-5">
								<Button
									type="button"
									onClick={onCloseModal}
									disabled={false}
									loading={false}
									className={
										'bg-transparent text-primary dark:text-dark--theme font-medium border border-gray-300 md:min-w-[180px] dark:border-0 dark:bg-light--theme-dark rounded-xl'
									}
								>
									{t('common.CANCEL')}
								</Button>

								<Button
									type="button"
									disabled={emailResetRequestLoading}
									loading={emailResetRequestLoading}
									className={'font-medium border border-primary md:min-w-[180px] rounded-xl'}
									onClick={() => {
										handleContinue();
									}}
								>
									{t('common.CONTINUE')}
								</Button>
							</div>
						</div>
					</EverCard>
				)}

				{step === 'CODE_VERIFICATION' && (
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
								{message && (
									<Text.Error className="self-start justify-self-start">{message}</Text.Error>
								)}
							</div>
							<div className="flex items-center justify-between w-full mt-5">
								<div className="flex flex-col items-start">
									<div className="text-xs font-normal text-gray-500 dark:text-gray-400">
										{"Didn't recieve code ?"}
										{!false && (
											<button
												type="button"
												className="text-xs font-normal text-gray-500 dark:text-gray-400"
												onClick={handleContinue}
											>
												{'Re'}
												<span className="text-primary dark:text-primary-light">
													{t('pages.auth.SEND_CODE')}
												</span>
											</button>
										)}
									</div>
								</div>
							</div>
							<div className="flex items-center justify-between w-full mt-5">
								<Button
									type="button"
									onClick={onCloseModal}
									disabled={false}
									loading={false}
									className={
										'bg-transparent text-primary dark:text-dark--theme font-medium border border-gray-300 md:min-w-[180px] dark:border-0 dark:bg-light--theme-dark rounded-xl'
									}
								>
									{t('common.DISCARD')}
								</Button>

								<Button
									type="submit"
									disabled={code.length < 6 || verifyChangeEmailRequestLoading}
									loading={verifyChangeEmailRequestLoading}
									className={
										'font-medium border border-primary disabled:border-0 md:min-w-[180px] rounded-xl'
									}
									onClick={handleConfirm}
								>
									{t('common.CONFIRM')}
								</Button>
							</div>
						</div>
					</EverCard>
				)}
			</form>
		</Modal>
	);
}
