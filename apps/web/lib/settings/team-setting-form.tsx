import { Button, ColorPicker, InputField, Text, Tooltip } from 'lib/components';
import { useForm } from 'react-hook-form';
import { useCallback, useEffect, useRef, useState } from 'react';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import { Edit2Icon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import TimeTrackingToggle from 'lib/components/switch';
import { useIsMemberManager, useOrganizationTeams } from '@app/hooks';
import isEqual from 'lodash/isEqual';
import TeamSize from './team-size-popover';
import { EmojiPicker } from 'lib/components/emoji-picker';
import debounce from 'lodash/debounce';
import { RoleNameEnum } from '@app/interfaces';

interface disableState {
	teamNameDisabled: boolean;
	teamColorDisabled: boolean;
	teamEmojiDisabled: boolean;
	teamSizeDisabled: boolean;
}

export const TeamSettingForm = () => {
	const [user] = useRecoilState(userState);
	const { register, setValue, handleSubmit, getValues } = useForm();
	const { trans } = useTranslation('settingsTeam');
	const { activeTeam, editOrganizationTeam, loading, loadingTeam } =
		useOrganizationTeams();
	const { isTeamManager, activeManager } = useIsMemberManager(user);
	const [copied, setCopied] = useState(false);
	const [disabled, setDisabled] = useState<disableState>({
		teamNameDisabled: true,
		teamColorDisabled: true,
		teamEmojiDisabled: true,
		teamSizeDisabled: true,
	});

	const handleDisable = (elToDisable: keyof disableState) => {
		if (!isTeamManager) {
			setDisabled({
				teamNameDisabled: false,
				teamColorDisabled: false,
				teamEmojiDisabled: false,
				teamSizeDisabled: false,
			});
		} else {
			setDisabled((prev) => ({
				...prev,
				[elToDisable]: !prev[elToDisable],
			}));
		}
	};

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
		teamSize: null,
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
					teamSize: activeTeam.teamSize,
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
					teamSize: activeTeam?.teamSize,
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
						.filter((value, index, array) => array.indexOf(value) === index), // To make the array Unique list of ids
				});
			}
		},
		[editOrganizationTeam, activeTeam]
	);

	const getTeamLink = useCallback(() => {
		if (
			typeof window !== 'undefined' &&
			activeTeam &&
			activeTeam.id &&
			activeTeam.profile_link
		) {
			return `${window.location.origin}/team/${activeTeam.id}/${activeTeam.profile_link}`;
		}
		return '';
	}, [activeTeam]);

	const handleChange = useCallback(() => {
		const latestFormData = getValues();
		onSubmit({
			...latestFormData,
		});
	}, [onSubmit, getValues]);

	/* eslint-disable react-hooks/exhaustive-deps */
	const debounceHandleColorChange = useCallback(debounce(handleChange, 1000), [
		handleChange,
		debounce,
	]);

	return (
		<>
			<form
				className="w-[98%] md:w-[930px] mt-8"
				onSubmit={handleSubmit(onSubmit)}
				autoComplete="off"
			>
				<div className="flex flex-col justify-between items-center">
					<div className="w-full mt-5">
						<div className="">
							{/* Team Name */}
							<div className="flex w-full items-center justify-between sm:gap-12 flex-col sm:flex-row">
								<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 sm:w-1/5">
									{trans.TEAM_NAME}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
									<InputField
										type="text"
										placeholder={trans.TEAM_NAME}
										{...register('teamName', { required: true, maxLength: 80 })}
										className={`${
											disabled.teamNameDisabled ? 'disabled:bg-[#FCFCFC]' : ''
										}`}
										trailingNode={
											<Button
												variant="ghost"
												className="p-0 m-0 mr-[0.5rem] min-w-0"
												type="submit"
												disabled={!isTeamManager}
												onClick={() => handleDisable('teamNameDisabled')}
											>
												<Edit2Icon />
											</Button>
										}
										disabled={disabled.teamNameDisabled}
										wrapperClassName={`rounded-lg`}
									/>
								</div>
							</div>

							{/* Team Color */}
							<div className=" flex w-full items-center justify-between gap-12 z-50">
								<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-1/5">
									{trans.TEAM_COLOR}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
									<ColorPicker
										defaultColor={activeTeam?.color}
										onChange={(color: any | null) => {
											setValue('color', color);
											debounceHandleColorChange();
										}}
										isTeamManager={isTeamManager}
										fullWidthInput
									/>
								</div>
							</div>

							{/* Emoji */}
							<div className=" flex w-full items-center justify-between gap-12">
								<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-1/5">
									{trans.EMOJI}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
									<EmojiPicker
										onChange={(emoji: string) => {
											setValue('emoji', emoji);
											handleChange();
										}}
										emoji={activeTeam?.emoji || null}
										isTeamManager={isTeamManager}
									/>
								</div>
							</div>

							{/* Team Size */}
							{
								<div className=" flex w-full items-center justify-between gap-12 mt-3">
									<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 w-1/5">
										{trans.TEAM_SIZE}
									</Text>
									<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
										<TeamSize
											defaultValue={activeTeam?.teamSize || ''}
											onChange={(teamSize: string) => {
												setValue('teamSize', teamSize);
												handleChange();
											}}
											isTeamManager={isTeamManager}
										/>
									</div>
								</div>
							}

							{/* Team Type */}
							<div className="flex w-full items-center sm:gap-12 mt-8 flex-col sm:flex-row">
								<Text className="flex-none flex-grow-0 text-gray-400 text-lg font-normal mb-2 sm:w-1/5">
									{trans.TEAM_TYPE}
								</Text>
								<div className="flex gap-x-[30px] flex-col sm:flex-row ">
									<div className="items-center w-full flex justify-between sm:block">
										<div>
											<input
												id="team-type-radio-public"
												{...register('teamType', {
													onChange: () => {
														handleChange();
													},
												})}
												type="radio"
												value="PUBLIC"
												className="w-4 h-4 text-[#3826A6] bg-gray-100 border-gray-300 focus:ring-[#3826A6] dark:focus:ring-[#3826A6] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
												disabled={!isTeamManager}
											/>
											<Text.Label>Public Team</Text.Label>
										</div>
										<div>
											<input
												id="team-type-radio-private"
												{...register('teamType', {
													onChange: () => {
														handleChange();
													},
												})}
												type="radio"
												value="PRIVATE"
												className="w-4 h-4 text-[#3826A6] bg-gray-100 border-gray-300 focus:ring-[#3826A6] dark:focus:ring-[#3826A6] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
												disabled={!isTeamManager}
											/>
											<Text.Label>Private Team</Text.Label>
										</div>
									</div>
									{getTeamLink() && (
										<div className="flex gap-4 items-center flex-col sm:flex-row">
											<div className="flex flex-row flex-grow-0 items-center justify-between w-64 mb-0">
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
											<div className="flex flex-row flex-grow-0 items-center justify-between sm:w-1/5">
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
								<div className="flex w-full items-center justify-between gap-12 mt-8">
									<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 sm:w-1/5">
										{trans.TIME_TRACKING}
									</Text>
									<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
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
