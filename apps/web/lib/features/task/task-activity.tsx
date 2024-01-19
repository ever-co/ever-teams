import { clsxm } from '@app/utils';
import { Tab } from '@headlessui/react';
import { Card } from 'lib/components';
import React from 'react';

export function TaskActivity() {
	return (
		<Card
			className="w-full pt-0 px-4 md:pt-0 md:px-4 dark:bg-[#25272D] flex flex-col gap-4 border border-[#00000014] dark:border-[#26272C]"
			shadow="bigger"
		>
			<div className="shadow-xl rounded-lg">
				<h3 className="text-xl py-2">{'05.01.2024'}</h3>
				<UserTaskActivity />
			</div>

			<div className="shadow-xl rounded-lg">
				<h3 className="text-xl py-2">{'04.01.2024'}</h3>
				<UserTaskActivity />
			</div>

			<div className="shadow-xl rounded-lg">
				<h3 className="text-xl py-2">{'03.01.2024'}</h3>
				<UserTaskActivity />
			</div>
		</Card>
	);
}

const UserTaskActivity = () => {
	return (
		<div className="shadow-lg rounded-md">
			<div className="flex items-center gap-2 my-2">
				<h4 className="text-lg">{'Team Member name'}</h4>
				<span>{'05:30'}</span>
			</div>
			<Tab.Group>
				<Tab.List className="w-full flex space-x-1 rounded-xl bg-gray-200 dark:bg-[#FFFFFF14] p-2 mx-4">
					<Tab
						className={({ selected }) =>
							clsxm(
								'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
								'focus:outline-none focus:ring-2',
								selected ? 'bg-white dark:bg-dark text-blue-700 shadow' : ' hover:bg-white/[0.50]'
							)
						}
					>
						Tab
					</Tab>
				</Tab.List>
				<Tab.Panels>
					<Tab.Panel className="w-full mx-4 p-2">{'ScreenshootTeamTab'}</Tab.Panel>
					<Tab.Panel className="w-full mx-4 p-2">{'AppsTab'}</Tab.Panel>
					<Tab.Panel className="w-full mx-4 p-2">{'VisitedSitesTab'}</Tab.Panel>
				</Tab.Panels>
			</Tab.Group>
		</div>
	);
};
