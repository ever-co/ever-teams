import { I_TeamMemberCardHook } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Avatar, Text, Tooltip } from 'lib/components';
// import { MailIcon } from 'lib/components/svgs';
import { TimerStatus } from 'lib/features';
import Link from 'next/link';
import { CHARACTER_LIMIT_TO_SHOW } from '@app/constants';

type Props = {
	memberInfo: I_TeamMemberCardHook;
	publicTeam?: boolean;
} & IClassName;

export function UserInfo({ className, memberInfo, publicTeam = false }: Props) {
	const { memberUser, member } = memberInfo;

	return (
		<Link
			href={publicTeam ? '#' : `/profile/${memberInfo.memberUser?.id}`}
			className={clsxm('flex items-center lg:space-x-4 space-x-2', className)}
		>
			<Avatar size={60} imageUrl={memberUser?.imageUrl} className="relative">
				{member?.timerStatus &&
					<TimerStatus
					status={member.timerStatus}
					className="absolute border z-20 bottom-3 -right-1 -mb-3"
				/>}
			</Avatar>

			<div className="lg:w-64 w-1/2">
				<Tooltip
					label={`${memberUser?.firstName || ''} ${
						memberUser?.lastName || ''
					}`.trim()}
					placement="auto"
					enabled={
						`${memberUser?.firstName || ''} ${
							memberUser?.lastName || ''
						}`.trim().length > CHARACTER_LIMIT_TO_SHOW
					}
				>
					<Text.Heading
						as="h3"
						className="overflow-hidden text-ellipsis whitespace-nowrap w-full text-sm lg:text-lg "
					>
						{publicTeam ? (
							<span className="flex capitalize">
								{`${memberUser?.firstName || ''} ${
									memberUser?.lastName || ''
								}`.slice(0, 1)}{' '}
							</span>
						) : (
							`${memberUser?.firstName || ''} ${memberUser?.lastName || ''}`
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
