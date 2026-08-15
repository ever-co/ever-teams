import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import React from 'react';
import { TeamsTimerForm, useTimer } from '@ever-teams/atoms';

const meta = {
	title: 'Time Trackers/Timer Form',
	component: TeamsTimerForm,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component:
					'A comprehensive timer form component that includes selectors for client, project, team, and task. Essential for setting up time tracking context before starting a timer. Uses the useTimer hook to manage timer state and provide realistic timer functionality.'
			}
		}
	},
	argTypes: {
		size: {
			control: 'select',
			options: ['default', 'sm', 'lg'],
			description: 'Size variant for all form controls'
		},
		currentTeamsState: {
			control: false,
			description: 'Current timer state object (managed by useTimer hook)'
		},
		setCurrentTeamsState: {
			control: false,
			description: 'State setter function (provided by useTimer hook)'
		},
		isTimerRunning: {
			control: false,
			description: 'Whether the timer is currently running (provided by useTimer hook)'
		}
	}
} satisfies Meta<typeof TeamsTimerForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {} as any,
	render: () => {
		const { currentTeamsState, setCurrentTeamsState, isRunning } = useTimer();
		return (
			<TeamsTimerForm
				size="default"
				currentTeamsState={currentTeamsState}
				setCurrentTeamsState={setCurrentTeamsState}
				isTimerRunning={isRunning}
			/>
		);
	}
};

export const Small: Story = {
	args: {} as any,
	render: () => {
		const { currentTeamsState, setCurrentTeamsState, isRunning } = useTimer();
		return (
			<TeamsTimerForm
				size="sm"
				currentTeamsState={currentTeamsState}
				setCurrentTeamsState={setCurrentTeamsState}
				isTimerRunning={isRunning}
			/>
		);
	}
};

export const Large: Story = {
	args: {} as any,
	render: () => {
		const { currentTeamsState, setCurrentTeamsState, isRunning } = useTimer();
		return (
			<TeamsTimerForm
				size="lg"
				currentTeamsState={currentTeamsState}
				setCurrentTeamsState={setCurrentTeamsState}
				isTimerRunning={isRunning}
			/>
		);
	}
};

export const InTimerWidget: Story = {
	args: {} as any,
	render: () => {
		const { currentTeamsState, setCurrentTeamsState, isRunning, startTimer, timerLoading } = useTimer();
		return (
			<div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Start Time Tracking</h2>
				<TeamsTimerForm
					size="default"
					currentTeamsState={currentTeamsState}
					setCurrentTeamsState={setCurrentTeamsState}
					isTimerRunning={isRunning}
				/>
				<div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
					<button
						onClick={startTimer}
						disabled={timerLoading}
						className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
					>
						{timerLoading ? 'Starting...' : isRunning ? 'Timer Running' : 'Start Timer'}
					</button>
				</div>
			</div>
		);
	}
};

export const InSidebar: Story = {
	args: {} as any,
	render: () => {
		const { currentTeamsState, setCurrentTeamsState, isRunning, startTimer, stopTimer, timerLoading } = useTimer();
		return (
			<div className="w-80 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4">
				<div className="space-y-6">
					<div>
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quick Timer Setup</h3>
						<TeamsTimerForm
							size="sm"
							currentTeamsState={currentTeamsState}
							setCurrentTeamsState={setCurrentTeamsState}
							isTimerRunning={isRunning}
						/>
					</div>
					<div className="space-y-2">
						<button
							onClick={isRunning ? stopTimer : startTimer}
							disabled={timerLoading}
							className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
						>
							{timerLoading ? 'Loading...' : isRunning ? '⏸ Pause Timer' : '▶ Start Timer'}
						</button>
					</div>
				</div>
			</div>
		);
	}
};

export const CompactLayout: Story = {
	args: {} as any,
	render: () => {
		const { currentTeamsState, setCurrentTeamsState, isRunning, startTimer, stopTimer, timerLoading } = useTimer();
		return (
			<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
				<div className="flex items-center gap-4">
					<div className="flex-1">
						<TeamsTimerForm
							size="sm"
							currentTeamsState={currentTeamsState}
							setCurrentTeamsState={setCurrentTeamsState}
							isTimerRunning={isRunning}
						/>
					</div>
					<button
						onClick={isRunning ? stopTimer : startTimer}
						disabled={timerLoading}
						className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded font-medium whitespace-nowrap"
					>
						{timerLoading ? 'Loading...' : isRunning ? 'Stop' : 'Start'}
					</button>
				</div>
			</div>
		);
	}
};

export const WithTimer: Story = {
	args: {} as any,
	render: () => {
		const {
			currentTeamsState,
			setCurrentTeamsState,
			isRunning,
			startTimer,
			stopTimer,
			hours,
			minutes,
			seconds,
			timerLoading
		} = useTimer();

		const formatTime = (h: number, m: number, s: number) => {
			return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		};

		return (
			<div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 max-w-lg">
				<div className="text-center mb-6">
					<div className="text-4xl font-mono font-bold text-gray-900 dark:text-white mb-2">
						{formatTime(hours, minutes, seconds)}
					</div>
					<p className="text-gray-500 dark:text-gray-400">
						{isRunning ? 'Tracking time...' : 'Ready to start tracking'}
					</p>
				</div>

				<div className="space-y-4">
					<TeamsTimerForm
						size="default"
						currentTeamsState={currentTeamsState}
						setCurrentTeamsState={setCurrentTeamsState}
						isTimerRunning={isRunning}
					/>

					<div className="flex gap-3">
						<button
							onClick={startTimer}
							disabled={timerLoading || isRunning}
							className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
						>
							▶ Start
						</button>

						<button
							onClick={stopTimer}
							disabled={timerLoading}
							className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
						>
							⏹ Stop
						</button>
					</div>
				</div>
			</div>
		);
	}
};

export const MobileView: Story = {
	args: {} as any,
	render: () => {
		const { currentTeamsState, setCurrentTeamsState, isRunning, startTimer, timerLoading } = useTimer();
		return (
			<div className="w-full max-w-sm mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-lg">
				<div className="p-4 border-b border-gray-200 dark:border-gray-700">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center">Time Tracker</h2>
				</div>
				<div className="p-4 space-y-4">
					<TeamsTimerForm
						size="default"
						currentTeamsState={currentTeamsState}
						setCurrentTeamsState={setCurrentTeamsState}
						isTimerRunning={isRunning}
					/>
					<button
						onClick={startTimer}
						disabled={timerLoading}
						className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
					>
						{timerLoading ? 'Starting...' : isRunning ? 'Tracking...' : 'Start Tracking'}
					</button>
				</div>
			</div>
		);
	}
};

export const QuickStart: Story = {
	args: {} as any,
	render: () => {
		const { currentTeamsState, setCurrentTeamsState, isRunning, startTimer, timerLoading } = useTimer();
		return (
			<div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-lg">
				<div className="max-w-md mx-auto">
					<div className="text-center mb-6">
						<h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Quick Start</h2>
						<p className="text-gray-600 dark:text-gray-400">Set up your timer in seconds</p>
					</div>

					<div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
						<TeamsTimerForm
							size="default"
							currentTeamsState={currentTeamsState}
							setCurrentTeamsState={setCurrentTeamsState}
							isTimerRunning={isRunning}
						/>
						<div className="mt-4 flex gap-2">
							<button
								onClick={startTimer}
								disabled={timerLoading}
								className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded transition-colors"
							>
								{timerLoading ? 'Starting...' : isRunning ? 'Running...' : 'Start Now'}
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
};
