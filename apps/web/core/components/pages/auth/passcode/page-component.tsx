'use client';

import { getAccessTokenCookie, getActiveUserIdCookie } from '@/core/lib/helpers/index';
import { TAuthenticationPasscode, useAuthenticationPasscode } from '@/core/hooks';
import { IClassName } from '@/core/types/interfaces/common/class-name';
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
import SocialLogins from '@/core/components/auth/social-logins-buttons';
import { useSession } from 'next-auth/react';
import {
	APP_NAME,
	AUTH_CODE_LENGTH,
	LAST_WORKSPACE_AND_TEAM,
	USER_SAW_OUTSTANDING_NOTIFICATION
} from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import { ChevronDown } from 'lucide-react';
import { AuthCodeInputField } from '@/core/components/auth/auth-code-input';
import { InputField } from '@/core/components/duplicated-components/_input';
import { Avatar } from '@/core/components/duplicated-components/avatar';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { hasTeams, getFirstTeamId, findWorkspaceIndexByTeamId } from '@/core/lib/utils/workspace.utils';
import { useWorkspaceAnalysis } from '@/core/hooks/auth/use-workspace-analysis';
import { buttonVariants } from '@/core/components/duplicated-components/_button';

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
			headerLinkText={t('common.REGISTER')}
			headerLinkHref="/auth/signup"
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
			<div className="overflow-x-hidden w-full p-1.5">
				<div className="w-full duration-500 transition-[transform] mb-3">
					{form.authScreen.screen === 'email' && <EmailScreen form={form} className="w-full" />}
					{form.authScreen.screen === 'passcode' && <PasscodeScreen form={form} className="w-full" />}

					{form.authScreen.screen === 'workspace' && <WorkSpaceScreen form={form} className="w-full" />}
				</div>
				{/* Social logins */}
				{form.authScreen.screen !== 'workspace' && <SocialLogins />}
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
			<div className="space-y-6">
				{/* Email input */}
				<div className="space-y-2.5">
					<label
						data-slot="label"
						className="block text-sm font-medium leading-none select-none"
						htmlFor="passcode-email"
					>
						{t('form.EMAIL_PLACEHOLDER')}
					</label>
					<InputField
						id="passcode-email"
						type="email"
						placeholder={t('form.EMAIL_PLACEHOLDER')}
						name="email"
						value={form.formValues.email}
						onChange={form.handleChange}
						errors={form.errors}
						required
						autoComplete="off"
						noWrapper
						className="dark:bg-foreground/5 ring-foreground/10 placeholder:text-muted-foreground/75 selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border border-transparent bg-white px-3 py-1 text-base shadow-sm outline-none ring-1 transition-[color,box-shadow] md:text-sm focus-visible:border-foreground/35 focus-visible:ring-ring/25 dark:focus-visible:border-foreground/25 focus-visible:ring"
					/>
					{form.errors?.email && <Text.Error className="text-xs">{form.errors.email}</Text.Error>}
				</div>

				{/* Submit button — template exact classes */}
				<Button
					type="submit"
					loading={form.signInEmailLoading}
					disabled={form.signInEmailLoading}
					className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-md border-[0.5px] border-white/10 shadow-black/15 [&_svg]:drop-shadow-sm bg-primary ring-1 ring-(--ring-color) [--ring-color:color-mix(in_oklab,black_15%,var(--color-primary))] dark:border-transparent dark:[--ring-color:color-mix(in_oklab,white_15%,var(--color-primary))] text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full"
				>
					{t('common.CONTINUE')}
				</Button>

				{/* Links — after button, template mt-10 */}
				<div className="mt-3 space-y-2 text-sm text-muted-foreground">
					<div className="flex gap-2 justify-between items-center">
						<span>{t('pages.authLogin.HAVE_PASSWORD')}</span>
						<Link href="/auth/password" className="font-medium text-primary hover:underline">
							{t('pages.authLogin.LOGIN_WITH_PASSWORD')}
						</Link>
					</div>
				</div>
			</div>
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
			<div className="space-y-6">
				{/* Auth code input */}
				<div className="space-y-2.5">
					<div className="flex justify-between items-center">
						<label data-slot="label" className="block text-sm font-medium leading-none select-none">
							{t('pages.auth.INPUT_INVITE_CODE')}
						</label>
						<button
							type="button"
							onClick={() => resetForm()}
							className="text-xs font-medium underline transition-all cursor-pointer text-muted-foreground hover:text-foreground hover:underline-offset-4 underline-offset-2"
						>
							{t('common.RESET')}
						</button>
					</div>

					<AuthCodeInputField
						inputReference={inputsRef}
						key={form.authScreen.screen}
						allowedCharacters="alphanumeric"
						length={AUTH_CODE_LENGTH}
						ref={form.inputCodeRef}
						containerClassName="mt-2 w-full flex justify-between gap-x-0.5"
						inputClassName="w-[28px] xs:w-[32px] sm:w-[36px] md:w-[40px] px-0 text-center dark:bg-foreground/5 rounded-lg border border-input bg-background shadow-sm shadow-black/5 focus:border-ring focus:ring-[3px] focus:ring-ring/20"
						defaultValue={form.formValues.code}
						autoComplete={code ? code : ''}
						submitCode={autoSubmitForm}
						onChange={(code) => {
							form.setFormValues((v) => ({ ...v, code }));
						}}
						hintType={form.status === 'error' ? 'error' : form.status === 'success' ? 'success' : undefined}
						autoFocus={form.authScreen.screen === 'passcode'}
					/>
					{form.status === 'error' && (form.errors['code'] || form.errors['email']) && (
						<Text.Error className="text-xs">{form.errors['code'] || form.errors['email']}</Text.Error>
					)}
				</div>

				{/* Resend code + back */}
				<div className="flex flex-col gap-2 text-sm">
					<div className="flex flex-row gap-2 items-center">
						<span className="text-muted-foreground">{t('pages.auth.UNRECEIVED_CODE')}</span>
						{!form.sendCodeLoading ? (
							<button
								type="button"
								className="text-sm cursor-pointer"
								onClick={() => {
									if (!disabled) {
										form.sendAuthCodeHandler();
										handleResendClick();
									}
								}}
							>
								{!disabled ? (
									<span className="font-medium text-primary hover:underline">
										{t('pages.auth.RESEND_CODE')}
									</span>
								) : (
									<span className="text-muted-foreground">
										{t('pages.auth.RESEND_CODE_IN')} {formatTime(timer)}
									</span>
								)}
							</button>
						) : (
							<SpinnerLoader size={15} className="self-center" />
						)}
					</div>
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-1.5 items-center w-full">
					<Button
						type="submit"
						loading={form.signInEmailConfirmLoading}
						disabled={form.signInEmailConfirmLoading}
						className="cursor-pointer w-full inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-md border-[0.5px] border-white/10 shadow-black/15 [&_svg]:drop-shadow-sm bg-primary ring-1 ring-(--ring-color) [--ring-color:color-mix(in_oklab,black_15%,var(--color-primary))] dark:border-transparent dark:[--ring-color:color-mix(in_oklab,white_15%,var(--color-primary))] text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
					>
						{t('pages.auth.LOGIN')}
					</Button>

					<BackButton
						className={buttonVariants({ variant: 'link', className: 'w-full underline' })}
						onClick={() => {
							form.authScreen.setScreen('email');
							form.setErrors({});
						}}
					/>
				</div>
			</div>
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
			<div className={cn(`${workspaceAnalysis.shouldAutoSubmit ? 'hidden' : ''}`, 'w-full')}>
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

	const [expandedWorkspace, setExpandedWorkspace] = useState<number | null>(props.selectedWorkspace);

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
			className={cn(props.className, 'flex justify-center w-full')}
			onSubmit={props.onSubmit}
			autoComplete="off"
		>
			<div className="space-y-4 w-full">
				<div className="flex justify-between items-center">
					<button
						type="button"
						onClick={props.onBackButtonClick}
						className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
					>
						<ChevronDown className="rotate-90 size-4" />
						{t('common.BACK')}
					</button>
					<h3 className="text-lg font-semibold">{t('pages.auth.SELECT_WORKSPACE')}</h3>
					{/* Spacer to center the title */}
					<div className="w-16" />
				</div>

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

				<div className="overflow-y-auto relative w-full h-64">
					<div className="flex flex-col gap-y-4">
						{workspacesWithTeamsStatus.map(
							({ workspace: workspace, originalIndex, hasTeams: workspaceHasTeams, teamCount }, index) => {
								const isEmpty = !workspaceHasTeams;
								const workspaceName = workspace.user.tenant?.name || workspace.user.name || 'Workspace';

								return (
									<div
										key={originalIndex}
										className={cn(
											'w-full h-12 flex flex-col border rounded-xl transition-all',
											expandedWorkspace === index && 'h-auto overflow-visible',
											expandedWorkspace !== index && 'overflow-hidden',
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
										<div className="flex flex-col gap-3 p-3 w-full text-base font-medium">
											<div className="flex gap-3 justify-between items-center w-full">
												<div
													onClick={() =>
														setExpandedWorkspace((prev) => (prev === index ? null : index))
													}
													className="flex flex-1 gap-2 justify-between items-center min-w-0 cursor-pointer"
												>
													<div className="flex items-center">
														<span
															className={cn(
																'truncate',
																isEmpty && 'text-amber-700 dark:text-amber-300'
															)}
														>
															{workspaceName}
														</span>

														{/* Badge for empty workspace */}
														{isEmpty && (
															<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shrink-0">
																{t('pages.auth.NO_TEAMS_BADGE')}
															</span>
														)}

														{/* Team count badge for non-empty workspaces */}
														{!isEmpty && teamCount > 0 && (
															<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 shrink-0">
																{teamCount}{' '}
																{teamCount === 1
																	? t('pages.auth.TEAM_COUNT_SINGULAR')
																	: t('pages.auth.TEAM_COUNT_PLURAL')}
															</span>
														)}
													</div>
													<span
														className={cn(
															'h-6 w-6 shrink-0 flex items-center justify-center transition-transform',
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
													className="shrink-0 hover:cursor-pointer"
													onClick={() => {
														props.setSelectedWorkspace(originalIndex);
														// Only auto-select first team if workspace has teams
														if (workspaceHasTeams && props.selectedTeam) {
															const teamIds = workspace.current_teams.map(
																(team) => team.team_id
															);
															if (!teamIds.includes(props.selectedTeam)) {
																const firstTeamId = getFirstTeamId(workspace);
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
												className={`bg-[#E5E5E5] w-full h-px hidden ${expandedWorkspace === index && 'block'}`}
											></span>
											{/* <div className="w-full h-[1px] bg-[#E5E5E5] dark:bg-[#34353D]"></div> */}
											<div className="flex flex-col gap-4 px-5 py-1.5">
												{workspace.current_teams
													?.filter((team) => team && team.team_name)
													.map((team) => (
														<div
															key={`${originalIndex}-${team.team_id}`}
															className="flex items-center justify-between gap-4 min-h-11.5"
														>
															<span className="flex gap-4 justify-between items-center">
																<Avatar
																	imageTitle={team.team_name}
																	size={34}
																	backgroundColor={`${stc(team.team_name)}80`}
																/>
																<div className="flex justify-between">
																	<span className="overflow-hidden whitespace-nowrap max-w-56 text-ellipsis">
																		{team.team_name}
																	</span>
																	<span>({team.team_member_count})</span>
																</div>
															</span>
															<span
																className="shrink-0 hover:cursor-pointer"
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
				</div>
				<Button
					type="submit"
					loading={props.signInWorkspaceLoading}
					disabled={
						props.signInWorkspaceLoading || (!props.selectedWorkspace && props.selectedWorkspace !== 0)
					}
					id="continue-to-workspace"
					className="cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-md border-[0.5px] border-white/10 shadow-black/15 [&_svg]:drop-shadow-sm bg-primary ring-1 ring-(--ring-color) [--ring-color:color-mix(in_oklab,black_15%,var(--color-primary))] dark:border-transparent dark:[--ring-color:color-mix(in_oklab,white_15%,var(--color-primary))] text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 w-full"
				>
					{t('common.CONTINUE')}
				</Button>
			</div>
		</form>
	);
}

export default AuthPasscode;
