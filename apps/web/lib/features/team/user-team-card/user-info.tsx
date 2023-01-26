import { I_TeamMemberCardHook } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Avatar, Text } from 'lib/components';
import { MailIcon } from 'lib/components/svgs';
import { TimerStatus } from 'lib/features';

type Props = {
	memberInfo: I_TeamMemberCardHook;
} & IClassName;

export function UserInfo({ className, memberInfo }: Props) {
	const { memberUser } = memberInfo;
	return (
		<div className={clsxm('flex items-center space-x-4', className)}>
			<Avatar size={60} imageUrl={memberUser?.imageUrl} className="relative">
				<TimerStatus
					status={'running'}
					className="absolute border z-20 bottom-3 -right-1 -mb-3"
				/>
			</Avatar>

			<div className="w-64">
				<Text.Heading as="h3">
					{memberUser?.firstName} {memberUser?.lastName}
				</Text.Heading>
				<Text className="text-gray-400 flex items-center text-sm space-x-1">
					<MailIcon /> <span>{memberUser?.email}</span>
				</Text>
			</div>
		</div>
	);
}
