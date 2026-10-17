import { useIsMemberManager, useOrganizationTeamsQuery, useEditOrganizationTeam } from '@/core/hooks';
import { ERoleName } from '@/core/types/generics/enums/role';
import { activeTeamState, organizationTeamsState } from '@/core/stores';
import { Button, ColorPicker, Text } from '@/core/components';
import { EmojiPicker } from '@/core/components/common/emoji-picker';
import TimeTrackingToggle, { RequireDailyPlanToTrack, ShareProfileViewsToggle } from '@/core/components/common/switch';
import debounce from 'lodash/debounce';
import isEqual from 'lodash/isEqual';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useAtom, useSetAtom } from 'jotai';
import { useParams } from 'next/navigation';
import { CheckSquareOutlineIcon, EditPenUnderlineIcon } from 'assets/svg';
import TeamSize from '@/core/components/teams/team-size-popover';
import { InputField } from '@/core/components/duplicated-components/_input';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { toast } from 'sonner';
import { TOrganizationTeam, TOrganizationTeamUpdate } from '@/core/types/schemas';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { LoaderCircle } from 'lucide-react';

// Settings row: label column on the left, control on the right (see the settings design contract).
const ROW =
	'grid grid-cols-1 gap-2 border-t border-border py-3 first:border-t-0 first:pt-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center sm:gap-4';
const LABEL = 'text-sm font-medium text-muted-foreground';
const CONTROL = 'flex min-w-0 flex-wrap items-center gap-2 text-sm text-foreground';
// The colour, emoji and size pickers draw their own 48px box with outer margins; this sizes them like
// every other control of the block without touching the shared picker components.
const PICKER =
	'w-full max-w-md [&>div]:mt-0 [&>div>div]:mb-0 [&_.input-border]:h-9 [&_.input-border]:rounded-md';
const ICON_BUTTON =
	'mr-1 size-8 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground outline-none hover:bg-muted hover:text-foreground';

