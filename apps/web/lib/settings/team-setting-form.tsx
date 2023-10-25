import { useIsMemberManager, useOrganizationTeams } from '@app/hooks';
import { RoleNameEnum } from '@app/interfaces';
import { userState } from '@app/stores';
import { Button, ColorPicker, InputField, Text, Tooltip } from 'lib/components';
import { EmojiPicker } from 'lib/components/emoji-picker';
import { Edit2Icon, TickSquareIcon } from 'lib/components/svgs';
import TimeTrackingToggle from 'lib/components/switch';
import debounce from 'lodash/debounce';
import isEqual from 'lodash/isEqual';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useRecoilState } from 'recoil';
import TeamSize from './team-size-popover';

export const TeamSettingForm = () => {
	const [user] = useRecoilState(userState);
	const { register, setValue, handleSubmit, getValues } = useForm();
	const { t } = useTranslation();
	const { activeTeam, editOrganizationTeam, loading, loadingTeam } = useOrganizationTeams();
	const { isTeamManager, activeManager } = useIsMemberManager(user);
	const [copied, setCopied] = useState<boolean>(false);
	const [disabled, setDisabled] = useState<boolean>(true);
	const inputWrapperRef = useRef<HTMLDivElement>(null);

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
			if (activeTeam) {
				editOrganizationTeam({
					...activeTeam,
					id: activeTeam?.id,
					name: values.teamName,
					organizationId: activeTeam.organizationId,
					tenantId: activeTeam.tenantId,
					public: values.teamType === 'PUBLIC' ? true : false,
					color: values.color,
					emoji: values.emoji,
					teamSize: values.teamSize,
					memberIds: activeTeam.members
						.map((t) => t.employee.id)
						.filter((value, index, array) => array.indexOf(value) === index), // To make the array Unique list of ids
					managerIds: activeTeam.members
						.filter(
							(m) =>
								m.role &&
								(m.role.name === RoleNameEnum.MANAGER ||
									m.role.name === RoleNameEnum.SUPER_ADMIN ||
									m.role.name === RoleNameEnum.ADMIN)
						)
						.map((t) => t.employee.id)
						.filter((value, index, array) => array.indexOf(value) === index) // To make the array Unique list of ids
				});
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
			return `${window.location.origin}/team/${activeTeam.id}/${activeTeam.profile_link}`;
		}
		return '';
	}, [activeTeam]);

	const handleChange = useCallback(() => {
		const latestFormData = getValues();
		onSubmit({
			...latestFormData
		});
	}, [onSubmit, getValues]);

	/* eslint-disable react-hooks/exhaustive-deps */
	const debounceHandleColorChange = useCallback(debounce(handleChange, 1000), [handleChange, debounce]);

	return (
		<>
			<form className="w-[98%] md:w-[930px] mt-8" onSubmit={handleSubmit(onSubmit)} autoComplete="off">
				<div className="flex flex-col items-center justify-between">
					<div className="w-full mt-5">
						<div className="">
							{/* Team Name */}
							<div className="flex flex-col items-center justify-between w-full sm:gap-12 sm:flex-row">
								<Text className="flex-none flex-grow-0 mb-2 text-lg font-normal text-gray-400 sm:w-1/5">
									{t('pages.settingsTeam.TEAM_NAME')}
								</Text>
								<div
									ref={inputWrapperRef}
									className="flex flex-row items-center justify-between flex-grow-0 w-4/5"
								>
									<InputField
										autoCustomFocus={!disabled}
										type="text"
										placeholder={t('pages.settingsTeam.TEAM_NAME')}
										{...register('teamName', { required: true, maxLength: 80 })}
										className={`${disabled ? 'disabled:bg-[#FCFCFC]' : ''}`}
										trailingNode={
											isTeamManager ? (
												disabled ? (
													<Button
														variant="ghost"
														className="p-0 m-0 mr-[0.5rem] min-w-0 outline-none"
														disabled={!isTeamManager}
														onClick={() => setDisabled(false)}
													>
														<Edit2Icon />
													</Button>
												) : (
													<Button
														variant="ghost"
														className="p-0 m-0 mr-[0.8rem] mb-[0.2rem] min-w-0 outline-none"
														type="submit"
														disabled={!isTeamManager}
														onClick={() => setDisabled(true)}
													>
														<TickSquareIcon />
													</Button>
												)
											) : (
												<></>
											)
										}
										disabled={disabled}
										wrapperClassName={`rounded-lg bg-light--theme-light dark:bg-dark--theme-light`}
									/>
								</div>
							</div>

							{/* Team Color */}
							<div className="z-50 flex items-center justify-between w-full gap-12 ">
								<Text className="flex-none flex-grow-0 w-1/5 mb-2 text-lg font-normal text-gray-400">
									{t('pages.settingsTeam.TEAM_COLOR')}
								</Text>
								<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
									<ColorPicker
										defaultColor={activeTeam?.color}
										onChange={(color: any | null) => {
											setValue('color', color);
											debounceHandleColorChange();
										}}
										isTeamManager={isTeamManager}
										disabled={!isTeamManager}
										fullWidthInput
									/>
								</div>
							</div>

							{/* Emoji */}
							<div className="flex items-center justify-between w-full gap-12 ">
								<Text className="flex-none flex-grow-0 w-1/5 mb-2 text-lg font-normal text-gray-400">
									{t('pages.settingsTeam.EMOJI')}
								</Text>
								<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
									<EmojiPicker
										onChange={(emoji: string) => {
											setValue('emoji', emoji);
											handleChange();
										}}
										emoji={activeTeam?.emoji || null}
										isTeamManager={isTeamManager}
										disabled={!isTeamManager}
									/>
								</div>
							</div>

							{/* Team Size */}
							{
								<div className="flex items-center justify-between w-full gap-12 mt-3 ">
									<Text className="flex-none flex-grow-0 w-1/5 mb-2 text-lg font-normal text-gray-400">
										{t('pages.settingsTeam.TEAM_SIZE')}
									</Text>
									<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
										<TeamSize
											defaultValue={activeTeam?.teamSize || ''}
											onChange={(teamSize: string) => {
												setValue('teamSize', teamSize);
												handleChange();
											}}
											isTeamManager={isTeamManager}
											disabled={!isTeamManager}
										/>
									</div>
								</div>
							}

							{/* Team Type */}
							<div className="flex flex-col items-center w-full mt-8 sm:gap-12 sm:flex-row">
								<Text className="flex-none flex-grow-0 mb-2 text-lg font-normal text-gray-400 sm:w-1/5">
									{t('pages.settingsTeam.TEAM_TYPE')}
								</Text>
								<div className="flex gap-x-[30px] flex-col sm:flex-row items-center">
									{isTeamManager && (
										<div className="flex items-center justify-between w-full space-y-2 sm:block">
											<div className="flex items-center mb-[0.125rem] min-h-[1.5rem] pl-[1.5rem]">
												<input
													id="team-type-radio-public"
													className="relative float-left -ml-[1.5rem] mr-1 mt-0.5 h-5 w-5 appearance-none rounded-full border-2 border-solid border-neutral-300 before:pointer-events-none before:absolute before:h-4 before:w-4 before:scale-0 before:rounded-full before:bg-transparent before:opacity-0 before:shadow-[0px_0px_0px_13px_transparent] before:content-[''] after:absolute after:z-[1] after:block after:h-4 after:w-4 after:rounded-full after:content-[''] checked:border-primary checked:before:opacity-[0.16] checked:after:absolute checked:after:left-1/2 checked:after:top-1/2 checked:after:h-[0.625rem] checked:after:w-[0.625rem] checked:after:rounded-full checked:after:border-primary checked:dark:after:border-primary-xlight checked:after:bg-primary checked:dark:after:bg-primary-xlight checked:after:content-[''] checked:after:[transform:translate(-50%,-50%)] hover:cursor-pointer hover:before:opacity-[0.04] hover:before:shadow-[0px_0px_0px_13px_rgba(0,0,0,0.6)] focus:shadow-none focus:outline-none focus:ring-0 focus:before:scale-100 focus:before:opacity-[0.12] focus:before:shadow-[0px_0px_0px_13px_rgba(0,0,0,0.6)] focus:before:transition-[box-shadow_0.2s,transform_0.2s] checked:focus:border-primary checked:dark:focus:border-primary-xlight checked:focus:before:scale-100 checked:focus:before:shadow-[0px_0px_0px_13px_#3b71ca] checked:focus:before:transition-[box-shadow_0.2s,transform_0.2s] dark:border-neutral-600 dark:checked:border-primary-xlight dark:checked:after:border-primary-xlight dark:checked:after:bg-primary-xlight dark:focus:before:shadow-[0px_0px_0px_13px_rgba(255,255,255,0.4)] dark:checked:focus:border-primary-xlight dark:checked:focus:before:shadow-[0px_0px_0px_13px_#3b71ca]"
													type="radio"
													{...register('teamType', {
														onChange: () => {
															handleChange();
														}
													})}
													value="PUBLIC"
													disabled={!isTeamManager}
												/>

												<Text.Label
													className="mt-px inline-block pl-[0.15rem] hover:cursor-pointer"
													htmlFor="team-type-radio-public"
												>
													{t('team.PUBLIC_TEAM')}
												</Text.Label>
											</div>
											<div className="flex items-center mb-[0.125rem] min-h-[1.5rem] pl-[1.5rem]">
												<input
													id="team-type-radio-private"
													className="relative float-left -ml-[1.5rem] mr-1 mt-0.5 h-5 w-5 appearance-none rounded-full border-2 border-solid border-neutral-300 before:pointer-events-none before:absolute before:h-4 before:w-4 before:scale-0 before:rounded-full before:bg-transparent before:opacity-0 before:shadow-[0px_0px_0px_13px_transparent] before:content-[''] after:absolute after:z-[1] after:block after:h-4 after:w-4 after:rounded-full after:content-[''] checked:border-primary checked:before:opacity-[0.16] checked:after:absolute checked:after:left-1/2 checked:after:top-1/2 checked:after:h-[0.625rem] checked:after:w-[0.625rem] checked:after:rounded-full checked:after:border-primary checked:dark:after:border-primary-xlight checked:after:bg-primary checked:dark:after:bg-primary-xlight checked:after:content-[''] checked:after:[transform:translate(-50%,-50%)] hover:cursor-pointer hover:before:opacity-[0.04] hover:before:shadow-[0px_0px_0px_13px_rgba(0,0,0,0.6)] focus:shadow-none focus:outline-none focus:ring-0 focus:before:scale-100 focus:before:opacity-[0.12] focus:before:shadow-[0px_0px_0px_13px_rgba(0,0,0,0.6)] focus:before:transition-[box-shadow_0.2s,transform_0.2s] checked:focus:border-primary checked:dark:focus:border-primary-xlight checked:focus:before:scale-100 checked:focus:before:shadow-[0px_0px_0px_13px_#3b71ca] checked:focus:before:transition-[box-shadow_0.2s,transform_0.2s] dark:border-neutral-600 dark:checked:border-primary-xlight dark:checked:after:border-primary-xlight dark:checked:after:bg-primary-xlight dark:focus:before:shadow-[0px_0px_0px_13px_rgba(255,255,255,0.4)] dark:checked:focus:border-primary-xlight dark:checked:focus:before:shadow-[0px_0px_0px_13px_#3b71ca]"
													type="radio"
													{...register('teamType', {
														onChange: () => {
															handleChange();
														}
													})}
													value="PRIVATE"
													disabled={!isTeamManager}
												/>
												<Text.Label
													className="mt-px inline-block pl-[0.15rem] hover:cursor-pointer"
													htmlFor="team-type-radio-private"
												>
													{t('team.PRIVATE_TEAM')}
												</Text.Label>
											</div>
										</div>
									)}
									{getTeamLink() && (
										<div className="flex flex-col items-center gap-4 sm:flex-row">
											<div className="flex flex-row items-center justify-between flex-grow-0 w-64 mb-0">
												<Tooltip
													label={getTeamLink()}
													placement="auto"
													enabled
													className="w-full"
												>
													<InputField
														type="text"
														placeholder={getTeamLink()}
														className="mb-0 h-[54px]"
														wrapperClassName="mb-0 h-[54px] rounded-lg"
														disabled={true}
													/>
												</Tooltip>
											</div>
											<div className="flex flex-row items-center justify-between flex-grow-0 sm:w-1/5">
												<Button
													variant="outline"
													className="border-2 rounded-xl h-[54px] min-w-[105px] font-[600] text-[14px]"
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
										</div>
									)}
								</div>
							</div>

							{/* Time Tracking */}
							{isTeamManager ? (
								<div className="flex items-center justify-between w-full gap-12 mt-8">
									<Text className="flex-none flex-grow-0 text-lg font-normal text-gray-400 md-2 sm:w-1/5">
										{t('pages.settingsTeam.TIME_TRACKING')}
									</Text>
									<div className="flex flex-row items-center justify-between flex-grow-0 w-4/5">
										<TimeTrackingToggle activeManager={activeManager} />
									</div>
								</div>
							) : (
								<></>
							)}
						</div>
					</div>
				</div>
			</form>
		</>
	);
};
