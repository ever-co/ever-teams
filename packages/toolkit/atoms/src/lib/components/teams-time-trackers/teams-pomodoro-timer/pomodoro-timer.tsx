'use client';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@ever-teams/toolkit-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import TaskList, { ITask } from './task-list';
import TimerCustomization from './timer-customization';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useTimer } from '@lib/hooks/useTimer';
import { useTeamsContext } from '@lib/context/teams-context';

interface TimerPreset {
	name: TimerLevel;
	minutes: number;
	color: string;
	restMinutes: number;
	longRestMinutes: number;
}

const defaultButtonStyle =
	'text-[10px] whitespace-nowrap xs:text-xs text-white/40 px-2 xs:px-2.5 md:px-3.5 py-1 xs:py-1.5 md:py-2 rounded transition-colors text-gray-500 dark:hover:text-white border border-transparent ';
const defaultActiveButtonStyle = '!rounded-[8px] bg-gray-100 shadow-[0px_2.472px_9.887px_rgba(0,0,0,0.16)]';

type TimerState = 'idle' | 'running' | 'paused';
type TimerLevel = 'very_short' | 'short' | 'medium' | 'long' | 'custom';
type TimerType = 'pomodoro' | 'rest' | 'longRest';
const buttonTopClassNames: Record<TimerType | 'default', string> = {
	default: '',
	pomodoro: cn(defaultActiveButtonStyle, 'border-[#A16BFB] bg-[#A16BFB]/15 text-[#A16BFB] hover:text-[#A16BFB]'),
	rest: cn(defaultActiveButtonStyle, 'border-[#22AE83] bg-[#22AE83]/15 text-[#22AE83] hover:text-[#22AE83]'),
	longRest: cn(defaultActiveButtonStyle, 'border-[#14b8a6] bg-[#14b8a6]/15 text-[#14b8a6] hover:text-[#14b8a6]')
};
const pomodoroBg = {
	pomodoro: 'bg-[#A16BFB]/15',
	rest: 'bg-[#22AE83]/15',
	longRest: 'bg-[#14b8a6]/15'
};
const pomodoroBorder = {
	pomodoro: 'text-[#A16BFB]/30',
	rest: 'text-[#22AE83]/30',
	longRest: 'text-[#14b8a6]/30'
};
const buttonColor = {
	pomodoro: 'border-[#A16BFB] bg-[#A16BFB]/80 text-white hover:bg-[#A16BFB]',
	rest: 'border-[#22AE83] bg-[#22AE83]/80 text-white hover:bg-[#22AE83]',
	longRest: 'border-[#14b8a6] bg-[#14b8a6]/80 text-white hover:bg-[#14b8a6]'
};
const borderButtonColor = {
	pomodoro: 'border-[#A16BFB] text-[#A16BFB] hover:text-white hover:bg-[#A16BFB]/80',
	rest: 'border-[#22AE83] text-[#22AE83] hover:text-white hover:bg-[#22AE83]/80',
	longRest: 'border-[#14b8a6] text-[#14b8a6] hover:text-white  hover:bg-[#14b8a6]/80'
};
interface TimerPreset {
	name: TimerLevel;
	minutes: number;
	color: string;
	restMinutes: number;
	longRestMinutes: number;
}

const timerPresets: TimerPreset[] = [
	{ name: 'very_short', minutes: 15, color: 'bg-purple-600', restMinutes: 5, longRestMinutes: 15 },
	{ name: 'short', minutes: 20, color: 'bg-purple-600', restMinutes: 5, longRestMinutes: 15 },
	{ name: 'medium', minutes: 25, color: 'bg-purple-600', restMinutes: 5, longRestMinutes: 15 },
	{ name: 'long', minutes: 30, color: 'bg-purple-600', restMinutes: 5, longRestMinutes: 20 },
	{ name: 'custom', minutes: 25, color: '#A16BFB', restMinutes: 5, longRestMinutes: 15 }
];

