'use client';

import { Modal, Avatar } from '@/core/components';
import { ITimerEmployeeLog } from '@/core/types/interfaces/timer/ITimerLog';
import { useState, useMemo } from 'react';

interface ActivityModalProps {
	employeeLog: ITimerEmployeeLog;
	isOpen: boolean;
	closeModal: () => void;
}

type TabType = 'tracked' | 'activity';

interface CircleProps {
	color: string;
	dashArray: string;
	dashOffset?: string;
}

const Circle = ({ color, dashArray, dashOffset = '0' }: CircleProps) => (
	<circle
		cx="50"
		cy="50"
		r="40"
		fill="none"
		stroke={color}
		strokeWidth="20"
		strokeDasharray={`${dashArray} 251.327`}
		strokeDashoffset={dashOffset}
		className="transition-all duration-1000 ease-in-out"
	/>
);

const LegendItem = ({
	color,
	label,
	time,
	percentage
}: {
	color: string;
	label: string;
	time: string;
	percentage: number;
}) => (
	<div className="flex gap-16 w-full justify-between items-center text-[14px] text-[#60646C]">
		<div className="flex items-center space-x-2">
			<div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
			<span className="text-gray-700 dark:text-gray-300 text-[14px]">{label}</span>
		</div>
		<span className="font-normal text-[#60646C] dark:text-gray-100 text-[14px]">
			{time} ({percentage}%)
		</span>
	</div>
);

const formatTime = (minutes: number): string => {
	const hours = Math.floor(minutes / 60);
	const mins = Math.floor(minutes % 60);
	return `${hours}h ${mins.toString().padStart(2, '0')}min`;
};

export const ActivityModal = ({ employeeLog, isOpen, closeModal }: ActivityModalProps) => {
	const [activeTab, setActiveTab] = useState<TabType>('activity');

	const timeCalculations = useMemo(() => {
		const totalTime = employeeLog.sum || 0;
		return {
			totalTime,
			activeTime: totalTime * 0.57,
			idleTime: totalTime * 0.13,
			unknownTime: totalTime * 0.3,
			trackedTime: totalTime * 0.75,
			manualTime: totalTime * 0.25
		};
	}, [employeeLog.sum]);

	const { activeTime, idleTime, unknownTime, trackedTime, manualTime } = timeCalculations;

	const formattedTimes = useMemo(
		() => ({
			active: formatTime(activeTime),
			idle: formatTime(idleTime),
			unknown: formatTime(unknownTime),
			tracked: formatTime(trackedTime),
			manual: formatTime(manualTime)
		}),
		[activeTime, idleTime, unknownTime, trackedTime, manualTime]
	);

	return (
		<Modal
			isOpen={isOpen}
			closeModal={closeModal}
			className="bg-light--theme-light dark:bg-dark--theme-light rounded-xl w-full md:w-40 md:min-w-[32rem] justify-start flex flex-col items-center h-[auto]"
			titleClass="font-bold flex justify-start w-full"
		>
			<div className="flex flex-col w-full items-center gap-4 justify-start min-w-fit md:w-[32rem] p-4">
				<div className="flex items-center justify-between w-full mb-2">
					<div className="flex items-center space-x-3">
						<Avatar
							size={30}
							imageUrl={employeeLog.employee.user?.imageUrl}
							imageTitle={employeeLog.employee.fullName}
							className="relative"
						/>
						<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
							{employeeLog.employee.fullName}
						</h3>
					</div>
				</div>

				<div className="flex p-1 min-w-full max-w-fit space-x-2 w-full bg-gray-100 dark:bg-[#1B1D22] rounded-lg">
					{(['tracked', 'activity'] as const).map((tab) => (
						<button
							key={tab}
							role="tab"
							aria-selected={activeTab === tab}
							aria-label={tab === 'tracked' ? 'Show tracked vs manual time' : 'Show activity breakdown'}
							onClick={() => setActiveTab(tab)}
							className={`flex-1 px-4 py-2 rounded-md transition-all duration-200 text-nowrap ${
								activeTab === tab
									? 'bg-white shadow-sm dark:bg-dark--theme-light text-primary dark:text-primary-light font-normal'
									: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
							}`}
						>
							{tab === 'tracked' ? 'Tracked vs Manual' : 'Activity Breakdown'}
						</button>
					))}
				</div>

				<div className="relative mt-8">
					{activeTab === 'tracked' ? (
						<div className="transition-opacity duration-200 ease-in-out">
							<div className="relative w-48 h-48 mx-auto mb-8">
								<svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
									<Circle color="#2563EB" dashArray="188.49556" />
									<Circle color="#9333EA" dashArray="62.83185" dashOffset="-188.49556" />
								</svg>
							</div>

							<div className="flex gap-4 space-y-4">
								<LegendItem
									color="#2563EB"
									label="Tracked Time"
									time={formattedTimes.tracked}
									percentage={75}
								/>
								<LegendItem
									color="#9333EA"
									label="Manual Time"
									time={formattedTimes.manual}
									percentage={25}
								/>
							</div>
						</div>
					) : (
						<div className="transition-opacity duration-200 ease-in-out">
							<div className="relative w-48 h-48 mx-auto mb-8">
								<svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
									<Circle color="#2563EB" dashArray="143.25639" />
									<Circle color="#F59E0B" dashArray="32.67251" dashOffset="-143.25639" />
									<Circle color="#EF4444" dashArray="75.3981" dashOffset="-175.9289" />
								</svg>
							</div>

							<div className="space-y-4">
								<LegendItem
									color="#2563EB"
									label="Active Time"
									time={formattedTimes.active}
									percentage={57}
								/>
								<LegendItem
									color="#F59E0B"
									label="Idle Time"
									time={formattedTimes.idle}
									percentage={13}
								/>
								<LegendItem
									color="#EF4444"
									label="Unknown Activity"
									time={formattedTimes.unknown}
									percentage={30}
								/>
							</div>
						</div>
					)}
				</div>
			</div>
		</Modal>
	);
};
