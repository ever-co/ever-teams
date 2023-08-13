import { useCallback, useState } from 'react';
import {
	useAuthenticationPasscode,
	useOrganizationTeams,
	useRequestToJoinTeam,
} from '@app/hooks';
import { useTranslation } from 'lib/i18n';
import {
	Button,
	Text,
	Modal,
	Card,
	InputField,
	AuthCodeInputField,
	SpinnerLoader,
} from 'lib/components';
import { clsxm } from '@app/utils';
import { ArrowLeft } from 'lib/components/svgs';
import { IRequestToJoinCreate } from '@app/interfaces';
import { PositionDropDown } from './position-dropdown';

export const RequestToJoinModal = ({
	open,
	closeModal,
}: {
	open: boolean;
	closeModal: () => void;
}) => {
	const [currentTab, setCurrentTab] = useState<
		'ALREADY_MEMBER' | 'BECOME_MEMBER'
	>('ALREADY_MEMBER');

	const { trans } = useTranslation();

	return (
		<Modal isOpen={open} closeModal={closeModal}>
			<Card className="w-[98%] md:w-[480px]" shadow="custom">
				<div className="flex justify-between items-center border-b">
					<Text.Heading
						as="h3"
						className={clsxm(
							'text-center gap-32 pb-4 pr-5 hover:cursor-pointer',
							currentTab === 'ALREADY_MEMBER' &&
								'border-primary dark:border-white border-b-2'
						)}
						onClick={() => {
							setCurrentTab('ALREADY_MEMBER');
						}}
					>
						{trans.common.EXISTING_MEMBER}
					</Text.Heading>
					<Text.Heading
						as="h3"
						className={clsxm(
							'text-center gap-32 pb-4 pl-5 hover:cursor-pointer',
							currentTab === 'BECOME_MEMBER' &&
								'border-primary dark:border-white border-b-2'
						)}
						onClick={() => {
							setCurrentTab('BECOME_MEMBER');
						}}
					>
						{trans.common.NEW_MEMBER}
					</Text.Heading>
				</div>

				{currentTab === 'ALREADY_MEMBER' && (
					<AlreadyMember closeModal={closeModal} />
				)}
				{currentTab === 'BECOME_MEMBER' && (
					<BecomeMember closeModal={closeModal} />
				)}
			</Card>
		</Modal>
	);
};

