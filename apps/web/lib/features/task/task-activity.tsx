import { clsxm } from '@app/utils';
import { Tab } from '@headlessui/react';
import { Card } from 'lib/components';
import { ActivityFilters } from '@app/constants';
import React from 'react';

export function TaskActivity() {
	return (
		<Card
			className="w-full p-4 md:px-4 dark:bg-[#25272D] flex flex-col gap-6 border border-[#00000014] dark:border-[#26272C]"
			shadow="bigger"
		>
			<div className="shadow-lg rounded-lg p-4 bg-light dark:bg-dark border border-[#00000014] dark:border-[#26272C]">
				<h3 className="text-xl font-semibold py-2">{'05.01.2024'}</h3>
				<UserTaskActivity />
				<UserTaskActivity />
			</div>

			<div className="shadow-lg rounded-lg p-4 bg-light dark:bg-dark border border-[#00000014] dark:border-[#26272C]">
				<h3 className="text-xl font-semibold py-2">{'04.01.2024'}</h3>
				<UserTaskActivity />
			</div>

			<div className="shadow-lg rounded-lg p-4 bg-light dark:bg-dark border border-[#00000014] dark:border-[#26272C]">
				<h3 className="text-xl font-semibold py-2">{'03.01.2024'}</h3>
				<UserTaskActivity />
				<UserTaskActivity />
				<UserTaskActivity />
			</div>
		</Card>
	);
}

const UserTaskActivity = () => {
	return (
		<div className="shadow-md rounded-md  p-4 my-4 bg-[#00000014] dark:bg-[#26272C]">
			<div className="flex items-center gap-2 my-2">
				<h4 className="text-lg">{'Cedric medium'}</h4>
				<span>{'05:30'}</span>
			</div>
			<Tab.Group>
				<Tab.List className="w-full flex rounded-xl bg-gray-200 dark:bg-[#FFFFFF14] p-2">
					{Object.values(ActivityFilters).filter(filter => filter !== 'Tasks').map((filter: string) => (
                        <Tab
                            key={filter}
                            className={({ selected }) =>
                                clsxm(
                                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                                    ' focus:outline-none focus:ring-2',
                                    selected
                                        ? 'bg-white dark:bg-dark text-blue-700 shadow'
                                        : ' hover:bg-white/[0.50]'
                                )
                            }
                        >
                            {filter}
                        </Tab>
                    ))}
				</Tab.List>
				<Tab.Panels>
					<Tab.Panel className="w-full mx-4 py-4">{'Screenshoot Team Tab'}</Tab.Panel>
					<Tab.Panel className="w-full mx-4 py-4">{'Apps Tab'}</Tab.Panel>
					<Tab.Panel className="w-full mx-4 py-4">{'VisitedSites Tab'}</Tab.Panel>
				</Tab.Panels>
			</Tab.Group>
		</div>
	);
};
