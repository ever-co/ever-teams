/* eslint-disable no-mixed-spaces-and-tabs */
import Link from 'next/link';
import { Button, Text } from 'lib/components';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import {
	PeopleIcon,
	PeopleIconFilled,
	UserIcon,
	UserIconFilled,
} from 'lib/components/svgs';

export const LeftSideSettingMenu = () => {
	const router = useRouter();
	const [activePage, setActivePage] = useState('/settings/personal');
	useEffect(() => {
		setActivePage(router.route);
	}, [router.route]);
	return (
		<>
			<div className="w-[320px] mt-[36px] mr-[56px]">
				<Text className="text-4xl font-normal mb-[40px]">Settings</Text>
				<Link href="/settings/personal">
					<Button
						variant="outline"
						className={`w-full border-t-0 border-r-0 border-b-0 rounded-none
                font-normal text-[#7e7991] justify-start text-sm pt-[24px] pb-[24px] pl-[24px]
				border-l-[5px]
                ${
									activePage === '/settings/personal'
										? '  text-[#3826a6] border-l-solid border-l-primary bg-primary/5'
										: ' border-l-transparent'
								}`}
					>
						{activePage === '/settings/personal' ? (
							<UserIconFilled className="w-[24px] h-[24px] fill-primary strock-primary" />
						) : (
							<UserIcon className="w-[24px] h-[24px]" />
						)}
						Personal
					</Button>
				</Link>
				<Link href="/settings/team">
					<Button
						variant="outline"
						className={`w-full border-t-0 border-r-0 border-b-0 rounded-none
                    font-normal text-[#7e7991] justify-start text-sm pt-[24px] pb-[24px] pl-[24px]
					border-l-[5px]
                    ${
											activePage === '/settings/team'
												? ' border-l-solid border-l-primary bg-primary/5 text-primary'
												: ' border-l-transparent'
										}`}
					>
						{activePage === '/settings/team' ? (
							<PeopleIconFilled className="w-[24px] h-[24px] fill-primary strock-primary" />
						) : (
							<PeopleIcon className="w-[24px] h-[24px] stroke-[#7E7991]" />
						)}
						Team
					</Button>
				</Link>
			</div>
		</>
	);
};
