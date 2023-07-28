/* eslint-disable no-mixed-spaces-and-tabs */
import { I_TeamMemberCardHook } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Avatar, Text, Tooltip } from 'lib/components';
// import { MailIcon } from 'lib/components/svgs';
import { TimerStatus } from 'lib/features';
import Link from 'next/link';
import { CHARACTER_LIMIT_TO_SHOW } from '@app/constants';
import { isURL } from 'class-validator';
import { useMemo } from 'react';

type Props = {
	memberInfo: I_TeamMemberCardHook;
	publicTeam?: boolean;
} & IClassName;

export function UserInfo({ className, memberInfo, publicTeam = false }: Props) {
	const { memberUser, member } = memberInfo;
	const fullname = `${memberUser?.firstName || ''} ${
		memberUser?.lastName || ''
	}`;

	const imageUrl = useMemo(() => {
		return (
			memberUser?.image?.thumbUrl ||
			memberUser?.image?.fullUrl ||
			memberUser?.imageUrl ||
			''
		);
	}, [
		memberUser?.image?.thumbUrl,
		memberUser?.image?.fullUrl,
		memberUser?.imageUrl,
	]);

	return (
		<Link
			href={publicTeam ? '#' : `/profile/${memberInfo.memberUser?.id}`}
			className={clsxm('flex items-center lg:space-x-4 space-x-2', className)}
		>
			<Avatar
				size={60}
				imageUrl={isURL(imageUrl) ? imageUrl : ''}
				className="relative"
				imageTitle={fullname[0]}
			>
				<TimerStatus
					status={
						!member?.employee?.isActive && !publicTeam
							? 'suspended'
							: member?.employee?.isOnline && member?.timerStatus !== 'running'
							? 'online'
							: !member?.totalTodayTasks?.length
							? 'idle'
							: member?.timerStatus || 'idle'
					}
					className="absolute border z-20 bottom-3 -right-1 -mb-3"
				/>
			</Avatar>

			<div className="lg:w-64 w-1/2">
				<Tooltip
					label={fullname.trim()}
					placement="auto"
					enabled={fullname.trim().length > CHARACTER_LIMIT_TO_SHOW}
				>
					<Text.Heading
						as="h3"
						className="overflow-hidden text-ellipsis whitespace-nowrap w-full text-sm lg:text-lg "
					>
						{publicTeam ? (
							<span className="flex capitalize">{fullname.slice(0, 1)} </span>
						) : (
							fullname
						)}
					</Text.Heading>
				</Tooltip>

				{/* {memberInfo.isAuthUser && (
					<Tooltip
						label={`${memberUser?.email || ''} `.trim()}
						placement="auto"
						enabled={
							`${memberUser?.email || ''} `.trim().length >
							CHARACTER_LIMIT_TO_SHOW
						}
					>
						<Text className="text-gray-400 flex items-center text-sm space-x-1">
							<MailIcon />{' '}
							<span className="overflow-hidden text-ellipsis whitespace-nowrap">
								{memberUser?.email}
							</span>
						</Text>
					</Tooltip>
				)} */}
			</div>
		</Link>
	);
}
