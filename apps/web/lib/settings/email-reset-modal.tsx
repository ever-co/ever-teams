import { useAuthenticateUser, useEmailReset } from '@app/hooks';
import {
	AuthCodeInputField,
	Button,
	Card,
	InputField,
	Modal,
	Text,
} from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

export type ISteps = 'EMAIL' | 'CODE_VERIFICATION';

/**
 * Email Reset modal
 */
export function EmailResetModal({
	open,
	closeModal,
	email,
}: {
	open: boolean;
	closeModal: () => void;
	email: string;
}) {
	const { trans } = useTranslation();
	const { register, setValue, getValues } = useForm();
	const [code, setCode] = useState('');
	const [step, setStep] = useState<ISteps>('EMAIL');
	const [message, setMessage] = useState<string>('');

	useEffect(() => {
		setValue('email', email);
	}, [email, setValue]);

	const { user, setUser } = useAuthenticateUser();

	const {
		emailResetRequestLoading,
		emailResetRequestQueryCall,
		verifyChangeEmailRequestLoading,
		verifyChangeEmailRequestQueryCall,
	} = useEmailReset();

	const onCloseModal = () => {
		setMessage('');
		setStep('EMAIL');
		closeModal();
	};
	const handleContinue = useCallback(() => {
		const newEmail = getValues().email;
		emailResetRequestQueryCall(newEmail).then(() => {
			setMessage(trans.pages.home.SENT_EMAIL_VERIFICATION);
			setStep('CODE_VERIFICATION');
		});
	}, [emailResetRequestQueryCall, getValues]);
	const handleConfirm = useCallback(() => {
		verifyChangeEmailRequestQueryCall(+code).then((data) => {
			if (data?.data?.data?.status === 400) {
				setMessage(data?.data?.data?.message);
				return;
			}

			const newEmail = getValues().email;
			if (user) {
				setUser({
					...user,
					email: newEmail,
				});
			}
			onCloseModal();
		});
	}, [code, user, getValues, setUser, verifyChangeEmailRequestQueryCall]);

	return (
		<Modal isOpen={open} closeModal={onCloseModal}>
			<form
				className="w-[98%] md:w-[480px]"
				autoComplete="off"
				onSubmit={handleConfirm}
			>
				{step === 'EMAIL' && (
					<Card className="w-full" shadow="custom">
						<div className="flex flex-col justify-between items-center">
							<Text.Heading as="h3" className="text-center  gap-32">
								{trans.pages.settingsPersonal.ABOUT_TO_CHANGE_EMAIL}
							</Text.Heading>
							<div className="w-full mt-5">
								<InputField
									type="email"
									placeholder="Email Address"
									{...register('email', {
										required: true,
										pattern:
											/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
									})}
									className={`md:w-[220px] m-0 h-[54px]`}
								/>
								{message && (
									<Text.Error className="self-start justify-self-start">
										{message}
									</Text.Error>
								)}
							</div>
							<div className="w-full flex justify-between mt-5 items-center">
								<Button
									type="button"
									onClick={onCloseModal}
									disabled={false}
									loading={false}
									className={
										'bg-transparent text-primary dark:text-dark--theme font-medium border border-gray-300 md:min-w-[180px] dark:border-0 dark:bg-light--theme-dark rounded-xl'
									}
								>
									{trans.common.CANCEL}
								</Button>

								<Button
									type="button"
									disabled={emailResetRequestLoading}
									loading={emailResetRequestLoading}
									className={
										'font-medium border border-primary md:min-w-[180px] rounded-xl'
									}
									onClick={() => {
										handleContinue();
									}}
								>
									{trans.common.CONTINUE}
								</Button>
							</div>
						</div>
					</Card>
				)}

				{step === 'CODE_VERIFICATION' && (
					<Card className="w-full" shadow="custom">
						<div className="flex flex-col justify-between items-center">
							<Text.Heading as="h3" className="text-center">
								{trans.common.SECURITY_CODE}
							</Text.Heading>
							<div className="w-full mt-5">
								<AuthCodeInputField
									allowedCharacters="numeric"
									length={6}
									containerClassName="mt-[21px] w-full flex justify-between"
									inputClassName="w-[40px] xs:w-[50px]"
									onChange={(code) => {
										setCode(code);
									}}
								/>
								{message && (
									<Text.Error className="self-start justify-self-start">
										{message}
									</Text.Error>
								)}
							</div>
							<div className="w-full flex justify-between items-center mt-5">
								<div className="flex flex-col items-start">
									<div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
										{"Didn't recieve code ?"}
										{!false && (
											<button
												type="button"
												className="text-xs text-gray-500 dark:text-gray-400 font-normal"
												onClick={handleContinue}
											>
												{'Re'}
												<span className="text-primary dark:text-primary-light">
													{trans.pages.auth.SEND_CODE}
												</span>
											</button>
										)}
									</div>

									{/* {true && <SpinnerLoader size={22} className="self-center" />} */}
								</div>
							</div>
							<div className="w-full flex justify-between mt-5 items-center">
								<Button
									type="button"
									onClick={onCloseModal}
									disabled={false}
									loading={false}
									className={
										'bg-transparent text-primary dark:text-dark--theme font-medium border border-gray-300 md:min-w-[180px] dark:border-0 dark:bg-light--theme-dark rounded-xl'
									}
								>
									{trans.common.DISCARD}
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
									{trans.common.CONFIRM}
								</Button>
							</div>
						</div>
					</Card>
				)}
			</form>
		</Modal>
	);
}
