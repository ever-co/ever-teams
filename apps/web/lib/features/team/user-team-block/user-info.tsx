/* eslint-disable no-mixed-spaces-and-tabs */
import { I_TeamMemberCardHook, useTimer } from '@app/hooks';
import { IClassName, ITimerStatusEnum } from '@app/interfaces';
import { clsxm, isValidUrl } from '@app/utils';
import { Avatar } from 'lib/components';
// import { MailIcon } from 'lib/components/svgs';
import { getTimerStatusValue, TimerStatus } from 'lib/features';
import Link from 'next/link';
import { useMemo } from 'react';
import stc from 'string-to-color';
import { imgTitle } from '@app/helpers';

type Props = {
	memberInfo: I_TeamMemberCardHook;
	publicTeam?: boolean;
} & IClassName;

export function UserBoxInfo({ className, memberInfo, publicTeam = false }: Props) {
	const { memberUser, member } = memberInfo;
	const fullname = `${memberUser?.firstName || ''} ${memberUser?.lastName || ''}`;

	const imageUrl = useMemo(() => {
		return memberUser?.image?.thumbUrl || memberUser?.image?.fullUrl || memberUser?.imageUrl || '';
	}, [memberUser?.image?.thumbUrl, memberUser?.image?.fullUrl, memberUser?.imageUrl]);

	const { timerStatus } = useTimer();
	const timerStatusValue: ITimerStatusEnum = useMemo(() => {
		return getTimerStatusValue(timerStatus, member, publicTeam);
	}, [timerStatus, member, publicTeam]);

	return (
		<Link
			href={publicTeam ? '#' : `/profile/${memberInfo.memberUser?.id}`}
			className={clsxm('flex items-center lg:space-x-4 space-x-2', className)}
		>
			<div
				className={clsxm(
					'w-[40px] h-[40px]',
					'flex justify-center items-center relative',
					'rounded-full text-white',
					'shadow-md text-[2.063rem] font-thin font-PlusJakartaSans'
				)}
				style={{
					backgroundColor: `${stc(fullname)}80`
				}}
			>
				{imageUrl && isValidUrl(imageUrl) ? (
					<Avatar size={40} className="relative cursor-pointer" imageUrl={imageUrl} alt="Team Avatar" />
				) : (
					<div className="w-[40px] h-[40px] flex justify-center items-center rounded-full">
						{imgTitle(fullname).charAt(0)}
					</div>
				)}
				<TimerStatus
					status={timerStatusValue}
					className="w-[1.3rem] h-[1.3rem] absolute z-20 bottom-3 -right-1 -mb-3 border-[0.125rem] border-white dark:border-[#26272C]"
					tooltipClassName="absolute right-0 bottom-3 -mb-3 w-[1.3rem] h-[1.3rem] rounded-full"
				/>
			</div>

			<p>{fullname}</p>
		</Link>
	);
}
