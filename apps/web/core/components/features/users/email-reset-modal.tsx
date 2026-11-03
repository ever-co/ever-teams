import { useAuthenticateUser, useEmailReset } from '@/core/hooks';
import { Button, Modal, Text } from '@/core/components';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import { AuthCodeInputField } from '../../auth/auth-code-input';
import { AUTH_CODE_SLOT_CLASS } from '../../auth/auth-code-recipe';
import { AUTH_CODE_LENGTH } from '@/core/constants/config/constants';
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
	const [error, setError] = useState<string>('');

	useEffect(() => {
		setValue('email', email);
	}, [email, setValue]);

	const { refreshUserData } = useAuthenticateUser();

	const {
		emailResetRequestLoading,
		emailResetRequestQueryCall,
		verifyChangeEmailRequestLoading,
		verifyChangeEmailRequestQueryCall
	} = useEmailReset();

	const reasonOf = useCallback(
		(failure: unknown) => t(errorReasonKeyOf(failure) as DottedLanguageObjectStringPaths),
		[t]
	);

	const onCloseModal = useCallback(() => {
		setMessage('');
		setError('');
		setStep('EMAIL');
		closeModal();
	}, [setMessage, setStep, closeModal]);
	const handleContinue = useCallback(() => {
		if (emailResetRequestLoading) {
			return;
		}
		const newEmail = getValues().email;
		setError('');
		emailResetRequestQueryCall(newEmail)
			.then(() => {
				setMessage(t('pages.home.SENT_EMAIL_VERIFICATION'));
				setStep('CODE_VERIFICATION');
			})
			.catch((failure: unknown) => setError(reasonOf(failure)));
	}, [emailResetRequestLoading, emailResetRequestQueryCall, getValues, reasonOf, t]);
	// The Confirm button submits the form: one handler, so one verify request per click
	const handleConfirm = useCallback(
		(event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			const isCodeComplete = code.length >= AUTH_CODE_LENGTH;
			if (!isCodeComplete) {
				return;
			}
			if (verifyChangeEmailRequestLoading) {
				return;
			}
			setError('');
			verifyChangeEmailRequestQueryCall(code)
				.then(() => {
					refreshUserData();
					onCloseModal();
				})
				.catch((failure: unknown) => setError(reasonOf(failure)));
		},
		[
			code,
			verifyChangeEmailRequestLoading,
			verifyChangeEmailRequestQueryCall,
			refreshUserData,
			onCloseModal,
			reasonOf
		]
	);

	return (
		<Modal isOpen={open} closeModal={onCloseModal}>
			<form className="w-[98%] md:w-[480px]" autoComplete="off" onSubmit={handleConfirm}>
				{step === 'EMAIL' && (
					<div className="w-full">
						<div className="flex flex-col">
							<Text.Heading as="h3" className="pr-8">
								{t('pages.settingsPersonal.ABOUT_TO_CHANGE_EMAIL')}
							</Text.Heading>
							<div className="w-full mt-5">
								<InputField
									type="email"
									placeholder={t('form.EMAIL_PLACEHOLDER')}
									{...register('email', {
										required: true,
										pattern:
											/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
									})}
									className="m-0"
								/>
								{error && <Text.Error className="self-start justify-self-start">{error}</Text.Error>}
							</div>
							<div className="mt-5 flex w-full flex-wrap items-center justify-end gap-2">
								<Button
									type="button"
									onClick={onCloseModal}
									disabled={false}
									loading={false}
									variant="outline"
									className="md:min-w-[180px]"
								>
									{t('common.CANCEL')}
								</Button>

								<Button
									type="button"
									disabled={emailResetRequestLoading}
									loading={emailResetRequestLoading}
									className="md:min-w-[180px]"
									onClick={() => {
										handleContinue();
									}}
								>
									{t('common.CONTINUE')}
								</Button>
							</div>
						</div>
					</div>
				)}

				{step === 'CODE_VERIFICATION' && (
					<div className="w-full">
						<div className="flex flex-col">
							<Text.Heading as="h3" className="pr-8">
								{t('common.SECURITY_CODE')}
							</Text.Heading>
							<div className="w-full mt-5">
								<AuthCodeInputField
									allowedCharacters="alphanumeric"
									length={AUTH_CODE_LENGTH}
									containerClassName="flex w-full justify-between gap-1.5"
									inputClassName={AUTH_CODE_SLOT_CLASS}
									onChange={(code) => {
										setCode(code);
									}}
								/>
								{message && <p className="mt-2 text-xs text-muted-foreground">{message}</p>}
								{error && <Text.Error className="self-start justify-self-start">{error}</Text.Error>}
							</div>
							<div className="flex items-center justify-between w-full mt-5">
								<div className="flex flex-col items-start">
									<div className="text-xs text-muted-foreground">
										{t('pages.auth.UNRECEIVED_CODE')}
										{!false && (
											<button
												type="button"
												className="rounded-sm text-xs text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
												onClick={handleContinue}
											>
												<span className="text-primary-ink hover:underline">
													{t('notifications.NOTICES.VERIFY_RESEND')}
												</span>
											</button>
										)}
									</div>
								</div>
							</div>
							<div className="mt-5 flex w-full flex-wrap items-center justify-end gap-2">
								<Button
									type="button"
									onClick={onCloseModal}
									disabled={false}
									loading={false}
									variant="outline"
									className="md:min-w-[180px]"
								>
									{t('common.DISCARD')}
								</Button>

								<Button
									type="submit"
									disabled={code.length < AUTH_CODE_LENGTH || verifyChangeEmailRequestLoading}
									loading={verifyChangeEmailRequestLoading}
									className="md:min-w-[180px]"
								>
									{t('common.CONFIRM')}
								</Button>
							</div>
						</div>
					</div>
				)}
			</form>
		</Modal>
	);
}