const AlreadyMember = ({ closeModal }: { closeModal: any }) => {
	const { trans } = useTranslation();
	const {
		loading,
		formValues,
		setFormValues,
		errors,
		handleChange,
		handleSubmit,
		sendCodeLoading,
		sendAuthCodeHandler,
		inputCodeRef,
	} = useAuthenticationPasscode();

	return (
		<form autoComplete="off" onSubmit={handleSubmit}>
			<div className="w-full mt-8">
				<InputField
					type="email"
					placeholder="Yourmail@mail.com"
					className={`m-0 h-[54px]`}
					name="email"
					value={formValues.email}
					onChange={handleChange}
					errors={errors}
					required
				/>
			</div>
			<div className="mt-5">
				<div className="flex flex-col justify-between items-center">
					<>
						<div className="w-full">
							<p className="text-left text-xs text-gray-500">
								{trans.pages.auth.INPUT_INVITE_CODE}
							</p>
							<AuthCodeInputField
								allowedCharacters="numeric"
								length={6}
								ref={inputCodeRef}
								containerClassName="mt-[21px] w-full flex justify-between"
								inputClassName="w-[40px] xs:w-[50px]"
								defaultValue={formValues.code}
								onChange={(code) => {
									setFormValues((v) => ({ ...v, code }));
								}}
							/>
							{errors['code'] && (
								<Text.Error className="self-start justify-self-start">
									{errors['code']}
								</Text.Error>
							)}
						</div>
						<div className="w-full flex justify-between items-center mt-5">
							<div className="flex flex-col items-start">
								<div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
									{trans.pages.auth.UNRECEIVED_CODE}
									{!sendCodeLoading && (
										<button
											type="button"
											className="text-xs text-gray-500 dark:text-gray-400 font-normal"
											onClick={sendAuthCodeHandler}
										>
											{'Re'}
											<span className="text-primary dark:text-primary-light">
												{trans.pages.auth.SEND_CODE}
											</span>
										</button>
									)}
									{sendCodeLoading && (
										<SpinnerLoader size={22} className="self-center" />
									)}
								</div>
							</div>
						</div>
					</>

					<div className="w-full flex justify-between mt-5 items-center">
						<div
							className="flex justify-around hover:cursor-pointer"
							onClick={closeModal}
						>
							<ArrowLeft /> <p className="ml-5">{trans.common.BACK}</p>
						</div>

						<Button
							type="submit"
							className={
								'font-normal border border-primary disabled:border-0 md:min-w-[180px] rounded-xl'
							}
							loading={loading}
							disabled={loading || formValues.code.length !== 6}
						>
							{trans.pages.auth.JOIN}
						</Button>
					</div>
				</div>
			</div>
		</form>
	);
};
const BecomeMember = ({ closeModal }: { closeModal: any }) => {
	const [joinButtonAction, setJoinButtonAction] = useState<'JOIN' | 'CONFIRM'>(
		'JOIN'
	);
	const [requestToJoinPayload, setRequestToJoinPayload] =
		useState<IRequestToJoinCreate | null>(null);
	const [position, setPosition] = useState<string>('');

	const { trans } = useTranslation();
	const {
		formValues,
		setFormValues,
		errors,
		setErrors,
		sendCodeLoading,
		inputCodeRef,
	} = useAuthenticationPasscode();
	const { activeTeam } = useOrganizationTeams();
	const {
		requestToJoinTeam,
		validateRequestToJoinTeam,
		resendCodeRequestToJoinTeam,
		requestToJoinLoading,
		resendCodeRequestToJoinLoading,
		validateRequestToJoinLoading,
	} = useRequestToJoinTeam();
	const [message, setMessage] = useState<string>('');

	const handleSubmitRequest = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			if (!activeTeam || !position) {
				return;
			}

			const form = new FormData(e.currentTarget);

			const payload: IRequestToJoinCreate = {
				fullName: form.get('fullName') as string,
				email: form.get('email') as string,
				linkAddress: form.get('linkAddress') as string,
				position,
				organizationTeamId: activeTeam.id,
			};

			if (joinButtonAction === 'JOIN') {
				requestToJoinTeam(payload).then(() => {
					setJoinButtonAction('CONFIRM');
					setMessage(trans.pages.home.SENT_EMAIL_VERIFICATION);
				});
				setRequestToJoinPayload(payload);
			} else {
				if (requestToJoinPayload) {
					validateRequestToJoinTeam({
						email: requestToJoinPayload.email,
						organizationTeamId: requestToJoinPayload.organizationTeamId,
						code: +formValues.code,
					}).then((res) => {
						if (res.data.email && res.data.organizationTeamId) {
							closeModal();
						}
						setErrors({
							code: trans.errors.ERROR_WHILE_VERIFY_CODE,
						});
					});
				}
			}
		},
		[
			activeTeam,
			joinButtonAction,
			setJoinButtonAction,
			requestToJoinTeam,
			validateRequestToJoinTeam,
			formValues,
			requestToJoinPayload,
			position,
			closeModal,
			setErrors,
			trans.pages.home.SENT_EMAIL_VERIFICATION,
			trans.errors.ERROR_WHILE_VERIFY_CODE,
		]
	);

	const handleResendCodeRequestToJoinTeam = useCallback(() => {
		if (requestToJoinPayload) {
			resendCodeRequestToJoinTeam(requestToJoinPayload);
		}
	}, [requestToJoinPayload, resendCodeRequestToJoinTeam]);

	return (
		<form autoComplete="off" onSubmit={handleSubmitRequest}>
			<div className="w-full mt-8">
				<InputField
					type="text"
					placeholder="Enter your name"
					name="fullName"
					className={`m-0 h-[54px] placeholder:font-normal`}
					required
					disabled={joinButtonAction === 'CONFIRM'}
				/>
				<InputField
					type="email"
					placeholder="Enter your email address "
					className={`m-0 h-[54px] placeholder:font-normal`}
					name="email"
					required
					disabled={joinButtonAction === 'CONFIRM'}
				/>

				<InputField
					type="url"
					placeholder="Enter your link"
					className={`m-0 h-[54px] placeholder:font-normal`}
					name="linkAddress"
					required
					disabled={joinButtonAction === 'CONFIRM'}
				/>
				<PositionDropDown
					currentPosition={position}
					onChangePosition={setPosition}
					disabled={joinButtonAction === 'CONFIRM'}
				/>

				{message && (
					<Text.Error className="self-start justify-self-start">
						{message}
					</Text.Error>
				)}
			</div>

			<div className="mt-5">
				<div className="flex flex-col justify-between items-center">
					{joinButtonAction === 'CONFIRM' && (
						<>
							<div className="w-full">
								<p className="text-left text-xs text-gray-500">
									{trans.pages.auth.INPUT_INVITE_CODE}
								</p>
								<AuthCodeInputField
									allowedCharacters="numeric"
									length={6}
									ref={inputCodeRef}
									containerClassName="mt-[21px] w-full flex justify-between"
									inputClassName="w-[40px] xs:w-[50px]"
									defaultValue={formValues.code}
									onChange={(code) => {
										setFormValues((v) => ({ ...v, code }));
									}}
								/>
								{errors['code'] && (
									<Text.Error className="self-start justify-self-start">
										{errors['code']}
									</Text.Error>
								)}
							</div>
							<div className="w-full flex justify-between items-center mt-5">
								<div className="flex flex-col items-start">
									<div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
										{trans.pages.auth.UNRECEIVED_CODE}
										{!sendCodeLoading && (
											<button
												type="button"
												className="text-xs text-gray-500 dark:text-gray-400 font-normal"
												onClick={handleResendCodeRequestToJoinTeam}
											>
												{'Re'}
												<span className="text-primary dark:text-primary-light">
													{trans.pages.auth.SEND_CODE}
												</span>
											</button>
										)}
										{sendCodeLoading ||
											(resendCodeRequestToJoinLoading && (
												<SpinnerLoader size={22} className="self-center" />
											))}
									</div>
								</div>
							</div>
						</>
					)}

					<div className="w-full flex justify-between mt-5 items-center">
						<div
							className="flex justify-around hover:cursor-pointer"
							onClick={closeModal}
						>
							<ArrowLeft /> <p className="ml-5">{trans.common.BACK}</p>
						</div>

						<Button
							type="submit"
							className={
								'font-normal border border-primary disabled:border-0 md:min-w-[180px] rounded-xl'
							}
							loading={requestToJoinLoading || validateRequestToJoinLoading}
							disabled={
								requestToJoinLoading ||
								validateRequestToJoinLoading ||
								(joinButtonAction === 'CONFIRM' && formValues.code.length !== 6)
							}
						>
							{joinButtonAction === 'JOIN'
								? trans.common.JOIN_REQUEST
								: trans.common.CONFIRM}
						</Button>
					</div>
				</div>
			</div>
		</form>
	);
};
