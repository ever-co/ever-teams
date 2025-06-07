import React from 'react';
import { clsxm } from '@/core/lib/utils';
import { Tab } from '@headlessui/react';
import { ActivityFilters } from '@/core/constants/config/constants';
import { ChevronDownIcon, ChevronUpIcon } from 'assets/svg';
import ScreenshotItem from '../pages/profile/screenshots/screenshot-item';
import { Tooltip } from '../duplicated-components/tooltip';
import { TActivity } from '@/core/types/schemas';

export const UserTaskActivity = ({ timesheet }: { timesheet: TActivity }) => {
	const [hidden, setHidden] = React.useState(true);
	// TODO: fetch Apps et Sites Visited
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
							<ChevronDownIcon className="h-4 w-4 text-[#293241] dark:text-white cursor-pointer" />
						) : (
							<ChevronUpIcon className="h-4 w-4 text-[#293241] dark:text-white cursor-pointer" />
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
						<Tab.Panel className="w-full py-4 mx-4">
							<div className="flex w-full my-2 overflow-x-auto">
								{timesheet.timeSlot?.screenshots?.map((screenshot, i) => (
									<div key={i} className="w-1/3 min-w-[20rem] p-2">
										<Tooltip
											label={screenshot.description || ''}
											placement="left-start"
											type="VERTICAL"
											labelContainerClassName="w-full"
										>
											<ScreenshotItem
												idSlot={timesheet.timeSlot?.id ?? ''}
												endTime={timesheet.timeSlot?.stoppedAt ?? ''}
												startTime={screenshot.recordedAt || ''}
												imageUrl={screenshot.thumbUrl || ''}
												percent={timesheet.timeSlot?.percentage ?? 0}
												showProgress={false}
												onShow={() => null}
											/>
										</Tooltip>
										<div className="bg-gray-100 dark:dark:bg-[#26272C] rounded-b-lg p-2">
											<h5>Source</h5>
											<div className="flex flex-wrap gap-1 my-1">
												<span className="px-1 mb-1 text-white bg-blue-600 rounded-lg">
													{timesheet.source}
												</span>
												{Array.isArray(screenshot.apps) &&
													screenshot.apps.map((app: string, i: number) => (
														<span
															key={i}
															className="px-1 mb-1 text-white bg-blue-600 rounded-lg"
														>
															{app}
														</span>
													))}
											</div>
										</div>
									</div>
								))}
							</div>
						</Tab.Panel>
						<Tab.Panel className="w-full py-4 mx-4">{'Apps Tab'}</Tab.Panel>
						<Tab.Panel className="w-full py-4 mx-4">{'VisitedSites Tab'}</Tab.Panel>
					</Tab.Panels>
				</Tab.Group>
			</div>
		</div>
	);
};
