'use client';

import { getAccessTokenCookie, getActiveUserIdCookie } from '@/core/lib/helpers/index';
import { TAuthenticationPasscode, useAuthenticationPasscode } from '@/core/hooks/auth/use-authentication-passcode';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { BackButton, Button } from '@/core/components/common/button';
import { BackdropLoader, SpinnerLoader } from '@/core/components/common/loader';
import { Text } from '@/core/components/common/typography';
import { Badge } from '@/core/components/common/badge';
import { Alert, ChevronDown, Circle, CircleCheck } from '@/core/components/icons';
import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { useTranslations } from 'next-intl';
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
import { AuthCodeInputField } from '@/core/components/auth/auth-code-input';
import { AUTH_CODE_SLOT_CLASS } from '@/core/components/auth/auth-code-recipe';
import { InputField } from '@/core/components/duplicated-components/_input';
import { Avatar } from '@/core/components/duplicated-components/avatar';
import { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import {
	hasTeams,
	getFirstTeamId,
	findWorkspaceIndexByTeamId,
	isWorkspaceNotSetUp
} from '@/core/lib/utils/workspace.utils';
import { useWorkspaceAnalysis } from '@/core/hooks/auth/use-workspace-analysis';
import { useResendCooldown } from '@/core/hooks/auth/use-resend-cooldown';

/** iOS zooms the page into any field under 16 px on focus: auth fields stay 16 px below `md`. */
const AUTH_FIELD_TEXT = 'text-base md:text-sm';

function teamCountLabel(teamCount: number, t: ReturnType<typeof useTranslations>) {
	if (teamCount === 1) {
		return t('pages.auth.TEAM_COUNT_SINGULAR');
	}
	return t('pages.auth.TEAM_COUNT_PLURAL');
}

function workspaceLabelOf(
	workspace: ISigninEmailConfirmWorkspaces,
	isNotSetUp: boolean,
	t: ReturnType<typeof useTranslations>
) {
	if (isNotSetUp) {
		return t('pages.auth.WORKSPACE_NOT_SET_UP');
	}
	return workspace.user.tenant.name || workspace.user.name || 'Workspace';
}

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
			showDeleteAccountLink
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
						{t('common.EMAIL')}
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
						className={AUTH_FIELD_TEXT}
					/>
					{form.errors?.email && <Text.Error>{form.errors.email}</Text.Error>}
				</div>

				<Button
					type="submit"
					loading={form.signInEmailLoading}
					disabled={form.signInEmailLoading}
					className="w-full"
				>
					{t('common.CONTINUE')}
				</Button>

				<div className="text-sm text-muted-foreground">
					<div className="flex gap-2 justify-between items-center">
						<span>{t('pages.authLogin.HAVE_PASSWORD')}</span>
						<Text.Link href="/auth/password" className="font-medium underline-offset-4 hover:underline">
							{t('pages.authLogin.LOGIN_WITH_PASSWORD')}
						</Text.Link>
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
	// This screen opens right after a code was sent
	const resendCooldown = useResendCooldown(true);

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
							{t('pages.auth.INPUT_SIGN_IN_CODE')}
						</label>
						<button
							type="button"
							onClick={() => resetForm()}
							className="cursor-pointer rounded-sm text-xs font-medium text-muted-foreground underline underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
						containerClassName="flex w-full justify-between gap-1.5"
						inputClassName={AUTH_CODE_SLOT_CLASS}
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
						<Text.Error>{form.errors['code'] || form.errors['email']}</Text.Error>
					)}
				</div>

				{/* Ever ID: Gauzy already sent its one-time code to the account's mailbox (no resend from here) */}
				{form.everIdConfirm && (
					<p className="text-sm text-muted-foreground">{t('pages.auth.everId.CONFIRM_HINT')}</p>
				)}

				{/* Resend code + back */}
				<div className={cn('flex flex-col gap-2 text-sm', form.everIdConfirm && 'hidden')}>
					<div className="flex flex-row gap-2 items-center">
						<span className="text-muted-foreground">{t('pages.auth.UNRECEIVED_CODE')}</span>
						{!form.signInEmailLoading ? (
							<button
								type="button"
								className="cursor-pointer rounded-sm text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
								onClick={() => {
									if (!resendCooldown.locked) {
										form.sendAuthCodeHandler();
										resendCooldown.start();
									}
								}}
							>
								{!resendCooldown.locked ? (
									<span className="font-medium text-primary-ink underline-offset-4 hover:underline">
										{t('pages.auth.RESEND_CODE')}
									</span>
								) : (
									<span className="text-muted-foreground tabular-nums">
										{t('pages.auth.RESEND_CODE_IN')} {resendCooldown.countdown}
									</span>
								)}
							</button>
						) : (
							<SpinnerLoader size={15} className="self-center" />
						)}
					</div>
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-3 items-center w-full">
					<Button
						type="submit"
						loading={form.signInEmailConfirmLoading || form.everIdConfirmLoading}
						disabled={form.signInEmailConfirmLoading || form.everIdConfirmLoading}
						className="w-full"
					>
						{t('pages.auth.LOGIN')}
					</Button>

					<BackButton
						onClick={() => {
							// Leaving the Ever ID step drops its marker from the URL and empties the code
							form.leaveEverIdStep();
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
			<div className={cn('w-full', workspaceAnalysis.shouldAutoSubmit && 'hidden')}>
				<WorkSpaceComponent
					className={className}
					workspaces={form.workspaces}
					onSubmit={signInToWorkspace}
					onBackButtonClick={() => {
						form.leaveEverIdStep();
						form.authScreen.setScreen('email');
						form.setErrors({});
					}}
					selectedWorkspace={selectedWorkspace}
					setSelectedWorkspace={setSelectedWorkspace}
					setSelectedTeam={setSelectedTeam}
					selectedTeam={selectedTeam}
					signInWorkspaceLoading={form.signInWorkspaceLoading}
					teamsUnavailable={form.everIdTeamsUnavailable}
					notSetUpIndices={form.everIdTenantless}
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
	/** The workspaces carry no team list (an Ever ID sign-in): list them without empty-workspace warnings. */
	teamsUnavailable?: boolean;
	/** The workspaces with no tenant yet, when the list cannot show it (an Ever ID sign-in fills a missing tenant). */
	notSetUpIndices?: readonly number[];
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
		// Team lists unknown (Ever ID sign-in): every workspace is listed as a plain choice, the team is picked later
		if (props.teamsUnavailable) {
			return props.workspaces
				.map((workspace, index) => ({ workspace, originalIndex: index }))
				.filter(({ workspace }) => workspace?.user)
				.map(({ workspace, originalIndex }) => ({
					workspace: { ...workspace, current_teams: workspace.current_teams ?? [] },
					originalIndex,
					hasTeams: true,
					teamCount: 0
				}));
		}

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
	}, [props.workspaces, props.teamsUnavailable]);

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
					<BackButton onClick={props.onBackButtonClick} />
					<h3 className="text-lg font-semibold text-balance">{t('pages.auth.SELECT_WORKSPACE')}</h3>
					{/* Spacer to center the title */}
					<div className="w-16" />
				</div>

				{/* Warning message for empty workspace selection */}
				{isSelectedWorkspaceEmpty && (
					<div role="alert" className="w-full rounded-lg bg-warning/10 px-3 py-2.5 text-warning-foreground">
						<div className="flex gap-2 items-start">
							<Alert className="mt-0.5 size-4 shrink-0" />
							<div className="flex-1">
								<p className="text-sm font-medium">{t('pages.auth.EMPTY_WORKSPACE_WARNING_TITLE')}</p>
								<p className="mt-1 text-xs">{t('pages.auth.EMPTY_WORKSPACE_WARNING_MESSAGE')}</p>
							</div>
						</div>
					</div>
				)}

				<div className="relative max-h-72 w-full overflow-y-auto rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5">
					<div className="flex flex-col hairline-divide-y divide-border">
						{workspacesWithTeamsStatus.map(
							(
								{ workspace: workspace, originalIndex, hasTeams: workspaceHasTeams, teamCount },
								index
							) => {
								const isEmpty = !workspaceHasTeams;
								const isExpanded = expandedWorkspace === index;
								const isSelected = props.selectedWorkspace === originalIndex;
								const isSelectedWithTeams = isSelected && !isEmpty;
								const isSelectedEmpty = isSelected && isEmpty;
								const showsTeamCount = !isEmpty && teamCount > 0;
								const isNotSetUp = isWorkspaceNotSetUp(workspace, originalIndex, props.notSetUpIndices);
								const workspaceName = workspaceLabelOf(workspace, isNotSetUp, t);

								return (
									<div
										key={originalIndex}
										className={cn(
											'flex w-full flex-col transition-colors hover:bg-foreground/[0.025]',
											isExpanded && 'h-auto overflow-visible',
											!isExpanded && 'h-12 overflow-hidden',
											isEmpty && 'bg-warning/5 hover:bg-warning/7',
											isSelectedWithTeams && 'bg-primary/5 hover:bg-primary/7',
											isSelectedEmpty && 'bg-warning/10 hover:bg-warning/10'
										)}
									>
										<div className="flex flex-col gap-3 p-3 w-full text-sm font-medium">
											<div className="flex gap-3 justify-between items-center w-full">
												<div
													onClick={() =>
														setExpandedWorkspace((prev) => (prev === index ? null : index))
													}
													className="flex flex-1 gap-2 justify-between items-center min-w-0 cursor-pointer"
												>
													<div className="flex min-w-0 items-center gap-2">
														<span
															className={cn(
																'truncate',
																isEmpty && 'text-warning-foreground'
															)}
														>
															{workspaceName}
														</span>

														{/* Badge for empty workspace */}
														{isEmpty && (
															<Badge variant="warning">
																{t('pages.auth.NO_TEAMS_BADGE')}
															</Badge>
														)}

														{/* Team count badge for non-empty workspaces */}
														{showsTeamCount && (
															<Badge variant="secondary" className="tabular-nums">
																{teamCount} {teamCountLabel(teamCount, t)}
															</Badge>
														)}
													</div>
													<span
														className={cn(
															'flex size-6 shrink-0 items-center justify-center transition-transform duration-200',
															isExpanded && 'rotate-180'
														)}
													>
														<ChevronDown
															className={cn(
																'size-4 text-muted-foreground',
																isEmpty && 'text-warning-foreground'
															)}
														/>
													</span>
												</div>
												<button
													type="button"
													aria-label={`${t('common.SELECT')} ${workspaceName}`}
													aria-pressed={props.selectedWorkspace === originalIndex}
													className="shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
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
													{isSelected && <CircleCheck className="size-5 text-primary-ink" />}
													{!isSelected && <Circle className="size-5 text-muted-foreground" />}
												</button>
											</div>
											<span
												className={cn('hidden h-px w-full bg-border', isExpanded && 'block')}
											></span>
											<div className="flex flex-col hairline-divide-y divide-border">
												{workspace.current_teams
													?.filter((team) => team && team.team_name)
													.map((team) => {
														const isTeamSelected = props.selectedTeam === team.team_id;
														return (
															<div
																key={`${originalIndex}-${team.team_id}`}
																className="flex h-10 items-center justify-between gap-3"
															>
																<span className="flex min-w-0 items-center gap-3">
																	<Avatar
																		imageTitle={team.team_name}
																		size={28}
																		backgroundColor={`${stc(team.team_name)}80`}
																	/>
																	<div className="flex min-w-0 items-center gap-1 font-normal">
																		<span className="max-w-48 truncate">
																			{team.team_name}
																		</span>
																		<span className="text-muted-foreground tabular-nums">
																			({team.team_member_count})
																		</span>
																	</div>
																</span>
																<span
																	className="shrink-0 cursor-pointer"
																	onClick={() => {
																		props.setSelectedTeam(team.team_id);
																		if (props.selectedWorkspace !== originalIndex) {
																			props.setSelectedWorkspace(originalIndex);
																		}
																	}}
																>
																	{isTeamSelected && (
																		<CircleCheck className="size-5 text-primary-ink" />
																	)}
																	{!isTeamSelected && (
																		<Circle className="size-5 text-muted-foreground" />
																	)}
																</span>
															</div>
														);
													})}
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
					className="w-full"
				>
					{t('common.CONTINUE')}
				</Button>
			</div>
		</form>
	);
}

export default AuthPasscode;
