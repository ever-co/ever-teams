/* eslint-disable no-mixed-spaces-and-tabs */
import { I_TeamMemberCardHook, useTimer } from '@app/hooks';
import { IClassName, ITimerStatusEnum } from '@app/interfaces';
import { clsxm, isValidUrl } from '@app/utils';
import { Avatar, Text, Tooltip } from 'lib/components';
// import { MailIcon } from 'lib/components/svgs';
import { getTimerStatusValue, TimerStatus } from 'lib/features';
import Link from 'next/link';
import { CHARACTER_LIMIT_TO_SHOW } from '@app/constants';
import { useMemo } from 'react';
import stc from 'string-to-color';
import { imgTitle } from '@app/helpers';
import { MailIcon, UserManagerIcon } from 'lib/components/svgs';

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
		memberUser?.imageUrl
	]);

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
					'w-[50px] h-[50px]',
					'flex justify-center items-center',
					'rounded-full text-xs text-default dark:text-white',
					'shadow-md text-2xl font-normal'
				)}
				style={{
					backgroundColor: `${stc(fullname)}80`
				}}
			>
				{imageUrl && isValidUrl(imageUrl) ? (
					<Avatar
						size={50}
						className="relative cursor-pointer"
						imageUrl={imageUrl}
						alt="Team Avatar"
					>
						<TimerStatus
							status={timerStatusValue}
							className="w-[1.3rem] h-[1.3rem] absolute z-20 bottom-3 -right-1 -mb-3 border-[0.125rem] border-white dark:border-[#26272C]"
							tooltipClassName="mt-10"
						/>
					</Avatar>
				) : (
					imgTitle(fullname).charAt(0)
				)}
			</div>

			<div className="lg:w-64 w-1/2 flex flex-col gap-1.5">
				<Tooltip
					label={fullname.trim()}
					placement="auto"
					enabled={fullname.trim().length > CHARACTER_LIMIT_TO_SHOW}
				>
					<Text.Heading
						as="h3"
						className="overflow-hidden text-ellipsis whitespace-nowrap w-full text-base lg:text-lg flex gap-2"
					>
						{publicTeam ? (
							<span className="flex capitalize">{fullname.slice(0, 1)} </span>
						) : (
							fullname
						)}

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
								<UserManagerIcon className="w-4" />
							</Tooltip>
						)}
					</Text.Heading>
				</Tooltip>

				{!publicTeam && (
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
							<span className="overflow-hidden text-ellipsis whitespace-nowrap lg:max-w-[15ch] xl:max-w-[20ch] 2xl:max-w-full">
								{memberUser?.email}
							</span>
						</Text>
					</Tooltip>
				)}
			</div>
		</Link>
	);
}
