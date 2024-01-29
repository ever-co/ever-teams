import React from 'react';
import { clsxm } from '@app/utils';
import { Tab } from '@headlessui/react';
import { ActivityFilters } from '@app/constants';
import { ITaskTimesheet } from '@app/interfaces';
import { ChevronDownIcon, ChevronUpIcon } from 'lib/components/svgs';

export const UserTaskActivity = ({ timesheet }: { timesheet: ITaskTimesheet }) => {
	const [hidden, setHidden] = React.useState(true);
	return (
		<div className="shadow-md rounded-md  p-4 my-4 bg-[#00000014] dark:bg-[#26272C]">
			<div className="flex justify-between items-center gap-5 py-2 border-b border-b-[#00000014] dark:border-b-[#7B8089]">
				<div className="flex items-center gap-2 my-2">
					<h4 className="text-base">{timesheet.employee?.fullName}</h4>
					<span>{timesheet.duration}</span>
				</div>

				<div className="flex items-center justify-end gap-2.5">
					<button onClick={() => setHidden((e) => !e)}>
						{hidden ? (
							<ChevronDownIcon className="h-4 w-4 stroke-[#293241] dark:stroke-white cursor-pointer" />
						) : (
							<ChevronUpIcon className="h-4 w-4 stroke-[#293241] dark:stroke-white cursor-pointer" />
						)}
					</button>
				</div>
			</div>
			<div className={clsxm('flex flex-col max-h-80 gap-3', hidden && ['hidden'])}>
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
		</div>
	);
};
