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
import { TranslationHooks, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { useAtom, useSetAtom } from 'jotai';
import { useParams } from 'next/navigation';
import { CheckSquareOutlineIcon } from 'assets/svg';
import { Pencil, Spinner } from '@/core/components/icons';
import TeamSize from '@/core/components/teams/team-size-popover';
import { InputField } from '@/core/components/duplicated-components/_input';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { toast } from 'sonner';
import { TOrganizationTeam, TOrganizationTeamUpdate } from '@/core/types/schemas';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { cn } from '@/core/lib/helpers';
import { errorReasonKeyOf } from '@/core/lib/utils/error-feedback';
import {
	SETTINGS_CONTROL_CLASS,
	SETTINGS_LABEL_CLASS,
	SETTINGS_ROW_CLASS,
	SETTINGS_ROWS_CLASS
} from '../settings-section';

// The colour, emoji and size pickers draw their own 48px box with outer margins; this sizes them like
// every other control of the block without touching the shared picker components.
const PICKER = 'w-full max-w-md [&>div]:mt-0 [&>div>div]:mb-0 [&_.input-border]:h-9 [&_.input-border]:rounded-md';
const ICON_BUTTON = 'mr-1 shrink-0 text-muted-foreground';
const TEAM_NAME_INVALID_TOAST_ID = 'team-name-invalid';

function copyLinkLabel(copied: boolean, t: TranslationHooks) {
	if (copied) {
		return t('common.COPIED');
	}
	return t('common.COPY_LINK');
}

export const TeamSettingForm = () => {
	const { data: user } = useUserQuery();
	const { register, setValue, handleSubmit, getValues, trigger } = useForm();
	const t = useTranslations();
	const queryClient = useQueryClient();

	const [activeTeam, setActiveTeam] = useAtom(activeTeamState);
	const setTeams = useSetAtom(organizationTeamsState);
	const { getOrganizationTeamsLoading: loading, loadingTeam } = useOrganizationTeamsQuery();
	// Every save below shows its own error toast
	const { editOrganizationTeam, editOrganizationTeamLoading } = useEditOrganizationTeam({ toastOnError: false });
	const { isTeamManager, activeManager } = useIsMemberManager(user);
	const [copied, setCopied] = useState<boolean>(false);
	const [disabled, setDisabled] = useState<boolean>(true);
	const inputWrapperRef = useRef<HTMLDivElement>(null);

	const showSaveError = useCallback(
		(titleKey: DottedLanguageObjectStringPaths, error: unknown) => {
			const reasonKey = errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
			toast.error(t(titleKey), { description: t(reasonKey) });
		},
		[t]
	);

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
				showSaveError('toasts.teams.UPDATE_FAILED', undefined);
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
			} catch (error) {
				console.error('Team update failed:', error);
				showSaveError('toasts.teams.UPDATE_FAILED', error);
			}
		},
		[editOrganizationTeam, activeTeam, showSaveError]
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
		} catch (error) {
			console.error('Team size update failed:', error);
			showSaveError('toasts.teams.SIZE_NOT_SAVED', error);
		}
	}, [editOrganizationTeam, activeTeam?.id, getValues, showSaveError]);

	const handleTeamNameUpdate = useCallback(async () => {
		try {
			await editOrganizationTeam({
				id: activeTeam?.id,
				name: getValues('teamName')
			});
		} catch (error) {
			console.error('Team name update failed:', error);
			showSaveError('toasts.teams.NAME_NOT_SAVED', error);
		}
	}, [editOrganizationTeam, activeTeam?.id, getValues, showSaveError]);

	const handleTeamColorUpdate = useCallback(async () => {
		try {
			await editOrganizationTeam({
				id: activeTeam?.id,
				color: getValues('color')
			});
		} catch (error) {
			console.error('Team color update failed:', error);
			showSaveError('toasts.teams.COLOR_NOT_SAVED', error);
		}
	}, [editOrganizationTeam, activeTeam?.id, getValues, showSaveError]);

	const handleTeamEmojiUpdate = useCallback(async () => {
		try {
			await editOrganizationTeam({
				id: activeTeam?.id,
				emoji: getValues('emoji')
			});
		} catch (error) {
			console.error('Team emoji update failed:', error);
			showSaveError('toasts.teams.EMOJI_NOT_SAVED', error);
		}
	}, [editOrganizationTeam, activeTeam?.id, getValues, showSaveError]);

	// Sends only `public`: onSubmit builds memberIds from team-employee row ids, which Gauzy would treat as removals
	const handleTeamTypeUpdate = useCallback(
		async (teamType: string) => {
			try {
				await editOrganizationTeam({
					id: activeTeam?.id,
					public: teamType === 'PUBLIC'
				});
			} catch (error) {
				console.error('Team type update failed:', error);
				// Put the radio back on the last synced value of the team on screen, which can differ from the
				// one this request targeted if the active team switched. Then refetch: the PUT may have landed
				// even though the read that follows it failed.
				setValue('teamType', formDetails.current.teamType);
				queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
				showSaveError('toasts.teams.TYPE_NOT_SAVED', error);
			}
		},
		[editOrganizationTeam, activeTeam?.id, setValue, queryClient, showSaveError]
	);

	const teamLink = getTeamLink();
	const showsEditNameButton = isTeamManager && disabled;
	const showsSaveNameButton = isTeamManager && !disabled;
	const teamNameTrailingNode = (
		<>
			{showsEditNameButton && (
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={ICON_BUTTON}
					disabled={!isTeamManager}
					onClick={() => {
						setDisabled(false);
					}}
				>
					<Pencil className="size-4" />
				</Button>
			)}
			{showsSaveNameButton && (
				<Button
					variant="ghost"
					size="icon"
					className={ICON_BUTTON}
					type="button"
					disabled={editOrganizationTeamLoading}
					onClick={async () => {
						const isValid = await trigger('teamName');
						if (!isValid) {
							toast.warning(t('toasts.teams.NAME_INVALID'), { id: TEAM_NAME_INVALID_TOAST_ID });
							return;
						}
						await handleTeamNameUpdate();
						setDisabled(true);
					}}
				>
					{editOrganizationTeamLoading && <Spinner className="size-4 animate-spin" />}
					{!editOrganizationTeamLoading && <CheckSquareOutlineIcon className="size-4" strokeWidth="1.4" />}
				</Button>
			)}
		</>
	);

	return (
		<>
			<form className={cn('w-full', SETTINGS_ROWS_CLASS)} onSubmit={handleSubmit(onSubmit)} autoComplete="off">
				<div className={SETTINGS_ROW_CLASS}>
					<Text className={SETTINGS_LABEL_CLASS}>{t('pages.settingsTeam.TEAM_NAME')}</Text>
					<div ref={inputWrapperRef} className={SETTINGS_CONTROL_CLASS}>
						<InputField
							autoCustomFocus={!disabled}
							type="text"
							placeholder={t('pages.settingsTeam.TEAM_NAME')}
							{...register('teamName', {
								required: true,
								maxLength: 80
							})}
							className="disabled:bg-foreground/[0.03]"
							trailingNode={teamNameTrailingNode}
							disabled={disabled}
							wrapperClassName="mb-0 max-w-md"
						/>
					</div>
				</div>

				<div className={SETTINGS_ROW_CLASS}>
					<Text className={SETTINGS_LABEL_CLASS}>{t('pages.settingsTeam.TEAM_COLOR')}</Text>
					<div className={cn(SETTINGS_CONTROL_CLASS, 'z-10')}>
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

				<div className={SETTINGS_ROW_CLASS}>
					<Text className={SETTINGS_LABEL_CLASS}>{t('pages.settingsTeam.EMOJI')}</Text>
					<div className={SETTINGS_CONTROL_CLASS}>
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

				<div className={SETTINGS_ROW_CLASS}>
					<Text className={SETTINGS_LABEL_CLASS}>{t('pages.settingsTeam.TEAM_SIZE')}</Text>
					<div className={SETTINGS_CONTROL_CLASS}>
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

				<div className={SETTINGS_ROW_CLASS}>
					<Text className={SETTINGS_LABEL_CLASS}>{t('pages.settingsTeam.TEAM_TYPE')}</Text>
					<div className={cn(SETTINGS_CONTROL_CLASS, 'gap-x-4')}>
						{isTeamManager && (
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
								<div className="flex items-center gap-2">
									<input
										id="team-type-radio-public"
										className="size-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
										type="radio"
										{...register('teamType', {
											onChange: (event) => handleTeamTypeUpdate(event.target.value)
										})}
										value="PUBLIC"
										disabled={!isTeamManager || editOrganizationTeamLoading}
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
										{...register('teamType', {
											onChange: (event) => handleTeamTypeUpdate(event.target.value)
										})}
										value="PRIVATE"
										disabled={!isTeamManager || editOrganizationTeamLoading}
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
						{teamLink && (
							<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
								<Tooltip
									label={teamLink}
									placement="auto"
									enabled
									className="min-w-0 flex-1 sm:max-w-xs"
								>
									<InputField
										type="text"
										placeholder={teamLink}
										className="mb-0 h-9"
										wrapperClassName="mb-0"
										disabled={true}
									/>
								</Tooltip>
								<Button
									variant="outline"
									className="shrink-0"
									type="button"
									onClick={() => {
										navigator.clipboard.writeText(getTeamLink());
										setCopied(true);
										setTimeout(() => {
											setCopied(false);
										}, 1000 * 10 /** 10 Seconds */);
									}}
								>
									{copyLinkLabel(copied, t)}
								</Button>
							</div>
						)}
					</div>
				</div>

				{isTeamManager && (
					<>
						<div className={SETTINGS_ROW_CLASS}>
							<Text className={SETTINGS_LABEL_CLASS}>{t('pages.settingsTeam.TIME_TRACKING')}</Text>
							<div className={SETTINGS_CONTROL_CLASS}>
								<TimeTrackingToggle activeManager={activeManager as any} />
							</div>
						</div>
						<div className={SETTINGS_ROW_CLASS}>
							<Text className={SETTINGS_LABEL_CLASS}>
								{t('pages.settingsTeam.SHARE_MEMBERS_PROFILE_VIEWS')}
							</Text>
							<div className={SETTINGS_CONTROL_CLASS}>
								<ShareProfileViewsToggle />
							</div>
						</div>
						<div className={SETTINGS_ROW_CLASS}>
							<Text className={SETTINGS_LABEL_CLASS}>{t('pages.settingsTeam.ENFORCE_PLAN')}</Text>
							<div className={SETTINGS_CONTROL_CLASS}>
								<RequireDailyPlanToTrack />
							</div>
						</div>
					</>
				)}
			</form>
		</>
	);
};
