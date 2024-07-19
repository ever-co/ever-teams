'use client';

import { getAccessTokenCookie, getActiveUserIdCookie } from '@app/helpers';
import { TAuthenticationPasscode, useAuthenticationPasscode } from '@app/hooks';
import { IClassName, ISigninEmailConfirmWorkspaces } from '@app/interfaces';
import { clsxm } from '@app/utils';
import {
	AuthCodeInputField,
	Avatar,
	BackButton,
	BackdropLoader,
	Button,
	Card,
	InputField,
	SpinnerLoader,
	Text
} from 'lib/components';
import { CircleIcon, CheckCircleOutlineIcon } from 'assets/svg';
import { AuthLayout } from 'lib/layout';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dispatch, FormEvent, FormEventHandler, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

import stc from 'string-to-color';
import { ScrollArea, ScrollBar } from '@components/ui/scroll-bar';
import SocialLogins from '../social-logins-buttons';
import { useSession } from 'next-auth/react';
import { LAST_WORSPACE_AND_TEAM, USER_SAW_OUTSTANDING_NOTIFICATION } from '@app/constants';

function AuthPasscode() {
	const form = useAuthenticationPasscode();
	const t = useTranslations();
	const router = useRouter();
	const { data: session, update }: any = useSession();

	useEffect(() => {
		if (session) {
			router.replace('/');
		}
		update({});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router]);

	useEffect(() => {
		const userId = getActiveUserIdCookie();
		if (userId) {
			router.replace('/');
		}
	}, [router]);

	return (
		<AuthLayout
			title={
				form.authScreen.screen === 'workspace'
					? t('pages.authLogin.WORKSPACE')
					: t('pages.authLogin.HEADING_TITLE')
			}
			description={
				form.authScreen.screen === 'workspace' ? (
					<>
						<span>{t('pages.authLogin.HEADING_WORKSPACE_LINE1')}</span>
						<br />
						<span>{t('pages.authLogin.HEADING_WORKSPACE_LINE2')}</span>
					</>
				) : (
					<div>{t('pages.authLogin.HEADING_DESCRIPTION')}</div>
				)
			}
		>
			<div className="w-[98%] md:w-[550px] overflow-x-hidden">
				<div className={clsxm('flex flex-row transition-[transform] duration-500 mb-4')}>
					{form.authScreen.screen === 'email' && <EmailScreen form={form} className={clsxm('w-full')} />}
					{form.authScreen.screen === 'passcode' && (
						<PasscodeScreen form={form} className={clsxm('w-full')} />
					)}

					{form.authScreen.screen === 'workspace' && (
						<WorkSpaceScreen form={form} className={clsxm('w-full')} />
					)}
				</div>
				{/* Social logins */}
				<SocialLogins />
			</div>
		</AuthLayout>
	);
}

function EmailScreen({ form, className }: { form: TAuthenticationPasscode } & IClassName) {
	const t = useTranslations();

	const handleSendCode = useCallback(
		(e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			form.sendAuthCodeHandler().then(() => {
				form.authScreen.setScreen('passcode');
			});
		},
		[form]
	);

	return (
		<form className={className} autoComplete="off" onSubmit={handleSendCode}>
			<Card className="w-full dark:bg-[#25272D]" shadow="custom">
				<div className="flex flex-col items-center justify-between">
					<Text.Heading as="h3" className="text-center mb-7">
						{t('pages.auth.ENTER_EMAIL')}
					</Text.Heading>

					{/* Email input */}
					<InputField
						type="email"
						placeholder={t('form.EMAIL_PLACEHOLDER')}
						name="email"
						value={form.formValues.email}
						onChange={form.handleChange}
						errors={form.errors}
						required
						autoComplete="off"
						wrapperClassName="dark:bg-[#25272D]"
						className="dark:bg-[#25272D]"
					/>

					<div className="flex items-center justify-between w-full mt-6">
						<div className="flex flex-col items-start gap-2">
							<div className="flex items-center justify-start gap-2 text-sm">
								<span className="text-sm">{t('pages.authLogin.HAVE_PASSWORD')}</span>
								<Link href="/auth/password" className="text-primary dark:text-primary-light">
									{t('pages.authLogin.LOGIN_WITH_PASSWORD')}.
								</Link>
							</div>

							<div className="flex items-center justify-start gap-2 text-sm">
								<span>{t('common.DONT_HAVE_ACCOUNT')}</span>
								<Link href="/auth/team" className="text-primary dark:text-primary-light">
									<span>{t('common.REGISTER')}</span>
								</Link>
							</div>
						</div>

						<Button type="submit" loading={form.signInEmailLoading} disabled={form.signInEmailLoading}>
							{t('common.CONTINUE')}
						</Button>
					</div>
				</div>
			</Card>
		</form>
	);
}

