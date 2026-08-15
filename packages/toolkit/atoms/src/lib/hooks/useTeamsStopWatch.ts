import { useState, useRef } from 'react';
import { ITimerStatus } from '@ever-teams/toolkit-types';

export type TimeValues = {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	milliseconds: number;
	totalSeconds: number;
};

type UseTeamsStopWatchReturn = TimeValues & {
	start: () => void;
	pause: () => void;
	reset: () => void;
	isRunning: boolean;
	time: Date;
	setTime: React.Dispatch<React.SetStateAction<Date>>;
	timerStatus: ITimerStatus;
	todayTrackedTime: TimeValues;
	setTodayTrackedTime: React.Dispatch<React.SetStateAction<Date>>;
};

function useTeamsStopWatch(timerStatus: ITimerStatus): UseTeamsStopWatchReturn {
	const [time, setTime] = useState<Date>(new Date(0));
	const [todayTrackedTime, setTodayTrackedTime] = useState<Date>(new Date(0));
	const [isRunning, setIsRunning] = useState<boolean>(false);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);

	const start = () => {
		if (!isRunning) {
			setIsRunning(true);
			intervalRef.current = setInterval(() => {
				setTime((prevTime) => new Date(prevTime.getTime() + 1000));
				setTodayTrackedTime((prevTime) => new Date(prevTime.getTime() + 1000));
			}, 1000);
		}
	};

	const pause = () => {
		if (isRunning) {
			setIsRunning(false);
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		}
	};

	const reset = () => {
		setTime(new Date(0));
		setIsRunning(false);
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
		}
	};

	const calculateTime = (time: Date): TimeValues => {
		const milliseconds = time.getMilliseconds();
		const totalSeconds = Math.floor(time.getTime() / 1000);
		const seconds = totalSeconds % 60;
		const minutes = Math.floor(totalSeconds / 60) % 60;
		const hours = Math.floor(totalSeconds / 3600) % 24;
		const days = Math.floor(totalSeconds / 86400);
		return { days, hours, minutes, seconds, milliseconds, totalSeconds };
	};

	return {
		todayTrackedTime: calculateTime(todayTrackedTime),
		setTodayTrackedTime,
		...calculateTime(time),
		start,
		pause,
		reset,
		isRunning,
		time,
		setTime,
		timerStatus
	};
}

export { useTeamsStopWatch };