export const TeamSettingForm = () => {
	const { data: user } = useUserQuery();
	const { register, setValue, handleSubmit, getValues, trigger } = useForm();
	const t = useTranslations();

	const [activeTeam, setActiveTeam] = useAtom(activeTeamState);
	const setTeams = useSetAtom(organizationTeamsState);
	const { getOrganizationTeamsLoading: loading, loadingTeam } = useOrganizationTeamsQuery();
	const { editOrganizationTeam, editOrganizationTeamLoading } = useEditOrganizationTeam();
	const { isTeamManager, activeManager } = useIsMemberManager(user);
	const [copied, setCopied] = useState<boolean>(false);
	const [disabled, setDisabled] = useState<boolean>(true);
	const inputWrapperRef = useRef<HTMLDivElement>(null);

	const params = useParams();
	const locale = useMemo(() => {
		return params?.locale || '';
	}, [params]);

	const formDetails = useRef<{
		teamName: string;
		teamType: 'PUBLIC' | 'PRIVATE';
		timeTracking: boolean;
		color?: string | null;
		emoji?: string | null;
		teamSize?: string | null;
	}>({
		teamName: '',
		teamType: 'PUBLIC',
		timeTracking: false,
		color: null,
		emoji: null,
		teamSize: null
	});

	useEffect(() => {
		if (activeTeam && !loading && !loadingTeam) {
			/**
			 * Check deep equality,
			 * No need to update form values if all details are same from API, to avoid re-render
			 */
			if (
				!isEqual(formDetails.current, {
					teamName: activeTeam?.name || '',
					teamType: activeTeam?.public ? 'PUBLIC' : 'PRIVATE',
					timeTracking: activeManager?.isTrackingEnabled || false,
					color: activeTeam.color,
					emoji: activeTeam.emoji,
					teamSize: activeTeam.teamSize
				})
			) {
				setValue('teamName', activeTeam?.name || '');
				setValue('teamType', activeTeam?.public ? 'PUBLIC' : 'PRIVATE');
				setValue('timeTracking', activeManager?.isTrackingEnabled || false);

				setValue('color', activeTeam?.color || null);
				setValue('emoji', activeTeam?.emoji || null);
				setValue('teamSize', activeTeam?.teamSize || null);

				formDetails.current = {
					teamName: activeTeam?.name || '',
					teamType: activeTeam?.public ? 'PUBLIC' : 'PRIVATE',
					timeTracking: activeManager?.isTrackingEnabled || false,
					color: activeTeam?.color,
					emoji: activeTeam?.emoji,
					teamSize: activeTeam?.teamSize
				};
			}
		}
	}, [user, setValue, activeTeam, activeManager, loading, loadingTeam]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (!activeTeam) {
				toast.error('No active team found');
				return;
			}

			try {
				const inputData: Partial<TOrganizationTeamUpdate> = {
					...activeTeam,
					id: activeTeam?.id,
					name: values.teamName,
					organizationId: activeTeam.organizationId,
					tenantId: activeTeam.tenantId,
					public: values.teamType === 'PUBLIC' ? true : false,
					color: values.color || null,
					emoji: values.emoji || null,
					shareProfileView: activeTeam.shareProfileView,
					teamSize: values.teamSize || null,
					memberIds: activeTeam.members
						?.map((t) => t.id)
						.filter((value: string, index: number, array: string[]) => array.indexOf(value) === index), // To make the array Unique list of ids
					managerIds: activeTeam.members
						?.filter(
							(m) =>
								m.role &&
								(m.role.name === ERoleName.MANAGER ||
									m.role.name === ERoleName.SUPER_ADMIN ||
									m.role.name === ERoleName.ADMIN)
						)
						.map((t) => t.id)
						.filter((value: string, index: number, array: string[]) => array.indexOf(value) === index) // To make the array Unique list of ids
				};
				await editOrganizationTeam(inputData);

				// Create the updated team object once to avoid inconsistencies
				const updatedTeam = { ...activeTeam, ...inputData } as TOrganizationTeam;

				// Update both states with the same data to ensure consistency
				setActiveTeam(updatedTeam);
				setTeams((prev) => prev.map((team) => (team.id === activeTeam?.id ? updatedTeam : team)));

				toast.success('Team updated successfully');
			} catch (error) {
				console.error('Team update failed:', error);
				toast.error('Failed to update team. Please try again.');
			}
		},
		[editOrganizationTeam, activeTeam]
	);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (inputWrapperRef.current && !inputWrapperRef.current.contains(event.target as Node)) {
				setDisabled(true);
			}
		};

		const handleKeyPress = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setDisabled(true);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		document.addEventListener('keydown', handleKeyPress);

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
			document.removeEventListener('keydown', handleKeyPress);
		};
	}, []);

	const getTeamLink = useCallback(() => {
		if (typeof window !== 'undefined' && activeTeam && activeTeam.id && activeTeam.profile_link) {
			return `${window.location.origin}${locale ? '/' + locale : ''}/team/${
				activeTeam.id
			}/${activeTeam.profile_link}`;
		}
		return '';
	}, [activeTeam, locale]);

	// Removed problematic handleChange function that triggered API calls on every field change
	// Now using a debounced color update that only updates local state
	const debounceHandleColorChange = useCallback(
		debounce((color: string) => {
			setValue('color', color);
		}, 300),
		[setValue]
	);

	const handleTimeSizeUpdate = useCallback(async () => {
		try {
			await editOrganizationTeam({
				id: activeTeam?.id,
				teamSize: getValues('teamSize')
			});

			toast.success('Team size updated successfully');
		} catch (error) {
			console.error('Team size update failed:', error);
			toast.error('Failed to update team size. Please try again.');
		}
	}, [editOrganizationTeam, activeTeam?.id, getValues]);

	const handleTeamNameUpdate = useCallback(async () => {
		try {
			await editOrganizationTeam({
				id: activeTeam?.id,
				name: getValues('teamName')
			});

			toast.success('Team name updated successfully');
		} catch (error) {
			console.error('Team name update failed:', error);
			toast.error('Failed to update team name. Please try again.');
		}
	}, [editOrganizationTeam, activeTeam?.id, getValues]);

	const handleTeamColorUpdate = useCallback(async () => {
		try {
			await editOrganizationTeam({
				id: activeTeam?.id,
				color: getValues('color')
			});

			toast.success('Team color updated successfully');
		} catch (error) {
			console.error('Team color update failed:', error);
			toast.error('Failed to update team color. Please try again.');
		}
	}, [editOrganizationTeam, activeTeam?.id, getValues]);

	const handleTeamEmojiUpdate = useCallback(async () => {
		try {
			await editOrganizationTeam({
				id: activeTeam?.id,
				emoji: getValues('emoji')
			});

			toast.success('Team emoji updated successfully');
		} catch (error) {
			console.error('Team emoji update failed:', error);
			toast.error('Failed to update team emoji. Please try again.');
		}
	}, [editOrganizationTeam, activeTeam?.id, getValues]);

	return (
		<>
			<form className="mt-2 w-full" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
				{/* Team Name */}
				<div className={ROW}>
					<Text className={LABEL}>{t('pages.settingsTeam.TEAM_NAME')}</Text>
					<div ref={inputWrapperRef} className={CONTROL}>
						<InputField
							autoCustomFocus={!disabled}
							type="text"
							placeholder={t('pages.settingsTeam.TEAM_NAME')}
							{...register('teamName', {
								required: true,
								maxLength: 80
							})}
							className={`h-9 ${disabled ? 'disabled:bg-muted/40' : ''}`}
							trailingNode={
								isTeamManager ? (
									disabled ? (
										<Button
											type="button"
											variant="ghost"
											className={ICON_BUTTON}
											disabled={!isTeamManager}
											onClick={() => {
												setDisabled(false);
											}}
										>
											<EditPenUnderlineIcon className="size-4 text-inherit" />
										</Button>
									) : (
										<Button
											variant="ghost"
											className={ICON_BUTTON}
											type="button"
											disabled={editOrganizationTeamLoading}
											onClick={async () => {
												const isValid = await trigger('teamName');
												if (!isValid)
													return toast.error('Team name is required, max 80 characters');
												await handleTeamNameUpdate();
												setDisabled(true);
											}}
										>
											{editOrganizationTeamLoading ? (
												<LoaderCircle className="size-4 animate-spin" strokeWidth="1.4" />
											) : (
												<CheckSquareOutlineIcon className="size-4" strokeWidth="1.4" />
											)}
										</Button>
									)
								) : (
									<></>
								)
							}
							disabled={disabled}
							wrapperClassName="mb-0 max-w-md"
						/>
					</div>
				</div>

				{/* Team Color */}
				<div className={ROW}>
					<Text className={LABEL}>{t('pages.settingsTeam.TEAM_COLOR')}</Text>
					<div className={`${CONTROL} z-10`}>
						<div className={PICKER}>
							<ColorPicker
								onSave={handleTeamColorUpdate}
								defaultColor={activeTeam?.color || ''}
								onChange={(color: any | null) => {
									debounceHandleColorChange(color);
								}}
								isTeamManager={isTeamManager}
								disabled={!isTeamManager}
								fullWidthInput
							/>
						</div>
					</div>
				</div>

				{/* Emoji */}
				<div className={ROW}>
					<Text className={LABEL}>{t('pages.settingsTeam.EMOJI')}</Text>
					<div className={CONTROL}>
						<div className={PICKER}>
							<EmojiPicker
								onChange={(emoji: string) => {
									setValue('emoji', emoji);
								}}
								emoji={activeTeam?.emoji || null}
								isTeamManager={isTeamManager}
								disabled={!isTeamManager}
								onSave={handleTeamEmojiUpdate}
							/>
						</div>
					</div>
				</div>

				{/* Team Size */}
				<div className={ROW}>
					<Text className={LABEL}>{t('pages.settingsTeam.TEAM_SIZE')}</Text>
					<div className={CONTROL}>
						<div className={PICKER}>
							<TeamSize
								defaultValue={activeTeam?.teamSize || ''}
								onChange={(teamSize: string) => {
									setValue('teamSize', teamSize);
								}}
								isTeamManager={isTeamManager}
								disabled={!isTeamManager}
								onSave={handleTimeSizeUpdate}
							/>
						</div>
					</div>
				</div>

				{/* Team Type */}
				<div className={ROW}>
					<Text className={LABEL}>{t('pages.settingsTeam.TEAM_TYPE')}</Text>
					<div className={`${CONTROL} gap-x-4`}>
						{isTeamManager && (
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
								<div className="flex items-center gap-2">
									<input
										id="team-type-radio-public"
										className="size-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
										type="radio"
										{...register('teamType')}
										value="PUBLIC"
										disabled={!isTeamManager}
									/>

									<Text.Label
										className="ml-0 cursor-pointer whitespace-nowrap font-normal text-foreground dark:text-foreground"
										htmlFor="team-type-radio-public"
									>
										{t('team.PUBLIC_TEAM')}
									</Text.Label>
								</div>
								<div className="flex items-center gap-2">
									<input
										id="team-type-radio-private"
										className="size-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
										type="radio"
										{...register('teamType')}
										value="PRIVATE"
										disabled={!isTeamManager}
									/>
									<Text.Label
										className="ml-0 cursor-pointer whitespace-nowrap font-normal text-foreground dark:text-foreground"
										htmlFor="team-type-radio-private"
									>
										{t('team.PRIVATE_TEAM')}
									</Text.Label>
								</div>
							</div>
						)}
						{getTeamLink() && (
							<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
								<Tooltip label={getTeamLink()} placement="auto" enabled className="min-w-0 flex-1 sm:max-w-xs">
									<InputField
										type="text"
										placeholder={getTeamLink()}
										className="mb-0 h-9"
										wrapperClassName="mb-0"
										disabled={true}
									/>
								</Tooltip>
								<Button
									variant="outline-dark"
									className="h-9 shrink-0 rounded-md bg-card px-3 py-0 text-sm font-medium text-foreground hover:bg-muted"
									type="button"
									onClick={() => {
										navigator.clipboard.writeText(getTeamLink());
										setCopied(true);
										setTimeout(() => {
											setCopied(false);
										}, 1000 * 10 /** 10 Seconds */);
									}}
								>
									{!copied ? 'Copy Link' : 'Copied'}
								</Button>
							</div>
						)}
					</div>
				</div>

				{/* Time Tracking */}
				{isTeamManager ? (
					<>
						<div className={ROW}>
							<Text className={LABEL}>{t('pages.settingsTeam.TIME_TRACKING')}</Text>
							<div className={CONTROL}>
								<TimeTrackingToggle activeManager={activeManager as any} />
							</div>
						</div>
						<div className={ROW}>
							<Text className={LABEL}>{t('pages.settingsTeam.SHARE_MEMBERS_PROFILE_VIEWS')}</Text>
							<div className={CONTROL}>
								<ShareProfileViewsToggle />
							</div>
						</div>
						<div className={ROW}>
							<Text className={LABEL}>{t('pages.settingsTeam.ENFORCE_PLAN')}</Text>
							<div className={CONTROL}>
								<RequireDailyPlanToTrack />
							</div>
						</div>
					</>
				) : (
					<></>
				)}
			</form>
		</>
	);
};