function PasscodeScreen({ form, className }: { form: TAuthenticationPasscode } & IClassName) {
	const t = useTranslations();
	const inputsRef = useRef<Array<HTMLInputElement>>([]);
	const formRef = useRef<HTMLFormElement>(null);
	const urlSearchParams = new URLSearchParams(window.location.search);
	const code = urlSearchParams.get('code');

	const formatTime = (seconds: number) => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
	};

	const [timer, setTimer] = useState(60);
	const [disabled, setDisabled] = useState(true);

	useEffect(() => {
		let interval: NodeJS.Timeout | undefined = undefined;
		if (timer > 0) {
			interval = setInterval(() => {
				setTimer((prevTimer) => prevTimer - 1);
			}, 1000);
		} else {
			setDisabled(false);
			clearInterval(interval);
		}

		return () => clearInterval(interval);
	}, [timer]);

	const handleResendClick = () => {
		setDisabled(true);
		setTimer(60);
	};

	const resetForm = () => {
		if (inputsRef.current) {
			for (let i = 0; i < inputsRef.current.length; i++) {
				inputsRef.current[i].value = '';
			}
			inputsRef.current[0].focus();
		}
	};

	const autoSubmitForm = () => {
		if (formRef.current) {
			formRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
		}
	};

	return (
		<form className={className} ref={formRef} onSubmit={form.handleCodeSubmit} autoComplete="off">
			<Card className="w-full dark:bg-[#25272D]" shadow="custom">
				<div className="flex flex-col items-center justify-between">
					<Text.Heading as="h3" className="mb-10 text-center">
						{t('pages.auth.LOGIN')}
					</Text.Heading>

					{/* Auth code input */}
					<div className="w-full mt-5">
						<div className="flex justify-between">
							<Text className="text-xs font-normal text-gray-400">
								{t('pages.auth.INPUT_INVITE_CODE')}
							</Text>
							<Text
								onClick={() => resetForm()}
								className="text-xs font-normal cursor-pointer hover:underline text-gray-400"
							>
								{t('common.RESET')}
							</Text>
						</div>

						<AuthCodeInputField
							inputReference={inputsRef}
							key={form.authScreen.screen}
							allowedCharacters="alphanumeric"
							length={6}
							ref={form.inputCodeRef}
							containerClassName="mt-[21px] w-full flex justify-between dark:bg-[#25272D]"
							inputClassName="w-[40px] xs:w-[50px] pl-[21px] dark:bg-[#25272D]"
							defaultValue={form.formValues.code}
							autoComplete={code ? code : ''}
							submitCode={autoSubmitForm}
							onChange={(code) => {
								form.setFormValues((v) => ({ ...v, code }));
							}}
							hintType={
								form.errors['code'] || form.errors['email']
									? 'error'
									: form.authenticated
										? 'success'
										: undefined
							}
							autoFocus={form.authScreen.screen === 'passcode'}
						/>
						{(form.errors['code'] || form.errors['email']) && (
							<Text.Error className="self-start justify-self-start">
								{form.errors['code'] || form.errors['email']}
							</Text.Error>
						)}
					</div>

					<div className="flex justify-between w-full mt-10">
						{/* Send code */}
						<div className="flex flex-col space-y-2">
							<div className="flex flex-row items-center mb-1 space-x-2">
								<Text className="text-xs font-normal text-gray-500 dark:text-gray-400">
									{t('pages.auth.UNRECEIVED_CODE')}
								</Text>
								{!form.sendCodeLoading ? (
									<button
										type="button"
										className="text-xs font-normal text-gray-500 cursor-pointer dark:text-gray-400"
										onClick={() => {
											if (!disabled) {
												form.sendAuthCodeHandler();
												handleResendClick();
											}
										}}
									>
										{!disabled ? (
											<span className="text-primary dark:text-primary-light">
												{t('pages.auth.RESEND_CODE')}
											</span>
										) : (
											<span className=" dark:text-primary-light">
												{t('pages.auth.RESEND_CODE_IN')} {formatTime(timer)}
											</span>
										)}
									</button>
								) : (
									<SpinnerLoader size={15} className="self-center" />
								)}
							</div>

							<div>
								<BackButton
									onClick={() => {
										form.authScreen.setScreen('email');
										form.setErrors({});
									}}
								/>
							</div>
						</div>

						<Button
							type="submit"
							loading={form.signInEmailConfirmLoading}
							disabled={form.signInEmailConfirmLoading}
						>
							{t('pages.auth.LOGIN')}
						</Button>
					</div>
				</div>
			</Card>
		</form>
	);
}

