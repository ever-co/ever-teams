import { clsxm } from '@app/utils';
import { Tab } from '@headlessui/react';
import { ActivityFilters } from '@app/constants';

export const UserTaskActivity = () => {
	// get slots related to Task Id
	// get apps visited related to Task Id
	// get visited Sites related to Task Id
	return (
		<div className="shadow-md rounded-md  p-4 my-4 bg-[#00000014] dark:bg-[#26272C]">
			<div className="flex items-center gap-2 my-2">
				<h4 className="text-lg">{'Cedric medium'}</h4>
				<span>{'05:30'}</span>
			</div>
			<Tab.Group>
				<Tab.List className="w-full flex rounded-xl bg-gray-200 dark:bg-[#FFFFFF14] p-2">
					{Object.values(ActivityFilters)
						.filter((filter) => filter !== 'Tasks')
						.map((filter: string) => (
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
