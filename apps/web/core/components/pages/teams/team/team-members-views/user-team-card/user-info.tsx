/* eslint-disable no-mixed-spaces-and-tabs */
import { I_TeamMemberCardHook, useTimer } from '@/core/hooks';
import { clsxm, isValidUrl } from '@/core/lib/utils';
import { Text } from '@/core/components';
import Link from 'next/link';
import { CHARACTER_LIMIT_TO_SHOW } from '@/core/constants/config/constants';
import { useMemo } from 'react';
import stc from 'string-to-color';
import { imgTitle } from '@/core/lib/helpers/index';
import { MailIcon } from 'assets/svg';
import { getTimerStatusValue, TimerStatus } from '@/core/components/timer/timer-status';
import { Avatar } from '@/core/components/duplicated-components/avatar';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { ManagerIcon, CreatorIcon } from '@/core/components/icons/icons';
type Props = {
	memberInfo: I_TeamMemberCardHook;
	publicTeam?: boolean;
} & IClassName;

export function UserInfo({ className, memberInfo, publicTeam = false }: Props) {
	const { memberUser, member } = memberInfo;
	const fullname = `${memberUser?.firstName || ''} ${memberUser?.lastName || ''}`;

	const { isTeamCreator, isTeamManager } = useIsMemberManager(memberUser);

	const imageUrl = useMemo(() => {
		return memberUser?.image?.thumbUrl || memberUser?.image?.fullUrl || memberUser?.imageUrl || '';
	}, [memberUser?.image?.thumbUrl, memberUser?.image?.fullUrl, memberUser?.imageUrl]);

	const { timerStatus } = useTimer();
	const timerStatusValue: ETimerStatus = useMemo(() => {
		return getTimerStatusValue(timerStatus, member, publicTeam);
	}, [timerStatus, member, publicTeam]);

	return (
		<Link
			href={publicTeam ? '#' : `/profile/${memberInfo.memberUser?.id}?name=${fullname}`}
			className={clsxm('flex gap-2 items-center lg:gap-4 w-fit', className)}
		>
			<div
				className={clsxm(
					'w-[50px] h-12',
					'flex justify-center items-center relative',
					'rounded-full text-white',
					'shadow-md text-[2.063rem] font-thin font-PlusJakartaSans'
				)}
				style={{
					backgroundColor: `${stc(fullname)}80`
				}}
			>
				{imageUrl && isValidUrl(imageUrl) ? (
					<Avatar size={50} className="relative cursor-pointer" imageUrl={imageUrl} alt="Team Avatar" />
				) : (
					<div className="w-[50px] h-12 flex justify-center items-center rounded-full">
						{imgTitle(fullname).charAt(0)}
					</div>
				)}
				<TimerStatus
					status={timerStatusValue}
					className="w-[1.3rem] h-[1.3rem] absolute z-20 bottom-3 -right-1 -mb-3 border-[0.125rem] border-white dark:border-[#26272C]"
					tooltipClassName="absolute right-0 bottom-3 -mb-3 w-[1.3rem] h-[1.3rem] rounded-full"
				/>
			</div>

			<div className=" flex grow overflow-x-hidden flex-col gap-1.5">
				<Tooltip
					label={fullname.trim()}
					placement="auto"
					enabled={fullname.trim().length > CHARACTER_LIMIT_TO_SHOW}
				>
					<Text.Heading
						as="h3"
						className="flex overflow-hidden gap-2 w-full text-base whitespace-nowrap text-ellipsis lg:text-lg"
					>
						<div className="max-w-[176px] truncate text-base">
							{publicTeam ? <span className="flex capitalize">{fullname.slice(0, 1)}</span> : fullname}
						</div>
						{(isTeamManager || isTeamCreator) && (
							<Tooltip
								label={`Team ${isTeamCreator ? 'Creator' : 'Manager'}`}
								placement="auto"
								enabled={isTeamManager || isTeamCreator}
							>
								{isTeamCreator ? (
									<CreatorIcon
										className="mt-1 text-gray-800 size-4 dark:text-gray-200"
										strokeWidth={1.5}
									/>
								) : (
									<ManagerIcon
										className="mt-1 text-gray-800 size-4 dark:text-gray-200"
										strokeWidth={1.5}
									/>
								)}
							</Tooltip>
						)}
					</Text.Heading>
				</Tooltip>

				{!publicTeam && (
					<Tooltip
						label={`${memberUser?.email || ''} `.trim()}
						placement="auto"
						enabled={`${memberUser?.email || ''} `.trim().length > CHARACTER_LIMIT_TO_SHOW}
					>
						<Text className="flex gap-1 items-center text-sm text-gray-400">
							<MailIcon className="w-4 h-4" />
							<span className="overflow-hidden pr-1 whitespace-nowrap text-nowrap max-w-40 text-ellipsis">
								{memberUser?.email}
							</span>
						</Text>
					</Tooltip>
				)}
			</div>
		</Link>
	);
}
