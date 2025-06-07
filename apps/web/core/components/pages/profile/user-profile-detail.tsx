import { useTimer } from '@/core/hooks';
import { isValidUrl } from '@/core/lib/utils';
import { cn } from '@/core/lib/helpers';
import { useMemo } from 'react';
import stc from 'string-to-color';
import { Text } from '@/core/components';
import { imgTitle } from '@/core/lib/helpers/index';
import { TableActionPopover } from '@/core/components/settings/table-action-popover';
import { getTimerStatusValue, TimerStatus } from '../../timer/timer-status';
import { Avatar } from '../../duplicated-components/avatar';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

export function UserProfileDetail({ member }: { member?: TOrganizationTeamEmployee }) {
	const user = useMemo(() => member?.employee?.user, [member?.employee?.user]);

	const userName = `${user?.firstName || ''} ${user?.lastName || ''}`;
	const imgUrl = user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
	const imageUrl = useMemo(() => imgUrl, [imgUrl]);
	const size = 100;
	const { timerStatus } = useTimer();
	// const isManager = activeTeamManagers.find((member) => member.employee.user?.id === member?.employee.user?.id);
	const timerStatusValue: ETimerStatus = useMemo(() => {
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
					<div className="w-8 h-8">
						{member ? <TableActionPopover member={member} status="profile" /> : <></>}
					</div>
				</div>
				<Text className="text-lg text-gray-500">{user?.email}</Text>
			</div>
		</div>
	);
}