function WorkSpaceScreen({ form, className }: { form: TAuthenticationPasscode } & IClassName) {
	const t = useTranslations();
	const [selectedWorkspace, setSelectedWorkspace] = useState<number>(0);
	const [selectedTeam, setSelectedTeam] = useState('');
	const router = useRouter();

	const signInToWorkspace = useCallback(
		(e: any) => {
			if (typeof selectedWorkspace !== 'undefined') {
				form.handleWorkspaceSubmit(e, form.workspaces[selectedWorkspace].token, selectedTeam);
				window && window?.localStorage.removeItem(USER_SAW_OUTSTANDING_NOTIFICATION);
				window && window?.localStorage.setItem(LAST_WORSPACE_AND_TEAM, selectedTeam);
			}
		},
		[selectedWorkspace, selectedTeam, form]
	);

	useEffect(() => {
		if (form.workspaces.length === 1) {
			setSelectedWorkspace(0);
		}

		const currentTeams = form.workspaces[0]?.current_teams;

		if (form.workspaces.length === 1 && currentTeams?.length === 1) {
			setSelectedTeam(currentTeams[0].team_id);
		} else {
			const lastSelectedTeam = window.localStorage.getItem(LAST_WORSPACE_AND_TEAM) || currentTeams[0]?.team_id;
			const lastSelectedWorkspace =
				form.workspaces.findIndex((workspace) =>
					workspace.current_teams.find((team) => team.team_id === lastSelectedTeam)
				) || 0;
			setSelectedTeam(lastSelectedTeam);
			setSelectedWorkspace(lastSelectedWorkspace);
		}

		if (form.workspaces.length === 1 && (currentTeams?.length || 0) <= 1) {
			setTimeout(() => {
				document.getElementById('continue-to-workspace')?.click();
			}, 100);
		}
	}, [form.workspaces]);

	useEffect(() => {
		if (form.authScreen.screen === 'workspace') {
			const accessToken = getAccessTokenCookie();
			if (accessToken && accessToken.length > 100) {
				router.refresh();
			}
		}
	}, [form.authScreen, router]);

	const hasMultipleTeams = form.workspaces.some((workspace) => workspace.current_teams.length > 1);

	return (
		<>
			{/* The workspace component will be visible only if there are two or many workspaces and/or teams */}
			<div className={clsxm(`${form.workspaces.length === 1 && !hasMultipleTeams ? 'hidden' : ''}`, 'w-full')}>
				<WorkSpaceComponent
					className={className}
					workspaces={form.workspaces}
					onSubmit={signInToWorkspace}
					onBackButtonClick={() => {
						form.authScreen.setScreen('email');
						form.setErrors({});
					}}
					selectedWorkspace={selectedWorkspace}
					setSelectedWorkspace={setSelectedWorkspace}
					setSelectedTeam={setSelectedTeam}
					selectedTeam={selectedTeam}
					signInWorkspaceLoading={form.signInWorkspaceLoading}
				/>
			</div>

			{/* If the user is a member of only one workspace and only one team, render a redirecting component */}
			{form.workspaces.length === 1 && !hasMultipleTeams && (
				<div>
					<BackdropLoader show={true} title={t('pages.authTeam.REDIRECT_TO_WORSPACE_LOADING')} />
				</div>
			)}
		</>
	);
}