const pomodoroTimerVariants = cva(
	'w-full mt-10 md:mt-0 mx-auto bg-white dark:bg-black text-white rounded-xl overflow-hidden border border-gray-200 dark:border-white/20',
	{
		variants: {
			size: {
				sm: 'max-w-[500px]',
				md: 'max-w-[755px]',
				lg: 'max-w-[900px]'
			},
			variant: {
				default: '',
				compact: '',
				minimal: ''
			},
			border: {
				none: 'border-gray-200 dark:border-white/20',
				bordered: 'border-2'
			}
		},
		defaultVariants: {
			size: 'md',
			variant: 'default',
			border: 'none'
		}
	}
);

const pomodoroContainerVariants = cva('', {
	variants: {
		size: {
			sm: 'p-3',
			md: 'p-4',
			lg: 'p-6'
		},
		variant: {
			default: '',
			compact: 'space-y-4',
			minimal: 'space-y-6'
		}
	},
	defaultVariants: {
		size: 'md',
		variant: 'default'
	}
});

const pomodoroTimerCircleVariants = cva('relative w-full aspect-square rounded-full flex items-center justify-center', {
	variants: {
		size: {
			sm: 'min-w-44 min-h-44 xs:min-w-48 xs:min-h-48 sm:min-w-52 sm:min-h-52',
			md: 'min-w-52 xs:min-w-56 min-h-52 xs:min-h-56 sm:min-w-60 sm:min-h-60 md:min-w-72 md:min-h-72',
			lg: 'min-w-60 xs:min-w-64 min-h-60 xs:min-h-64 sm:min-w-72 sm:min-h-72 md:min-w-80 md:min-h-80 lg:min-w-96 lg:min-h-96'
		}
	},
	defaultVariants: {
		size: 'md'
	}
});

const pomodoroTimerTextVariants = cva('text-black dark:text-white font-bold mb-1', {
	variants: {
		size: {
			sm: 'text-2xl md:text-3xl lg:text-4xl',
			md: 'text-3xl md:text-4xl lg:text-5xl xl:text-6xl',
			lg: 'text-4xl md:text-5xl lg:text-6xl xl:text-7xl'
		}
	},
	defaultVariants: {
		size: 'md'
	}
});

const pomodoroButtonVariants = cva(
	'flex justify-center items-center gap-2 w-full text-white border font-medium transition-colors rounded-full',
	{
		variants: {
			size: {
				sm: 'text-xs py-2 px-4',
				md: 'text-xs xs:text-sm md:text-base py-2 sm:py-2.5 md:py-3 px-6',
				lg: 'text-sm md:text-base lg:text-lg py-3 sm:py-3.5 md:py-4 px-8'
			}
		},
		defaultVariants: {
			size: 'md'
		}
	}
);

export interface TeamsPomodoroTimerProps extends VariantProps<typeof pomodoroTimerVariants> {
	className?: string;
}

