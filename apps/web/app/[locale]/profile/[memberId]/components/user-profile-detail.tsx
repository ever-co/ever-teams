import { useTimer } from '@app/hooks';
import { ITimerStatusEnum, OT_Member } from '@app/interfaces';
import { isValidUrl } from '@app/utils';
import { getTimerStatusValue, TimerStatus } from 'lib/features';
import { cn } from 'lib/utils';
import { useMemo } from 'react';
import stc from 'string-to-color';
import { Avatar, Text } from 'lib/components';
import { imgTitle } from '@app/helpers';
import { TableActionPopover } from 'lib/settings/table-action-popover';

export function UserProfileDetail({ member }: { member?: OT_Member }) {
	const user = useMemo(() => member?.employee.user, [member?.employee.user]);

	const userName = `${user?.firstName || ''} ${user?.lastName || ''}`;
	const imgUrl = user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
	const imageUrl = useMemo(() => imgUrl, [imgUrl]);
	const size = 100;
	const { timerStatus } = useTimer();
	// const isManager = activeTeamManagers.find((member) => member.employee.user?.id === member?.employee.user?.id);
	const timerStatusValue: ITimerStatusEnum = useMemo(() => {
		return getTimerStatusValue(timerStatus, member, false);
	}, [timerStatus, member]);
	return (
		<div className="flex items-center mb-4 space-x-4 md:mb-0">
			<div
				className={cn(
					`w-[100px] h-[100px]`, // removed the size variable from width and height, as passing variables is not supported by tailwind
					'flex justify-center items-center relative',
					'rounded-full text-white',
					'shadow-md text-7xl dark:text-6xl font-thin font-PlusJakartaSans ',
					!imageUrl && 'dark:border-[0.375rem] dark:border-[#26272C]'
				)}
				style={{
					backgroundColor: `${stc(userName)}80`
				}}
			>
				{imageUrl && isValidUrl(imageUrl) ? (
					<Avatar
						size={size}
						className="relative dark:border-[0.375rem] dark:border-[#26272C]"
						imageUrl={imageUrl}
						alt={userName}
						imageTitle={userName.charAt(0)}
					>
						<TimerStatus
							status={timerStatusValue}
							className="absolute z-20 bottom-3 right-[10%] -mb-5 border-[0.2956rem] border-white dark:border-[#26272C]"
							tooltipClassName="mt-24 dark:mt-20 mr-3"
						/>
					</Avatar>
				) : (
					<>
						{imgTitle(userName).charAt(0)}

						<TimerStatus
							status={timerStatusValue}
							className="absolute z-20 border-[0.2956rem] border-white dark:border-[#26272C]"
							tooltipClassName="absolute -bottom-[0.625rem] dark:-bottom-[0.75rem] right-[10%] w-[1.875rem] h-[1.875rem] rounded-full"
						/>
					</>
				)}
			</div>
			<div className="flex flex-col gap-3.5 w-full">
				<div className="flex items-center gap-x-4">
					<Text.Heading as="h3" className="text-2xl md:text-4xl">
						{user?.firstName} {user?.lastName}
					</Text.Heading>
					<div className="h-8  w-8">
						{member ? <TableActionPopover member={member} status="profile" /> : <></>}
					</div>
				</div>
				<Text className="text-lg text-gray-500">{user?.email}</Text>
			</div>
		</div>
	);
}
