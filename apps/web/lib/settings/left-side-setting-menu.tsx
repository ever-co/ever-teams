/* eslint-disable no-mixed-spaces-and-tabs */
import Link from 'next/link';
import { Text } from 'lib/components';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import {
	PeopleIcon,
	PeopleIconFilled,
	UserIcon,
	UserIconFilled,
} from 'lib/components/svgs';
import { SidebarAccordian } from 'lib/components/sidebar-accordian';
import { useIsMemberManager } from '@app/hooks';
import { userState } from '@app/stores';
import { useRecoilState } from 'recoil';

export const LeftSideSettingMenu = () => {
	const router = useRouter();
	const [activePage, setActivePage] = useState('');

	const [user] = useRecoilState(userState);
	const { isTeamManager } = useIsMemberManager(user);

	useEffect(() => {
		setActivePage(router.route);
	}, [router.route]);

	const PersonalAccordianData = [
		{
			title: 'General',
			color: '#7E7991',
			href: '#general',
		},
		{
			title: 'Work Schedule',
			color: '#7E7991',
			href: '#work-schedule',
		},
		{
			title: 'Subscription',
			color: '#7E7991',
			href: '#subscription',
		},
		{
			title: 'Danger Zone',
			color: '#DE5536',
			href: '#danger-zone',
		},
	];

	const TeamAccordianData = [
		{
			title: 'General Settings',
			color: '#7E7991',
			href: '#general-settings',
			managerOnly: false,
		},
		{
			title: 'Invitations',
			color: '#7E7991',
			href: '#invitations',
			managerOnly: true,
		},
		{
			title: 'Member',
			color: '#7E7991',
			href: '#member',
			managerOnly: true,
		},
		{
			title: 'Issues Settings',
			color: '#7E7991',
			href: '#issues-settings',
			managerOnly: false,
		},
		{
			title: 'Statuses',
			color: '#7E7991',
			href: '#statuses',
			managerOnly: false,
		},
		{
			title: 'Priorities',
			color: '#7E7991',
			href: '#priorities',
			managerOnly: false,
		},
		{
			title: 'Sizes',
			color: '#7E7991',
			href: '#sizes',
			managerOnly: false,
		},
		{
			title: 'Labels',
			color: '#7E7991',
			href: '#labels',
			managerOnly: false,
		},
		{
			title: 'Related Issue Types',
			color: '#7E7991',
			href: '#related-issue-types',
			managerOnly: true,
		},
		{
			title: 'Notifications',
			color: '#7E7991',
			href: '#notifications',
			managerOnly: true,
		},
		{
			title: 'Integrations',
			color: '#7E7991',
			href: '#integrations',
			managerOnly: true,
		},
		{
			title: 'Danger Zones',
			color: '#DE5536',
			href: '#danger-zones',
		},
	];
	return (
		<>
			<div className="sm:w-[320px] mt-[36px] sm:mr-[56px] mx-auto">
				<Text className="text-4xl font-normal mb-[40px] text-center sm:text-left">
					Settings
				</Text>
				<div className="flex sm:block">
					<SidebarAccordian
						title={
							<>
								{activePage === '/settings/personal' ? (
									<UserIconFilled className="w-[24px] h-[24px] fill-primary strock-primary" />
								) : (
									<UserIcon className="w-[24px] h-[24px]" />
								)}
								Personal
							</>
						}
						className="bg-[transparent]"
						textClassName={`
						${
							activePage === '/settings/personal'
								? '  text-[#3826a6] font-semibold'
								: ' border-l-transparent font-normal'
						}
						`}
						wrapperClassName={`w-full border-t-0 border-r-0 border-b-0 rounded-none
                font-normal text-[#7e7991] justify-start  pt-[24px] pb-[24px] pl-[24px]
				border-l-[5px] ${
					activePage === '/settings/personal'
						? '  text-[#3826a6] border-l-solid border-l-primary bg-primary/5'
						: ' border-l-transparent'
				}
                `}
					>
						<div className="flex flex-col">
							{PersonalAccordianData?.map((ad, index) => {
								return (
									<Link href={`/settings/personal${ad.href}`} key={index}>
										<Text
											className={`text-[${ad.color}] text-lg font-normal flex items-center p-4 pr-1 pl-5`}
											key={index}
											style={{ color: ad.color }}
										>
											{ad.title}
										</Text>
									</Link>
								);
							})}
						</div>
					</SidebarAccordian>

					<SidebarAccordian
						title={
							<>
								{activePage === '/settings/team' ? (
									<PeopleIconFilled className="w-[24px] h-[24px] fill-primary strock-primary" />
								) : (
									<PeopleIcon className="w-[24px] h-[24px] stroke-[#7E7991]" />
								)}
								Team
							</>
						}
						className="bg-[transparent]"
						textClassName={`${
							activePage === '/settings/team'
								? ' text-[#3826a6]  text-primary font-semibold'
								: ' border-l-transparent font-normal'
						}`}
						wrapperClassName={`w-full border-t-0 border-r-0 border-b-0 rounded-none
						font-normal text-[#7e7991] justify-start text-sm pt-[24px] pb-[24px] pl-[24px]
	border-l-[5px] ${
		activePage === '/settings/team'
			? ' text-[#3826a6] border-l-solid border-l-primary bg-primary/5 text-primary'
			: ' border-l-transparent'
	}
						`}
					>
						<div className="flex flex-col">
							{TeamAccordianData.filter(
								(ad) => (!isTeamManager && !ad.managerOnly) || isTeamManager
							).map((ad, index) => {
								return (
									<Link href={`/settings/team${ad.href}`} key={index}>
										<Text
											className={`text-[${ad.color}] text-lg font-normal flex items-center p-4 pr-1 pl-5`}
											key={index}
											style={{ color: ad.color }}
										>
											{ad.title}
										</Text>
									</Link>
								);
							})}
						</div>
					</SidebarAccordian>
				</div>
			</div>
		</>
	);
};
