/* eslint-disable no-mixed-spaces-and-tabs */
import { useIsMemberManager, useLeftSettingData } from '@app/hooks';
import { userState } from '@app/stores';
import { scrollToElement } from '@app/utils';
import { Text } from 'lib/components';
import { SidebarAccordian } from 'lib/components/sidebar-accordian';
import { PeopleIcon, PeopleIconFilled, UserIcon, UserIconFilled } from 'lib/components/svgs';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoilState } from 'recoil';

export const LeftSideSettingMenu = () => {
	const { t } = useTranslation();
	const { PersonalAccordianData, TeamAccordianData } = useLeftSettingData();
	const router = useRouter();
	const [activePage, setActivePage] = useState('');

	const [user] = useRecoilState(userState);
	const { isTeamManager } = useIsMemberManager(user);

	useEffect(() => {
		setActivePage(router.route);
	}, [router.route]);

	useEffect(() => {
		const url = new URL(window.location.origin + router.asPath);
		window.setTimeout(() => {
			if (!url.hash) return;

			const targetElement = document.querySelector(url.hash);
			if (targetElement) {
				const rect = targetElement.getBoundingClientRect();
				scrollToElement(rect, 100);
			}
		}, 100);

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router.pathname]);

	const onLinkClick = useCallback(
		(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
			// if(router.pathname )
			const url = new URL(e.currentTarget.href);
			if (url.pathname !== router.pathname) {
				return;
			}
			e.stopPropagation();

			const targetElement = document.querySelector(url.hash);
			if (targetElement) {
				e.preventDefault();
				const rect = targetElement.getBoundingClientRect();
				scrollToElement(rect, 100);
			}
		},
		[router]
	);

	return (
		<>
			<div className="sm:w-[320px] mt-[36px] sm:mr-[56px] mx-auto">
				<Text className="text-4xl font-normal mb-[40px] text-center sm:text-left">{t('common.SETTINGS')}</Text>
				<div className="flex sm:block">
					<SidebarAccordian
						title={
							<>
								{activePage === '/settings/personal' ? (
									<UserIconFilled className="w-[24px] h-[24px] fill-primary dark:fill-white strock-primary" />
								) : (
									<UserIcon className="w-[24px] h-[24px]" />
								)}
								{t('common.PERSONAL')}
							</>
						}
						className="bg-[transparent]"
						textClassName={`
						${
							activePage === '/settings/personal'
								? `text-[#3826a6] font-semibold`
								: 'border-l-transparent font-normal dark:text-[#7E7991]'
						}
						`}
						wrapperClassName={`w-full border-t-0 border-r-0 border-b-0 rounded-none
                font-normal text-[#7e7991] justify-start  pt-[24px] pb-[24px] pl-[24px]
				border-l-[5px] ${
					activePage === '/settings/personal'
						? 'text-[#3826a6] border-l-solid border-l-primary bg-[#E9E5F9] dark:bg-[#6755C9]'
						: 'border-l-transparent'
				}
                `}
					>
						<div className="flex flex-col">
							{PersonalAccordianData.map((ad, index) => {
								return (
									<Link onClick={onLinkClick} href={`/settings/personal${ad.href}`} key={index}>
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
									<PeopleIconFilled className="w-[24px] h-[24px] fill-primary dark:fill-white strock-primary" />
								) : (
									<PeopleIcon className="w-[24px] h-[24px] stroke-[#7E7991]" />
								)}
								{t('common.TEAM')}
							</>
						}
						className="bg-[transparent]"
						textClassName={`${
							activePage === '/settings/team'
								? ' text-[#3826a6] text-primary font-semibold'
								: ' border-l-transparent font-normal dark:text-[#7E7991]'
						}`}
						wrapperClassName={`w-full border-t-0 border-r-0 border-b-0 rounded-none
						font-normal text-[#7e7991] justify-start text-sm pt-[24px] pb-[24px] pl-[24px]
	border-l-[5px] ${
		activePage === '/settings/team'
			? ' text-[#3826a6] border-l-solid border-l-primary bg-primary/5 text-primary dark:bg-[#6755C9]'
			: ' border-l-transparent'
	}
						`}
					>
						<div className="flex flex-col">
							{TeamAccordianData.filter((ad) => (!isTeamManager && !ad.managerOnly) || isTeamManager).map(
								(ad, index) => {
									return (
										<Link onClick={onLinkClick} href={`/settings/team${ad.href}`} key={index}>
											<Text
												className={`text-[${ad.color}] text-lg font-normal flex items-center p-4 pr-1 pl-5`}
												key={index}
												style={{ color: ad.color }}
											>
												{ad.title}
											</Text>
										</Link>
									);
								}
							)}
						</div>
					</SidebarAccordian>
				</div>
			</div>
		</>
	);
};
