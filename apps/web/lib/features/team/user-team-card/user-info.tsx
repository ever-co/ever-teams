import { I_TeamMemberCardHook } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Avatar, Text, Tooltip } from 'lib/components';
import { MailIcon } from 'lib/components/svgs';
import { TimerStatus } from 'lib/features';
import Link from 'next/link';
import { CHARACTER_LIMIT_TO_SHOW } from '@app/constants';

type Props = {
	memberInfo: I_TeamMemberCardHook;
} & IClassName;

export function UserInfo({ className, memberInfo }: Props) {
	const { memberUser } = memberInfo;

	return (
		<Link
			href={`/profile/${memberInfo.memberUser?.id}`}
			className={clsxm('flex items-center space-x-4', className)}
		>
			<Avatar size={60} imageUrl={memberUser?.imageUrl} className="relative">
				<TimerStatus
					status={'running'}
					className="absolute border z-20 bottom-3 -right-1 -mb-3"
				/>
			</Avatar>

			<div className="w-64">
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
						className="overflow-hidden text-ellipsis whitespace-nowrap w-full"
					>
						{memberUser?.firstName} {memberUser?.lastName}
					</Text.Heading>
				</Tooltip>

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
			</div>
		</Link>
	);
}