export function TeamsPomodoroTimer({
	className,
	size = 'md',
	variant = 'default',
	border = 'none'
}: TeamsPomodoroTimerProps): React.JSX.Element {
	const [timerState, setTimerState] = useState<TimerState>('idle');
	const [timerType, setTimerType] = useState<TimerType>('pomodoro');
	const [currentPreset, setCurrentPreset] = useState<TimerPreset>(timerPresets[2]); // Medium by default
	const [timeLeft, setTimeLeft] = useState(currentPreset.minutes * 60);
	const [totalTime, setTotalTime] = useState(currentPreset.minutes * 60);
	const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
	const [customMinutes, setCustomMinutes] = useState(25);
	const [customRestMinutes, setCustomRestMinutes] = useState(5);
	const [customLongRestMinutes, setCustomLongRestMinutes] = useState(15);
	const [pomodoroCount, setPomodoroCount] = useState(0);
	const [restCount, setRestCount] = useState(0);
	const [longRestCount, setLongRestCount] = useState(0);
	const [tasks, setTasks] = useState<{ id: string; text: string; completed: boolean }[]>([]);
	const [newTask, setNewTask] = useState('');
	const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
	const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
	const [editingTaskText, setEditingTaskText] = useState('');
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const { t } = useTranslation();

	// API integration hooks
	const { authenticatedUser } = useTeamsContext();
	const { startTimer: apiStartTimer, stopTimer: apiStopTimer, isRunning: apiIsRunning, timerLoading } = useTimer();

	// Refs to capture current values for use in setInterval callbacks (avoids stale closures)
	const apiStopTimerRef = useRef(apiStopTimer);
	const authenticatedUserRef = useRef(authenticatedUser);
	const apiIsRunningRef = useRef(apiIsRunning);

	// Keep refs updated with latest values
	useEffect(() => {
		apiStopTimerRef.current = apiStopTimer;
		authenticatedUserRef.current = authenticatedUser;
		apiIsRunningRef.current = apiIsRunning;
	}, [apiStopTimer, authenticatedUser, apiIsRunning]);

	// Set initial time when preset or timer type changes
	useEffect(() => {
		let newTimeLeft = 0;

		if (timerType === 'pomodoro') {
			newTimeLeft = currentPreset.name === 'custom' ? customMinutes * 60 : currentPreset.minutes * 60;
		} else if (timerType === 'rest') {
			newTimeLeft = currentPreset.name === 'custom' ? customRestMinutes * 60 : currentPreset.restMinutes * 60;
		} else {
			// longRest
			newTimeLeft =
				currentPreset.name === 'custom' ? customLongRestMinutes * 60 : currentPreset.longRestMinutes * 60;
		}

		setTimeLeft(newTimeLeft);
		setTotalTime(newTimeLeft);

		// Reset timer state when changing presets or timer type
		if (timerState !== 'idle') {
			setTimerState('idle');
			if (timerRef.current) {
				clearInterval(timerRef.current);
				timerRef.current = null;
			}
		}
	}, [currentPreset, customMinutes, customRestMinutes, customLongRestMinutes, timerType]);

	// Timer countdown logic - only handles decrementing time
	useEffect(() => {
		if (timerState === 'running') {
			timerRef.current = setInterval(() => {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						// Timer finished - just return 0, completion logic is handled in a separate effect
						clearInterval(timerRef.current as NodeJS.Timeout);
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		} else if (timerState === 'paused' && timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}

		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, [timerState]);

	// Timer completion logic - handles side effects when timer reaches 0
	// This runs in a separate effect to avoid duplicate executions from state setter callbacks
	useEffect(() => {
		if (timeLeft === 0 && timerState === 'running') {
			if (timerType === 'pomodoro') {
				// Pomodoro finished - stop API timer
				if (authenticatedUserRef.current && apiIsRunningRef.current) {
					apiStopTimerRef.current().catch((error) => {
						console.error('Failed to stop API timer on completion:', error);
					});
				}

				// Increment pomodoro count
				setPomodoroCount((prev) => prev + 1);

				// Every 4 pomodoros, take a long rest
				if ((pomodoroCount + 1) % 4 === 0) {
					const newTime =
						currentPreset.name === 'custom'
							? customLongRestMinutes * 60
							: currentPreset.longRestMinutes * 60;
					setTimerType('longRest');
					setTimeLeft(newTime);
					setTotalTime(newTime);
				} else {
					const newTime =
						currentPreset.name === 'custom' ? customRestMinutes * 60 : currentPreset.restMinutes * 60;
					setTimerType('rest');
					setTimeLeft(newTime);
					setTotalTime(newTime);
				}
			} else if (timerType === 'rest') {
				// Rest finished, increment counter and start next pomodoro
				setRestCount((prev) => prev + 1);
				const newTime = currentPreset.name === 'custom' ? customMinutes * 60 : currentPreset.minutes * 60;
				setTimerType('pomodoro');
				setTimeLeft(newTime);
				setTotalTime(newTime);
			} else {
				// longRest finished, increment counter and start next pomodoro
				setLongRestCount((prev) => prev + 1);
				const newTime = currentPreset.name === 'custom' ? customMinutes * 60 : currentPreset.minutes * 60;
				setTimerType('pomodoro');
				setTimeLeft(newTime);
				setTotalTime(newTime);
			}
		}
	}, [
		timeLeft,
		timerState,
		timerType,
		pomodoroCount,
		currentPreset,
		customMinutes,
		customRestMinutes,
		customLongRestMinutes
	]);

	// Load tasks from localStorage on component mount
	useEffect(() => {
		const savedTasks = localStorage.getItem('pomodoro-tasks');
		if (savedTasks) {
			try {
				setTasks(JSON.parse(savedTasks) as ITask[]);
			} catch (e) {
				console.error('Failed to parse saved tasks', e);
			}
		}

		// Load counters from localStorage
		const savedPomodoroCount = localStorage.getItem('pomodoro-count');
		const savedRestCount = localStorage.getItem('rest-count');
		const savedLongRestCount = localStorage.getItem('long-rest-count');

		if (savedPomodoroCount) setPomodoroCount(Number.parseInt(savedPomodoroCount));
		if (savedRestCount) setRestCount(Number.parseInt(savedRestCount));
		if (savedLongRestCount) setLongRestCount(Number.parseInt(savedLongRestCount));
	}, []);

	// Save tasks to localStorage whenever they change
	useEffect(() => {
		localStorage.setItem('pomodoro-tasks', JSON.stringify(tasks));
	}, [tasks]);

	// Save counters to localStorage whenever they change
	useEffect(() => {
		localStorage.setItem('pomodoro-count', pomodoroCount.toString());
	}, [pomodoroCount]);

	useEffect(() => {
		localStorage.setItem('rest-count', restCount.toString());
	}, [restCount]);

	useEffect(() => {
		localStorage.setItem('long-rest-count', longRestCount.toString());
	}, [longRestCount]);

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	const handleStartStop = async () => {
		if (timerState === 'idle' || timerState === 'paused') {
			setTimerState('running');

			// Call API to start tracking (only for pomodoro sessions)
			if (timerType === 'pomodoro' && authenticatedUser) {
				try {
					await apiStartTimer();
				} catch (error) {
					console.error('API start timer failed:', error);
					// Timer continues running locally even if API fails
				}
			}
		} else {
			setTimerState('paused');

			// Call API to stop tracking (only for pomodoro sessions)
			if (timerType === 'pomodoro' && authenticatedUser && apiIsRunning) {
				try {
					await apiStopTimer();
				} catch (error) {
					console.error('API stop timer failed:', error);
				}
			}
		}
	};

	const handleReset = async () => {
		setTimerState('idle');
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}

		// Stop API timer if running (only for pomodoro sessions)
		if (timerType === 'pomodoro' && authenticatedUser && apiIsRunning) {
			try {
				await apiStopTimer();
			} catch (error) {
				console.error('Failed to stop API timer on reset:', error);
			}
		}

		// Reset time based on current timer type
		let newTime = 0;
		if (timerType === 'pomodoro') {
			newTime = currentPreset.name === 'custom' ? customMinutes * 60 : currentPreset.minutes * 60;
		} else if (timerType === 'rest') {
			newTime = currentPreset.name === 'custom' ? customRestMinutes * 60 : currentPreset.restMinutes * 60;
		} else {
			// longRest
			newTime = currentPreset.name === 'custom' ? customLongRestMinutes * 60 : currentPreset.longRestMinutes * 60;
		}
		setTimeLeft(newTime);
		setTotalTime(newTime);
	};

	const handleCustomize = () => {
		setIsCustomizationOpen(!isCustomizationOpen);
	};

	const selectPreset = (preset: TimerPreset) => {
		setCurrentPreset(preset);
		setIsCustomizationOpen(false);
	};

	const updateCustomValues = (minutes: number, restMins: number, longRestMins: number) => {
		setCustomMinutes(minutes);
		setCustomRestMinutes(restMins);
		setCustomLongRestMinutes(longRestMins);

		if (currentPreset.name === 'custom') {
			let newTime = 0;
			if (timerType === 'pomodoro') {
				newTime = minutes * 60;
			} else if (timerType === 'rest') {
				newTime = restMins * 60;
			} else {
				// longRest
				newTime = longRestMins * 60;
			}
			setTimeLeft(newTime);
			setTotalTime(newTime);
		}
	};

	const addTask = () => {
		if (newTask.trim()) {
			const newTaskItem = {
				id: Date.now().toString(),
				text: newTask,
				completed: false
			};
			setTasks((prevTasks) => [...prevTasks, newTaskItem]);
			setNewTask('');
		}
	};

	const toggleTaskCompletion = (id: string) => {
		setTasks((prevTasks) =>
			prevTasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task))
		);
	};

	const deleteTask = (id: string) => {
		setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
		if (activeTaskId === id) {
			setActiveTaskId(null);
		}
		if (editingTaskId === id) {
			setEditingTaskId(null);
		}
	};

	const deleteAllTasks = () => {
		setTasks([]);
		setActiveTaskId(null);
		setEditingTaskId(null);
	};

	const setActiveTask = (id: string) => {
		setActiveTaskId(id === activeTaskId ? null : id);
	};

	const startEditingTask = (id: string, text: string) => {
		setEditingTaskId(id);
		setEditingTaskText(text);
	};

	const saveEditedTask = () => {
		if (editingTaskId && editingTaskText.trim()) {
			setTasks((prevTasks) =>
				prevTasks.map((task) => (task.id === editingTaskId ? { ...task, text: editingTaskText } : task))
			);
			setEditingTaskId(null);
		}
	};

	const cancelEditingTask = () => {
		setEditingTaskId(null);
	};

	// Calculate progress percentage (inverse - starts at 0 and grows to 100)
	const calculateProgress = () => {
		if (totalTime === 0) return 0;
		return 100 - (timeLeft / totalTime) * 100;
	};

	// Determine timer color based on timer type
	// const getTimerColor = (): string => {
	// 	if (timerType === 'pomodoro') return 'from-purple-700 to-purple-900';
	// 	if (timerType === 'rest') return 'from-green-500 to-green-800';
	// 	return 'from-teal-500 to-teal-800';
	// };

	const getButtonColor = (): string => {
		return timerState === 'running' ? borderButtonColor[timerType] : buttonColor[timerType];
	};

	const getProgressColor = (): string => {
		if (timerType === 'pomodoro') return '#9333ea';
		if (timerType === 'rest') return '#22c55e';
		return '#14b8a6';
	};

	const getTextColor = (): string => {
		if (timerType === 'pomodoro') return 'text-purple-500';
		if (timerType === 'rest') return 'text-green-500';
		return 'text-teal-500';
	};

	const handleTimerTypeChange = (type: TimerType) => {
		setTimerType(type);

		// Reset timer state
		setTimerState('idle');
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}

		// Set appropriate time based on type
		let newTime = 0;
		if (type === 'pomodoro') {
			newTime = currentPreset.name === 'custom' ? customMinutes * 60 : currentPreset.minutes * 60;
		} else if (type === 'rest') {
			newTime = currentPreset.name === 'custom' ? customRestMinutes * 60 : currentPreset.restMinutes * 60;
		} else {
			// longRest
			newTime = currentPreset.name === 'custom' ? customLongRestMinutes * 60 : currentPreset.longRestMinutes * 60;
		}
		setTimeLeft(newTime);
		setTotalTime(newTime);
	};

	// Calculate the circumference of the circle
	const circleRadius = 46;
	const circumference = 2 * Math.PI * circleRadius;

	// Get dynamic border color for bordered variant
	const getBorderedColor = () => {
		if (border !== 'bordered') return '';
		if (timerType === 'pomodoro') return 'border-[#A16BFB] dark:border-[#A16BFB]';
		if (timerType === 'rest') return 'border-[#22AE83] dark:border-[#22AE83]';
		return 'border-[#14b8a6] dark:border-[#14b8a6]'; // longRest
	};

	return (
		<div className={cn(pomodoroTimerVariants({ size, variant, border }), getBorderedColor(), className)}>
			<div className={cn(pomodoroContainerVariants({ size, variant }))}>
				<div
					className={cn(
						'flex flex-col sm:flex-row sm:justify-between items-center gap-5 pb-4 border-b border-b-[#8156C9]/40 relative',
						variant === 'compact' ? 'mb-4' : 'mb-6 sm:mb-6 md:mb-8 lg:mb-10 xl:mb-12'
					)}
				>
					<h1 className="text-sm font-semibold text-purple-500">{t('POMODORO.title')}</h1>
					<div className="flex gap-x-2">
						<button
							onClick={handleReset}
							className="text-xs text-gray-400 dark:hover:text-white px-2 py-1 rounded-md flex gap-1.5 items-center"
						>
							<svg
								width={25}
								height={24}
								viewBox="0 0 25 24"
								className="size-5 shrink-0"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M9.22727 5.08039C10.0973 4.82039 11.0573 4.65039 12.1173 4.65039C16.9073 4.65039 20.7873 8.53039 20.7873 13.3204C20.7873 18.1104 16.9073 21.9904 12.1173 21.9904C7.32727 21.9904 3.44727 18.1104 3.44727 13.3204C3.44727 11.5404 3.98727 9.88039 4.90727 8.50039"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								<path
									d="M7.98633 5.32L10.8763 2"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
								<path
									d="M7.98633 5.32031L11.3563 7.78031"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
							<span>{t('POMODORO.reset')}</span>
						</button>
						{variant !== 'minimal' && (
							<button
								onClick={handleCustomize}
								className="text-xs bg-purple-500 dark:bg-[#8156C9]/30 border rounded-xl dark:border-[#8156C9] text-white px-2 py-1 flex gap-1.5 items-center"
							>
								<svg
									width={19}
									height={18}
									viewBox="0 0 19 18"
									className="size-4"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										d="M16.6172 4.875H12.1172"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeMiterlimit={10}
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M4.61719 4.875H1.61719"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeMiterlimit={10}
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M7.61719 7.5C9.06694 7.5 10.2422 6.32475 10.2422 4.875C10.2422 3.42525 9.06694 2.25 7.61719 2.25C6.16744 2.25 4.99219 3.42525 4.99219 4.875C4.99219 6.32475 6.16744 7.5 7.61719 7.5Z"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeMiterlimit={10}
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M16.6172 13.125H13.6172"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeMiterlimit={10}
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M6.11719 13.125H1.61719"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeMiterlimit={10}
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
									<path
										d="M10.6172 15.75C12.0669 15.75 13.2422 14.5747 13.2422 13.125C13.2422 11.6753 12.0669 10.5 10.6172 10.5C9.16744 10.5 7.99219 11.6753 7.99219 13.125C7.99219 14.5747 9.16744 15.75 10.6172 15.75Z"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeMiterlimit={10}
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
								{t('POMODORO.customize')}
							</button>
						)}
					</div>

					{variant !== 'minimal' && (
						<AnimatePresence>
							{isCustomizationOpen && (
								<TimerCustomization
									presets={timerPresets}
									currentPreset={currentPreset}
									onSelectPreset={selectPreset}
									customMinutes={customMinutes}
									customRestMinutes={customRestMinutes}
									customLongRestMinutes={customLongRestMinutes}
									onUpdateCustomValues={updateCustomValues}
									onClose={() => setIsCustomizationOpen(false)}
								/>
							)}
						</AnimatePresence>
					)}
				</div>
				<div className="flex flex-col items-center w-full pb-4 border-b border-b-[#8156C9]/40">
					<div className="flex flex-col items-center w-full max-w-[395px] mx-auto mb-5">
						<div className="flex items-center justify-center mb-4 sm:mb-5 md:mb-6 lg:mb-8 xl:mb-10">
							<div className="flex items-center gap-x-2 text-sm bg-white dark:bg-black border border-gray-200 dark:border-[#222] rounded-[14px]">
								<button
									onClick={() => handleTimerTypeChange('pomodoro')}
									className={cn(
										defaultButtonStyle,
										buttonTopClassNames[timerType === 'pomodoro' ? timerType : 'default']
									)}
								>
									{t('POMODORO.pomodoro')}{' '}
									<span className="dark:group-active:text-white text-inherit">{pomodoroCount}</span>
								</button>
								<button
									onClick={() => handleTimerTypeChange('rest')}
									className={cn(
										defaultButtonStyle,
										buttonTopClassNames[timerType === 'rest' ? timerType : 'default']
									)}
								>
									{t('POMODORO.break')} {restCount}
								</button>
								<button
									onClick={() => handleTimerTypeChange('longRest')}
									className={cn(
										defaultButtonStyle,
										buttonTopClassNames[timerType === 'longRest' ? timerType : 'default']
									)}
								>
									{t('POMODORO.long_break')} {longRestCount}
								</button>
							</div>
						</div>

						<div
							className={cn(
								'relative flex justify-center items-center',
								variant === 'compact' ? 'mb-4' : 'mb-6 sm:mb-6 md:mb-8 lg:mb-10 xl:mb-12'
							)}
						>
							<div className={cn(pomodoroTimerCircleVariants({ size }), pomodoroBg[timerType])}>
								{/* SVG Circle Progress */}
								<svg
									className={cn(
										'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aspect-square size-[106%] -rotate-90 transition-colors duration-300',
										pomodoroBorder[timerType]
									)}
									viewBox="0 0 100 100"
								>
									{/* Background circle */}
									<circle
										cx="50"
										cy="50"
										r={circleRadius}
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									/>
									{/* Progress circle - starts small and grows */}
									<motion.circle
										cx="50"
										cy="50"
										r={circleRadius}
										fill="none"
										stroke={getProgressColor()}
										strokeWidth="2"
										strokeLinecap="round"
										strokeDasharray={circumference}
										// Start with full dashoffset (invisible) and decrease to show more of the circle
										strokeDashoffset={circumference - (calculateProgress() / 100) * circumference}
										initial={false}
										animate={{
											strokeDashoffset:
												circumference - (calculateProgress() / 100) * circumference
										}}
										transition={{
											duration: timerState === 'running' ? 1 : 0.3,
											ease: 'linear'
										}}
									/>
								</svg>

								<div className="flex flex-col items-center z-10">
									<motion.div
										className={cn(pomodoroTimerTextVariants({ size }))}
										key={timeLeft}
										initial={{ opacity: 0.8, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={{ duration: 0.2 }}
									>
										{formatTime(timeLeft)}
									</motion.div>
									<div className="flex flex-col gap-1 items-center text-center text-gray-400 mt-1">
										<span className="text-sm">{t('POMODORO.LEVEL.title')}</span>
										<span className={cn('text-base font-medium capitalize', getTextColor())}>
											{t(`POMODORO.LEVEL.${currentPreset.name}`)}
										</span>
									</div>
								</div>
							</div>
						</div>

						<motion.button
							className={cn(
								pomodoroButtonVariants({ size }),
								getButtonColor(),
								timerLoading && 'opacity-70 cursor-not-allowed'
							)}
							whileTap={timerLoading ? undefined : { scale: 0.95 }}
							onClick={handleStartStop}
							disabled={timerLoading}
						>
							{timerLoading && <Loader2 className="h-3 w-3 animate-spin" />}
							{timerState === 'running' ? t('POMODORO.stop') : t('POMODORO.start')}
						</motion.button>
					</div>
				</div>

				{variant !== 'minimal' && (
					<TaskList
						tasks={tasks}
						newTask={newTask}
						onNewTaskChange={setNewTask}
						onAddTask={addTask}
						onToggleCompletion={toggleTaskCompletion}
						onDeleteTask={deleteTask}
						onDeleteAllTasks={deleteAllTasks}
						onSetActiveTask={setActiveTask}
						activeTaskId={activeTaskId}
						editingTaskId={editingTaskId}
						editingTaskText={editingTaskText}
						onEditingTaskTextChange={setEditingTaskText}
						onStartEditingTask={startEditingTask}
						onSaveEditedTask={saveEditedTask}
						onCancelEditingTask={cancelEditingTask}
					/>
				)}
			</div>
		</div>
	);
}
