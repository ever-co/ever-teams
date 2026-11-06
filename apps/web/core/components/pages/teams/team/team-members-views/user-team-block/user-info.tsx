/* eslint-disable no-mixed-spaces-and-tabs */
import { I_MemberIdentityHook } from '@/core/hooks';
import { clsxm, isValidUrl } from '@/core/lib/utils';
import Link from 'next/link';
import { useMemo } from 'react';
import stc from 'string-to-color';
import { imgTitle } from '@/core/lib/helpers/index';
import { getTimerStatusValue, TimerStatus } from '@/core/components/timer/timer-status';
import { Avatar } from '@/core/components/duplicated-components/avatar';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { useAtomValue } from 'jotai';
import { timerStatusState } from '@/core/stores';

type Props = {
	memberInfo: I_MemberIdentityHook;
	publicTeam?: boolean;
} & IClassName;

export function UserBoxInfo({ className, memberInfo, publicTeam = false }: Props) {
	const { memberUser, member } = memberInfo;
	const fullname = `${memberUser?.firstName || ''} ${memberUser?.lastName || ''}`;

	const imageUrl = useMemo(() => {
		return memberUser?.image?.thumbUrl || memberUser?.image?.fullUrl || memberUser?.imageUrl || '';
	}, [memberUser?.image?.thumbUrl, memberUser?.image?.fullUrl, memberUser?.imageUrl]);

	const timerStatus = useAtomValue(timerStatusState);
	const timerStatusValue: ETimerStatus = useMemo(() => {
		return getTimerStatusValue(timerStatus, member, publicTeam);
	}, [timerStatus, member, publicTeam]);

	return (
		<Link
			href={publicTeam ? '#' : `/profile/${memberInfo.memberUser?.id}?name=${fullname}`}
			className={clsxm(
				'flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25',
				className
			)}
		>
			<div
				className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-foreground"
				style={{
					backgroundColor: `${stc(fullname)}80`
				}}
			>
				{imageUrl && isValidUrl(imageUrl) ? (
					<Avatar size={36} className="relative cursor-pointer" imageUrl={imageUrl} alt="Team Avatar" />
				) : (
					<div className="flex size-9 items-center justify-center rounded-full">
						{imgTitle(fullname).charAt(0)}
					</div>
				)}
				<TimerStatus
					status={timerStatusValue}
					size="sm"
					className="ring-2 ring-card"
					tooltipClassName="absolute -right-1 -bottom-1"
				/>
			</div>

			<p className="truncate text-sm font-medium">{fullname}</p>
		</Link>
	);
}
