/* eslint-disable no-mixed-spaces-and-tabs */
import { I_MemberIdentityHook } from '@/core/hooks';
import { clsxm, isValidUrl } from '@/core/lib/utils';
import { Text } from '@/core/components';
import Link from 'next/link';
import { CHARACTER_LIMIT_TO_SHOW } from '@/core/constants/config/constants';
import { useMemo } from 'react';
import stc from 'string-to-color';
import { imgTitle } from '@/core/lib/helpers/index';
import { Mail } from '@/core/components/icons';
import { getTimerStatusValue, TimerStatus } from '@/core/components/timer/timer-status';
import { Avatar } from '@/core/components/duplicated-components/avatar';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { useTeamManagerRole } from '@/core/hooks/organizations/teams/use-team-member';
import { ManagerIcon, CreatorIcon } from '@/core/components/icons/icons';
import { timerStatusState } from '@/core/stores';
import { useAtomValue } from 'jotai';
type Props = {
	memberInfo: I_MemberIdentityHook;
	publicTeam?: boolean;
} & IClassName;

export function UserInfo({ className, memberInfo, publicTeam = false }: Props) {
	const { memberUser, member } = memberInfo;
	const fullname = `${memberUser?.firstName || ''} ${memberUser?.lastName || ''}`;

	const { isTeamCreator, isTeamManager } = useTeamManagerRole(memberUser?.id);

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
				'flex w-fit items-center gap-3 rounded-md outline-none',
				'focus-visible:ring-[3px] focus-visible:ring-ring/25',
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

			<div className="flex min-w-0 grow flex-col gap-0.5 overflow-x-hidden">
				<Tooltip
					label={fullname.trim()}
					placement="auto"
					enabled={fullname.trim().length > CHARACTER_LIMIT_TO_SHOW}
				>
					<Text.Heading
						as="h3"
						className="flex w-full items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm font-medium"
					>
						<div className="max-w-44 truncate">
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
										className="size-3.5 shrink-0 text-muted-foreground"
										strokeWidth={1.5}
									/>
								) : (
									<ManagerIcon
										className="size-3.5 shrink-0 text-muted-foreground"
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
						<Text className="flex items-center gap-1 text-xs text-muted-foreground">
							<Mail className="size-3.5 shrink-0" />
							<span className="max-w-40 overflow-hidden text-ellipsis whitespace-nowrap pr-1">
								{memberUser?.email}
							</span>
						</Text>
					</Tooltip>
				)}
			</div>
		</Link>
	);
}
