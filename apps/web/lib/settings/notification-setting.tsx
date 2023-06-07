import { Text, CommonToggle } from 'lib/components';
import { useTranslation } from 'lib/i18n';

export const NotificationSettings = () => {
	const { trans } = useTranslation('settingsTeam');

	return (
		<div id="notifications">
			<div>
				<Text className="flex-none flex-grow-0 text-lg md-2 w-1/5 font-medium mt-8 text-[#282048] dark:text-white">
					{trans.SOUND}
				</Text>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
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
				<Text className="flex-none  flex-grow-0 text-lg md-2 w-1/5 font-medium text-[#282048] dark:text-white">
					{trans.EMAIL}
				</Text>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
						{trans.USERS}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
						{trans.TASKS}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
						{trans.SYSTEM}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
						{trans.SECURITY}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
			</div>
			<div className="mt-8">
				<Text className="flex-none flex-grow-0 text-lg md-2 w-1/5 font-medium text-[#282048] dark:text-white">
					{trans.INAPP}
				</Text>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
						{trans.USERS}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
						{trans.TASKS}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
						{trans.SYSTEM}
					</Text>
					<div className="flex flex-row flex-grow-0 items-center justify-between w-4/5">
						<CommonToggle enabledText="Activated" disabledText="Deactivated" />
					</div>
				</div>
				<div className="flex w-full items-center justify-between gap-[2rem]">
					<Text className="flex-none text-gray-400 flex-grow-0 text-lg font-normal md-2 w-1/5">
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
