/* eslint-disable no-mixed-spaces-and-tabs */
import { Button, InputField, Text } from 'lib/components';
import { useForm } from 'react-hook-form';
import { useCallback, useEffect } from 'react';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';
import { Edit2Icon } from 'lib/components/svgs';
import { useTranslation } from 'lib/i18n';
import TimeTrackingToggle from 'lib/components/switch';
import { useOrganizationTeams } from '@app/hooks';

export const TeamSettingForm = () => {
	const [user] = useRecoilState(userState);
	const { register, setValue, handleSubmit, getValues } = useForm();
	const { trans } = useTranslation('settingsTeam');
	const { activeTeam, editOrganizationTeam } = useOrganizationTeams();

	useEffect(() => {
		setValue('teamName', activeTeam?.name || '');
		setValue('teamType', activeTeam?.public || false);
		setValue('teamLink', '');
	}, [user, setValue, activeTeam]);

	const onSubmit = useCallback(
		async (values: any) => {
			if (activeTeam) {
				editOrganizationTeam({
					id: activeTeam?.id,
					name: values.teamName,
					organizationId: activeTeam.organizationId,
					tenantId: activeTeam.tenantId,
					public: values.teamType,
				});
			}
		},
		[editOrganizationTeam, activeTeam]
	);

	return (
		<>
			<form
				className="w-[98%] md:w-[930px]"
				onSubmit={handleSubmit(onSubmit)}
				autoComplete="off"
			>
				<div className="flex flex-col justify-between items-center">
					<div className="w-full mt-5">
						<div className="">
							<div className="flex w-full items-center justify-between gap-12">
								<Text className="flex-none flex-grow-0 text-md text-gray-400 font-normal mb-2 w-1/5">
									{trans.TEAM_NAME}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
									<InputField
										type="text"
										placeholder={trans.TEAM_NAME}
										{...register('teamName', { required: true, maxLength: 80 })}
										className=""
										trailingNode={
											<Button
												variant="ghost"
												className="p-0 m-0 mr-[0.5rem] min-w-0"
												type="submit"
											>
												<Edit2Icon />
											</Button>
										}
									/>
								</div>
							</div>
							<div className="flex w-full items-center  gap-12 mt-8">
								<Text className="flex-none flex-grow-0 text-md text-gray-400 font-normal mb-2 w-1/5">
									{trans.TEAM_TYPE}
								</Text>
								<div className="flex gap-x-[30px]">
									<div className="items-center  w-full">
										<div>
											<input
												checked={activeTeam?.public}
												id="default-radio-1"
												type="radio"
												value="true"
												className="w-4 h-4 text-[#3826A6] bg-gray-100 border-gray-300 focus:ring-[#3826A6] dark:focus:ring-[#3826A6] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
												name="r"
												onClick={() => {
													setValue('teamType', true);
													const latestFormData = getValues();
													onSubmit({
														...latestFormData,
														teamType: true,
													});
												}}
											/>
											<Text.Label>Public Team</Text.Label>
										</div>
										<div>
											<input
												checked={!activeTeam?.public}
												id="default-radio-2"
												type="radio"
												value="false"
												className="w-4 h-4 text-[#3826A6] bg-gray-100 border-gray-300 focus:ring-[#3826A6] dark:focus:ring-[#3826A6] dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
												name="r"
												onClick={() => {
													setValue('teamType', false);
													const latestFormData = getValues();
													onSubmit({
														...latestFormData,
														teamType: false,
													});
												}}
											/>
											<Text.Label>Private Team</Text.Label>
										</div>
									</div>
									<div className="flex gap-4 items-center">
										<div className="flex flex-row flex-grow-0 items-center justify-between w-64 mb-0">
											<InputField
												type="text"
												placeholder="https://teamA.gauzy.com"
												className="mb-0 h-[54px]"
												wrapperClassName="mb-0 h-[54px]"
											/>
										</div>
										<div className="flex flex-row flex-grow-0 items-center justify-between w-1/5">
											<Button
												type="submit"
												variant="outline"
												className="border-2 rounded-xl h-[54px] min-w-[105px] font-[600] text-[14px]"
											>
												Copy Link
											</Button>
										</div>
									</div>
								</div>
							</div>
							<div className="flex w-full items-center justify-between gap-12">
								<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
									{trans.TIME_TRACKING}
								</Text>
								<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
									<TimeTrackingToggle />
								</div>
							</div>
						</div>
					</div>
				</div>
			</form>
		</>
	);
};
