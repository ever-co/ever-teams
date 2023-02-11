/* eslint-disable no-mixed-spaces-and-tabs */
import Link from 'next/link';
import { Button, Text } from 'lib/components';
import { UserGroupIcon, UserIcon } from '@heroicons/react/20/solid';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

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
                ${
									activePage === '/settings/personal'
										? ' border-l-[5px] text-[#3826a6] border-l-solid border-l-primary bg-primary/5'
										: 'border-l-0'
								}`}
					>
						<UserIcon className="w-[16px] h-[16px]" /> Personal
					</Button>
				</Link>
				<Link href="/settings/team">
					<Button
						variant="outline"
						className={`w-full border-t-0 border-r-0 border-b-0 rounded-none
                    font-normal text-[#7e7991] justify-start text-sm pt-[24px] pb-[24px] pl-[24px]
                    ${
											activePage === '/settings/team'
												? ' border-l-[5px] border-l-solid border-l-primary bg-primary/5'
												: 'border-l-0'
										}`}
					>
						<UserGroupIcon className="w-[16px] h-[16px]" /> Team
					</Button>
				</Link>
			</div>
		</>
	);
};
