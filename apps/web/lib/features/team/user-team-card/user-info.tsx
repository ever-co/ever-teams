import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Avatar, Text } from 'lib/components';
import { MailIcon } from 'lib/components/svgs';
import { TimerStatus, ITimerStatus } from 'lib/features';

type Props = {
	userImage?: string;
	timerStatus: ITimerStatus;
	userName?: string;
	userEmail?: string;
} & IClassName;

export function UserInfo({
	className,
	userImage,
	timerStatus,
	userName,
	userEmail,
}: Props) {
	return (
		<div className={clsxm('flex items-center space-x-4', className)}>
			<Avatar size={60} imageUrl={userImage} className="relative">
				<TimerStatus
					status={timerStatus}
					className="absolute border z-20 bottom-3 -right-1 -mb-3"
				/>
			</Avatar>

			<div className="w-64">
				<Text.Heading as="h3">{userName}</Text.Heading>
				<Text className="text-gray-400 flex items-center space-x-1">
					<MailIcon /> <span>{userEmail}</span>
				</Text>
			</div>
		</div>
	);
}