type IWorkSpace = {
	className?: string;
	workspaces: ISigninEmailConfirmWorkspaces[];
	onSubmit?: FormEventHandler<HTMLFormElement>;
	onBackButtonClick?: () => void;
	selectedWorkspace: number;
	setSelectedWorkspace: Dispatch<SetStateAction<number>>;
	signInWorkspaceLoading?: boolean;
	setSelectedTeam: Dispatch<SetStateAction<string>>;
	selectedTeam: string;
};

export function WorkSpaceComponent(props: IWorkSpace) {
	const t = useTranslations();

	return (
		<form
			className={clsxm(props.className, 'flex justify-center w-full')}
			onSubmit={props.onSubmit}
			autoComplete="off"
		>
			<Card className="w-full max-w-[30rem] dark:bg-[#25272D]" shadow="custom">
				<div className="flex flex-col items-center justify-between gap-8">
					<Text.Heading as="h3" className="text-center">
						{t('pages.auth.SELECT_WORKSPACE')}
					</Text.Heading>
					<ScrollArea className="h-64 relative w-full pr-2 ">
						<div className="flex flex-col gap-y-4 ">
							{props.workspaces?.map((worksace, index) => (
								<div
									key={index}
									className={`w-full flex flex-col border border-[#0000001A] dark:border-[#34353D] ${
										props.selectedWorkspace === index ? 'bg-[#FCFCFC] dark:bg-[#1F2024]' : ''
									} hover:bg-[#FCFCFC] dark:hover:bg-[#1F2024] rounded-xl`}
								>
									<div className="text-base font-medium py-[1.25rem] px-4 flex flex-col gap-[1.0625rem]">
										<div className="flex justify-between">
											<span>{worksace.user.tenant.name}</span>
											<span
												className="hover:cursor-pointer"
												onClick={() => {
													props.setSelectedWorkspace(index);
													if (
														props.selectedTeam &&
														!worksace.current_teams
															?.map((team) => team.team_id)
															.includes(props.selectedTeam)
													) {
														props.setSelectedTeam(worksace.current_teams[0].team_id);
													}
												}}
											>
												{props.selectedWorkspace === index ? (
													<CheckCircleOutlineIcon className="w-6 h-6 stroke-[#27AE60] fill-[#27AE60]" />
												) : (
													<CircleIcon className="w-6 h-6" />
												)}
											</span>
										</div>
										<span className="bg-[#E5E5E5] w-full h-[1px]"></span>
										{/* <div className="w-full h-[1px] bg-[#E5E5E5] dark:bg-[#34353D]"></div> */}
										<div className="flex flex-col gap-4 px-5 py-1.5">
											{worksace.current_teams?.map((team) => (
												<div
													key={`${index}-${team.team_id}`}
													className="flex items-center justify-between gap-4 min-h-[2.875rem]"
												>
													<span className="flex items-center justify-between gap-4">
														<Avatar
															imageTitle={team.team_name}
															size={34}
															backgroundColor={`${stc(team.team_name)}80`}
														/>
														<div className="flex justify-between">
															<span className="max-w-[14rem] whitespace-nowrap text-ellipsis overflow-hidden">
																{team.team_name}
															</span>
															<span>({team.team_member_count})</span>
														</div>
													</span>
													<span
														className="hover:cursor-pointer"
														onClick={() => {
															props.setSelectedTeam(team.team_id);
															if (props.selectedWorkspace !== index) {
																props.setSelectedWorkspace(index);
															}
														}}
													>
														{props.selectedTeam === team.team_id ? (
															<CheckCircleOutlineIcon className="w-5 h-5 stroke-[#27AE60] fill-[#27AE60]" />
														) : (
															<CircleIcon className="w-5 h-5" />
														)}
													</span>
												</div>
											))}
										</div>
									</div>
								</div>
							))}
						</div>
						<ScrollBar className="-pr-20" />
					</ScrollArea>
					<div className="flex items-center justify-between w-full">
						<div className="flex flex-col space-y-2">
							<div>
								<BackButton onClick={props.onBackButtonClick} />
							</div>
						</div>

						<Button
							type="submit"
							loading={props.signInWorkspaceLoading}
							disabled={
								props.signInWorkspaceLoading ||
								(!props.selectedWorkspace && props.selectedWorkspace !== 0)
							}
							id="continue-to-workspace"
						>
							{t('common.CONTINUE')}
						</Button>
					</div>
				</div>
			</Card>
		</form>
	);
}

export default AuthPasscode;
