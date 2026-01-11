'use client';

import { getAccessTokenCookie, getActiveUserIdCookie } from '@/core/lib/helpers/index';
import { TAuthenticationPasscode, useAuthenticationPasscode } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { clsxm } from '@/core/lib/utils';
import { BackButton, BackdropLoader, Button, SpinnerLoader, Text } from '@/core/components';
import { CircleIcon, CheckCircleOutlineIcon } from 'assets/svg';
import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
	Dispatch,
	FormEvent,
	FormEventHandler,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';

import stc from 'string-to-color';
import { ScrollArea, ScrollBar } from '@/core/components/common/scroll-bar';
import SocialLogins from '@/core/components/auth/social-logins-buttons';
import { useSession } from 'next-auth/react';
import {
	APP_NAME,
	LAST_WORKSPACE_AND_TEAM,
	USER_SAW_OUTSTANDING_NOTIFICATION
} from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import { ChevronDown } from 'lucide-react';
import { AuthCodeInputField } from '@/core/components/auth/auth-code-input';
import { EverCard } from '@/core/components/common/ever-card';
import { InputField } from '@/core/components/duplicated-components/_input';
import { Avatar } from '@/core/components/duplicated-components/avatar';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { hasTeams, getFirstTeamId, findWorkspaceIndexByTeamId } from '@/core/lib/utils/workspace.utils';
import { useWorkspaceAnalysis } from '@/core/hooks/auth/use-workspace-analysis';

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
					: t('pages.authLogin.HEADING_TITLE', { appName: APP_NAME })
			}
			description={
				form.authScreen.screen === 'workspace' ? (
					<>
						<span>{t('pages.authLogin.HEADING_WORKSPACE_LINE1')}</span>
						<br />
						<span>{t('pages.authLogin.HEADING_WORKSPACE_LINE2')}</span>
					</>
				) : (
					<div>
						<span>{t('pages.authLogin.HEADING_DESCRIPTION')}</span>
					</div>
				)
			}
		>
			<div className="w-[98%] md:w-[550px] overflow-x-hidden overflow-y-clip  max-w-[450px] mx-auto">
				<div className={clsxm('flex flex-row justify-center mb-4 w-full duration-500 transition-[transform]')}>
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

			form.sendAuthCodeHandler()?.then(() => {
				form.authScreen.setScreen('passcode');
			});
		},
		[form]
	);

	return (
		<form className={className} autoComplete="off" onSubmit={handleSendCode}>
			<EverCard className="w-full dark:bg-[#25272D]" shadow="custom">
				<div className="flex flex-col justify-between items-center">
					<Text.Heading as="h3" className="mb-7 text-center">
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

					<div className="flex flex-col gap-3 justify-center items-center mt-6 w-full">
						<div className="flex flex-col gap-3 items-start mb-3 w-full">
							<div className="flex gap-2 justify-between items-center w-full text-sm">
								<span className="text-sm">{t('pages.authLogin.HAVE_PASSWORD')}</span>
								<Link href="/auth/password" className="underline text-primary dark:text-primary-light">
									{t('pages.authLogin.LOGIN_WITH_PASSWORD')}.
								</Link>
							</div>

							<div className="flex gap-2 justify-between items-center w-full text-sm">
								<span>{t('common.DONT_HAVE_ACCOUNT')}</span>
								<Link href="/auth/signup" className="underline whitespace-nowrap text-primary dark:text-primary-light text-nowrap">
									<span>{t('common.REGISTER')}</span>
								</Link>
							</div>
						</div>

						<Button type="submit" loading={form.signInEmailLoading} disabled={form.signInEmailLoading} className='w-full'>
							{t('common.CONTINUE')}
						</Button>
					</div>
				</div>
			</EverCard>
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
			<EverCard className="w-full dark:bg-[#25272D]" shadow="custom">
				<div className="flex flex-col justify-between items-center">
					<Text.Heading as="h3" className="mb-10 text-center">
						{t('pages.auth.LOGIN')}
					</Text.Heading>

					{/* Auth code input */}
					<div className="mt-5 w-full">
						<div className="flex justify-between">
							<Text className="text-xs font-normal text-gray-400">
								{t('pages.auth.INPUT_INVITE_CODE')}
							</Text>
							<Text
								onClick={() => resetForm()}
								className="text-xs font-normal text-gray-400 cursor-pointer hover:underline"
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
								form.status === 'error' ? 'error' : form.status === 'success' ? 'success' : undefined
							}
							autoFocus={form.authScreen.screen === 'passcode'}
						/>
						{form.status === 'error' && (form.errors['code'] || form.errors['email']) && (
							<Text.Error className="justify-self-start self-start">
								{form.errors['code'] || form.errors['email']}
							</Text.Error>
						)}
					</div>

					<div className="flex justify-between mt-10 w-full">
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
											<span className="dark:text-primary-light">
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
			</EverCard>
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
				window && window?.localStorage.setItem(LAST_WORKSPACE_AND_TEAM, selectedTeam);
			}
		},
		[selectedWorkspace, selectedTeam, form]
	);

	const lastSelectedTeamFromAPI = form.getLastTeamIdWithRecentLogout();

	// Analyze workspace structure to determine if we should show workspace selection
	// Using centralized hook to avoid code duplication across auth components
	const workspaceAnalysis = useWorkspaceAnalysis(form.workspaces);

	useEffect(() => {
		// Auto-select first workspace if only one exists
		if (form.workspaces.length === 1) {
			setSelectedWorkspace(0);
		}

		const { firstWorkspace, firstWorkspaceHasTeams, firstWorkspaceTeamCount } = workspaceAnalysis;

		// Auto-select team if only one workspace with one team
		if (form.workspaces.length === 1 && firstWorkspaceTeamCount === 1 && firstWorkspaceHasTeams) {
			const firstTeamId = getFirstTeamId(firstWorkspace);
			if (firstTeamId) {
				setSelectedTeam(firstTeamId);
			}
		} else {
			// Try to restore last selected team or use default
			const storedTeam = window.localStorage.getItem(LAST_WORKSPACE_AND_TEAM);
			const fallbackTeamId = getFirstTeamId(firstWorkspace);
			const lastSelectedTeam =
				storedTeam || lastSelectedTeamFromAPI || form.defaultTeamId || fallbackTeamId || '';

			// Find workspace containing the last selected team
			const lastSelectedWorkspaceIndex = findWorkspaceIndexByTeamId(form.workspaces, lastSelectedTeam);

			// Only set selectedTeam if the team actually exists in current_teams
			if (lastSelectedWorkspaceIndex >= 0) {
				setSelectedTeam(lastSelectedTeam);
				setSelectedWorkspace(lastSelectedWorkspaceIndex);
			} else {
				// Team doesn't exist (user was removed from team)
				// Set workspace to first one but leave selectedTeam empty
				// This prevents 401 errors when trying to sign in with a non-existent team
				setSelectedWorkspace(0);
				setSelectedTeam('');
			}
		}

		// Only auto-submit if shouldAutoSubmit is true (1 workspace with exactly 1 team)
		if (workspaceAnalysis.shouldAutoSubmit) {
			setTimeout(() => {
				document.getElementById('continue-to-workspace')?.click();
			}, 100);
		}
	}, [form.defaultTeamId, form.workspaces, lastSelectedTeamFromAPI, workspaceAnalysis]);

	useEffect(() => {
		if (form.authScreen.screen === 'workspace') {
			const accessToken = getAccessTokenCookie();
			if (accessToken && accessToken.length > 100) {
				router.refresh();
			}
		}
	}, [form.authScreen, router]);

	useEffect(() => {
		if (form.status === 'success') {
			const timeout = setTimeout(() => form.setStatus('idle'), 1500);
			return () => clearTimeout(timeout);
		}
	}, [form.status]);

	return (
		<>
			{/* Show workspace component unless we're auto-submitting (1 workspace with exactly 1 team) */}
			<div
				className={clsxm(
					`${workspaceAnalysis.shouldAutoSubmit ? 'hidden' : ''}`,
					'w-full'
				)}
			>
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

			{/* Only show loader when auto-submitting (1 workspace with exactly 1 team) */}
			{workspaceAnalysis.shouldAutoSubmit && (
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

	const [expandedWorkspace, setExpandedWorkspace] = useState(props.selectedWorkspace);

	useEffect(() => {
		setExpandedWorkspace(props.selectedWorkspace);
	}, [props.selectedWorkspace]);

	// UX Logic: If user has at least one workspace with teams, hide empty workspaces
	// to avoid confusion. If ALL workspaces are empty, show them all with warnings
	// so the user can still proceed to create a team.
	// Also preserve original indices to correctly map filtered UI selections back to the original array.
	const workspacesWithTeamsStatus = useMemo(() => {
		// Get all valid workspaces with their original indices
		const allWorkspacesWithIndices = props.workspaces
			.map((workspace, index) => ({ workspace, originalIndex: index }))
			.filter(({ workspace }) => workspace?.user);

		// Check if at least one workspace has teams
		const hasAtLeastOneWorkspaceWithTeams = allWorkspacesWithIndices.some(({ workspace }) => hasTeams(workspace));

		// If at least one workspace has teams, show ONLY workspaces with teams
		// Otherwise, show all workspaces (even empty ones with warnings)
		const filteredWorkspaces = hasAtLeastOneWorkspaceWithTeams
			? allWorkspacesWithIndices.filter(({ workspace }) => hasTeams(workspace))
			: allWorkspacesWithIndices;

		return filteredWorkspaces.map(({ workspace, originalIndex }) => ({
			workspace,
			originalIndex,
			hasTeams: hasTeams(workspace),
			teamCount: workspace.current_teams?.length || 0
		}));
	}, [props.workspaces]);

	// Find the selected workspace in the filtered array using originalIndex
	const selectedWorkspaceData = workspacesWithTeamsStatus.find((ws) => ws.originalIndex === props.selectedWorkspace);
	const isSelectedWorkspaceEmpty = selectedWorkspaceData ? !selectedWorkspaceData.hasTeams : false;

	return (
		<form
			className={clsxm(props.className, 'flex justify-center w-full')}
			onSubmit={props.onSubmit}
			autoComplete="off"
		>
			<EverCard className="w-full max-w-[30rem] bg-[#ffffff] dark:bg-[#25272D]" shadow="custom">
				<div className="flex flex-col gap-8 justify-between items-center">
					<Text.Heading as="h3" className="text-center">
						{t('pages.auth.SELECT_WORKSPACE')}
					</Text.Heading>

					{/* Warning message for empty workspace selection */}
					{isSelectedWorkspaceEmpty && (
						<div
							role="alert"
							className="px-4 py-3 w-full bg-amber-50 rounded-lg border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800"
						>
							<div className="flex gap-2 items-start">
								<svg
									className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
										clipRule="evenodd"
									/>
								</svg>
								<div className="flex-1">
									<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
										{t('pages.auth.EMPTY_WORKSPACE_WARNING_TITLE')}
									</p>
									<p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
										{t('pages.auth.EMPTY_WORKSPACE_WARNING_MESSAGE')}
									</p>
								</div>
							</div>
						</div>
					)}

					<ScrollArea className="relative pr-2 w-full h-64">
						<div className="flex flex-col gap-y-4">
							{workspacesWithTeamsStatus.map(
								(
									{ workspace: worksace, originalIndex, hasTeams: workspaceHasTeams, teamCount },
									index
								) => {
									const isEmpty = !workspaceHasTeams;
									const workspaceName =
										worksace.user.tenant?.name || worksace.user.name || 'Workspace';

									return (
										<div
											key={originalIndex}
											className={cn(
												'w-full overflow-hidden h-16 flex flex-col border rounded-xl transition-all',
												expandedWorkspace === index && 'h-auto',
												// Empty workspace styling
												isEmpty &&
													'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-900/10',
												// Normal workspace styling
												!isEmpty && 'border-[#0000001A] dark:border-[#34353D]',
												// Selected workspace styling
												props.selectedWorkspace === originalIndex &&
													!isEmpty &&
													'bg-[#FCFCFC] -order-1 dark:bg-[#1F2024]',
												props.selectedWorkspace === originalIndex &&
													isEmpty &&
													'bg-amber-100/50 -order-1 dark:bg-amber-900/20',
												// Hover styling
												!isEmpty && 'hover:bg-[#FCFCFC] dark:hover:bg-[#1F2024]',
												isEmpty && 'hover:bg-amber-100/40 dark:hover:bg-amber-900/15'
											)}
										>
											<div className="text-base font-medium py-[1.25rem] px-4 flex flex-col gap-[1.0625rem]">
												<div className="flex justify-between items-start">
													<div
														onClick={() => setExpandedWorkspace(index)}
														className="flex flex-1 gap-2 items-center cursor-pointer"
													>
														<span
															className={cn(
																isEmpty && 'text-amber-700 dark:text-amber-300'
															)}
														>
															{workspaceName}
														</span>

														{/* Badge for empty workspace */}
														{isEmpty && (
															<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
																{t('pages.auth.NO_TEAMS_BADGE')}
															</span>
														)}

														{/* Team count badge for non-empty workspaces */}
														{!isEmpty && teamCount > 0 && (
															<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
																{teamCount}{' '}
																{teamCount === 1
																	? t('pages.auth.TEAM_COUNT_SINGULAR')
																	: t('pages.auth.TEAM_COUNT_PLURAL')}
															</span>
														)}

														<span
															className={cn(
																'h-6 w-6 flex items-center justify-center transition-transform',
																expandedWorkspace === index && 'rotate-180'
															)}
														>
															<ChevronDown
																className={cn(
																	isEmpty && 'text-amber-600 dark:text-amber-400'
																)}
															/>
														</span>
													</div>
													<span
														className="hover:cursor-pointer"
														onClick={() => {
															props.setSelectedWorkspace(originalIndex);
															// Only auto-select first team if workspace has teams
															if (workspaceHasTeams && props.selectedTeam) {
																const teamIds = worksace.current_teams.map(
																	(team) => team.team_id
																);
																if (!teamIds.includes(props.selectedTeam)) {
																	const firstTeamId = getFirstTeamId(worksace);
																	if (firstTeamId) {
																		props.setSelectedTeam(firstTeamId);
																	}
																}
															}
														}}
													>
														{props.selectedWorkspace === originalIndex ? (
															<CheckCircleOutlineIcon className="w-6 h-6 stroke-[#27AE60] fill-[#27AE60]" />
														) : (
															<CircleIcon className="w-6 h-6" />
														)}
													</span>
												</div>
												<span
													className={`bg-[#E5E5E5] w-full h-[1px] hidden ${expandedWorkspace === index && 'block'}`}
												></span>
												{/* <div className="w-full h-[1px] bg-[#E5E5E5] dark:bg-[#34353D]"></div> */}
												<div className="flex flex-col gap-4 px-5 py-1.5">
													{worksace.current_teams
														?.filter((team) => team && team.team_name)
														.map((team) => (
															<div
																key={`${originalIndex}-${team.team_id}`}
																className="flex items-center justify-between gap-4 min-h-[2.875rem]"
															>
																<span className="flex gap-4 justify-between items-center">
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
																		if (props.selectedWorkspace !== originalIndex) {
																			props.setSelectedWorkspace(originalIndex);
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
									);
								}
							)}
						</div>
						<ScrollBar className="-pr-20" />
					</ScrollArea>
					<div className="flex justify-between items-center w-full">
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
			</EverCard>
		</form>
	);
}

export default AuthPasscode;
