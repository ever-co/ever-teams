/* eslint-disable no-mixed-spaces-and-tabs */
import { useIsMemberManager, useLeftSettingData } from '@/core/hooks';
import { userState } from '@app/stores';
import { scrollToElement } from '@app/utils';
import { Text } from '@/core/components';
import { SidebarAccordian } from '@/core/components/sidebar-accordian';
import { PeoplesIcon, UserOutlineIcon } from 'assets/svg';
import { useParams, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAtom, useAtomValue } from 'jotai';
import Link from 'next/link';
import { clsxm } from '@app/utils';
import { ScrollArea, ScrollBar } from '@/core/components/ui/scroll-bar';
import { activeSettingTeamTab } from '@app/stores/setting';

export const LeftSideSettingMenu = ({ className }: { className?: string }) => {
	const t = useTranslations();
	const activeTeamMenu = useAtomValue(activeSettingTeamTab);
	const { PersonalAccordianData, TeamAccordianData } = useLeftSettingData();
	const pathname = usePathname();
	const params = useParams();
	const locale = useMemo(() => {
		return params?.locale || '';
	}, [params]);
	const [activePage, setActivePage] = useState('');

	const [user] = useAtom(userState);
	const { isTeamManager } = useIsMemberManager(user);

	useEffect(() => {
		if (pathname) {
			setActivePage(pathname);
		}
	}, [pathname]);

	useEffect(() => {
		const url = new URL(window.location.origin + pathname);
		window.setTimeout(() => {
			if (!url.hash) return;

			const targetElement = document.querySelector(url.hash);
			if (targetElement) {
				const rect = targetElement.getBoundingClientRect();
				scrollToElement(rect, 100);
			}
		}, 100);

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pathname]);

	const onLinkClick = useCallback(
		(e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
			const url = new URL(e.currentTarget.href);
			if (url.pathname !== pathname) {
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
		[pathname]
	);

	return (
		<div className={clsxm(' ', className)}>
			<Text className="text-4xl font-normal my-10 min-w-[16rem] text-center sm:text-left">
				{t('common.SETTINGS')}
			</Text>
			<ScrollArea
				type="always"
				className="flex text-red-500 sm:block h-[calc(100vh-_382px)] overflow-y-auto pr-2.5"
			>
				<div>
					<SidebarAccordian
						title={
							<>
								{activePage === '/settings/personal' ? (
									<UserOutlineIcon
										className="w-6 h-6 fill-primary dark:fill-white strock-primary"
										fill="white"
									/>
								) : (
									<UserOutlineIcon className="w-6 h-6 fill-" />
								)}
								{t('common.PERSONAL')}
							</>
						}
						className="bg-transparent"
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
									<Link
										onClick={onLinkClick}
										href={`/${locale}/settings/personal${ad.href}`}
										key={index}
									>
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
									<PeoplesIcon className="w-6 h-6 dark:fill-white" fill="#3826A6" />
								) : (
									<PeoplesIcon className="w-6 h-6 text-[#7E7991]" />
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
										<Link
											onClick={onLinkClick}
											href={`/${locale}/settings/team${ad.href}`}
											key={index}
										>
											<Text
												className={`text-[${ad.color}] text-lg font-normal flex items-center p-4 pr-1 pl-5 `}
												key={index}
												style={{
													color: ad.color,
													fontWeight: '#' + activeTeamMenu == ad.href ? 'bold' : 'normal'
												}}
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
				<ScrollBar className="pl-2 text-white" />
			</ScrollArea>
		</div>
	);
};
