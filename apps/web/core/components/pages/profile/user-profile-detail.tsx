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
import { useAtomValue } from 'jotai';
import { timerStatusState } from '@/core/stores';

export function UserProfileDetail({ member }: { member?: TOrganizationTeamEmployee }) {
	const user = useMemo(() => member?.employee?.user, [member?.employee?.user]);

	const userName = `${user?.firstName || ''} ${user?.lastName || ''}`;
	const imgUrl = user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
	const imageUrl = useMemo(() => imgUrl, [imgUrl]);
	const size = 64;
	const timerStatus = useAtomValue(timerStatusState);
	// const isManager = activeTeamManagers.find((member) => member.employee.user?.id === member?.employee.user?.id);
	const timerStatusValue: ETimerStatus = useMemo(() => {
		return getTimerStatusValue(timerStatus, member, false);
	}, [timerStatus, member]);
	return (
		<div className="flex items-center mb-4 space-x-4 md:mb-0">
			<div
				className={cn(
					'size-16', // keep in step with `size` above (Tailwind cannot read a variable)
					'flex justify-center items-center relative',
					'rounded-full text-white',
					'text-2xl font-medium',
					!imageUrl && 'dark:border-[0.375rem] dark:border-border'
				)}
				style={{
					backgroundColor: `${stc(userName)}80`
				}}
			>
				{imageUrl && isValidUrl(imageUrl) ? (
					<Avatar
						size={size}
						className="relative dark:border-[0.375rem] dark:border-border"
						imageUrl={imageUrl}
						alt={userName}
						imageTitle={userName.charAt(0)}
					>
						<TimerStatus
							status={timerStatusValue}
							className="absolute z-20 bottom-3 right-[10%] -mb-5 border-[0.2956rem] border-white dark:border-border"
							tooltipClassName="mt-24 dark:mt-20 mr-3"
						/>
					</Avatar>
				) : (
					<>
						{imgTitle(userName).charAt(0)}

						<TimerStatus
							status={timerStatusValue}
							className="absolute z-20 border-[0.2956rem] border-white dark:border-border"
							tooltipClassName="absolute -bottom-[0.625rem] dark:-bottom-[0.75rem] right-[10%] w-[1.875rem] h-[1.875rem] rounded-full"
						/>
					</>
				)}
			</div>
			<div className="flex min-w-0 w-full flex-col gap-0.5">
				<div className="flex gap-x-4 items-center">
					<Text.Heading as="h3" className="truncate text-xl font-semibold tracking-tight md:text-2xl">
						{user?.firstName} {user?.lastName}
					</Text.Heading>
					<div className="w-8 h-8">
						{member ? <TableActionPopover member={member} status="profile" /> : <></>}
					</div>
				</div>
				<Text className="truncate text-sm text-muted-foreground">{user?.email}</Text>
			</div>
		</div>
	);
}
