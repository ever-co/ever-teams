/* eslint-disable no-mixed-spaces-and-tabs */
import { I_TeamMemberCardHook, useTimer } from '@/core/hooks';
import { IClassName, ITimerStatusEnum } from '@/core/types/interfaces';
import { clsxm, isValidUrl } from '@/core/lib/utils';
import { Avatar, Text, Tooltip } from '@/core/components';
import { getTimerStatusValue, TimerStatus } from '@/core/components/features';
import Link from 'next/link';
import { CHARACTER_LIMIT_TO_SHOW } from '@/core/constants/config/constants';
import { useMemo } from 'react';
import stc from 'string-to-color';
import { imgTitle } from '@/core/lib/helpers/index';
import { MailIcon } from 'assets/svg';
import { UserManagerIcon } from 'assets/svg';

type Props = {
	memberInfo: I_TeamMemberCardHook;
	publicTeam?: boolean;
} & IClassName;

export function UserInfo({ className, memberInfo, publicTeam = false }: Props) {
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
			href={publicTeam ? '#' : `/profile/${memberInfo.memberUser?.id}?name=${fullname}`}
			className={clsxm('flex items-center lg:gap-4 gap-2 w-fit', className)}
		>
			<div
				className={clsxm(
					'w-[50px] h-[50px]',
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
					<div className="w-[50px] h-[50px] flex justify-center items-center rounded-full">
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
						className="flex w-full gap-2 overflow-hidden text-base text-ellipsis whitespace-nowrap lg:text-lg"
					>
						<div className="max-w-[176px] truncate text-base">
							{publicTeam ? <span className="flex capitalize">{fullname.slice(0, 1)}</span> : fullname}
						</div>
						{(member?.role?.name === 'MANAGER' ||
							member?.role?.name === 'SUPER_ADMIN' ||
							member?.role?.name === 'ADMIN') && (
							<Tooltip
								label={'Manager'}
								placement="auto"
								enabled={
									member?.role?.name === 'MANAGER' ||
									member?.role?.name === 'SUPER_ADMIN' ||
									member?.role?.name === 'ADMIN'
								}
							>
								<UserManagerIcon strokeWidth="2" className="w-4 mt-1" />
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
						<Text className="flex items-center gap-1 text-sm text-gray-400">
							<MailIcon className="w-4 h-4" />
							<span className="pr-1 overflow-hidden text-nowrap max-w-40 text-ellipsis whitespace-nowrap">
								{memberUser?.email}
							</span>
						</Text>
					</Tooltip>
				)}
			</div>
		</Link>
	);
}
