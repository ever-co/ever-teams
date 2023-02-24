import { Text, CommonToggle } from 'lib/components';
import { useTranslation } from 'lib/i18n';

export const NotificationSettings = () => {
	const { trans } = useTranslation('settingsTeam');

	return (
		<div>
			<div>
				<Text className="flex-none  flex-grow-0 text-lg md-2 w-1/5 font-medium">
					{trans.SOUND}
				</Text>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
						{trans.GENERAL}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<div className="py-4 flex items-center gap-x-[10px]">
							<CommonToggle
								enabledText="Activated"
								disabledText="Deactivated"
							/>
						</div>
					</div>
				</div>
			</div>
			<div className="mt-8">
				<Text className="flex-none  flex-grow-0 text-lg md-2 w-1/5 font-medium">
					{trans.EMAIL}
				</Text>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
						{trans.USERS}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
						{trans.TASKS}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
						{trans.SYSTEM}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
						{trans.SECURITY}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
			</div>
			<div className="mt-8">
				<Text className="flex-none  flex-grow-0 text-lg md-2 w-1/5 font-medium">
					{trans.INAPP}
				</Text>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
						{trans.USERS}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
						{trans.TASKS}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
						{trans.SYSTEM}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none font-normal text-gray-400 flex-grow-0 text-md md-2 w-1/5">
						{trans.SECURITY}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
			</div>
		</div>
	);
};
