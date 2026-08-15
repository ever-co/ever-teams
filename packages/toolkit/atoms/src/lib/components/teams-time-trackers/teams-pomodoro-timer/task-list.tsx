'use client';

import type React from 'react';

import { Check, MoreHorizontal, Plus, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface ITask {
	id: string;
	text: string;
	completed: boolean;
}

export interface ITaskListProps {
	tasks: ITask[];
	newTask: string;
	onNewTaskChange: (value: string) => void;
	onAddTask: () => void;
	onToggleCompletion: (id: string) => void;
	onDeleteTask: (id: string) => void;
	onDeleteAllTasks: () => void;
	onSetActiveTask: (id: string) => void;
	activeTaskId: string | null;
	editingTaskId: string | null;
	editingTaskText: string;
	onEditingTaskTextChange: (value: string) => void;
	onStartEditingTask: (id: string, text: string) => void;
	onSaveEditedTask: () => void;
	onCancelEditingTask: () => void;
}

export default function TaskList({
	tasks,
	newTask,
	onNewTaskChange,
	onAddTask,
	onToggleCompletion,
	onDeleteTask,
	onDeleteAllTasks,
	onSetActiveTask,
	activeTaskId,
	editingTaskId,
	editingTaskText,
	onEditingTaskTextChange,
	onStartEditingTask,
	onSaveEditedTask,
	onCancelEditingTask
}: ITaskListProps) {
	const [isMenuOpen, setIsMenuOpen] = useState<string | null>(null);
	const [isTasksMenuOpen, setIsTasksMenuOpen] = useState(false);
	const { t } = useTranslation();

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			onAddTask();
		}
	};

	const toggleMenu = (id: string) => {
		setIsMenuOpen(isMenuOpen === id ? null : id);
		setIsTasksMenuOpen(false);
	};

	const toggleTasksMenu = () => {
		setIsTasksMenuOpen(!isTasksMenuOpen);
		setIsMenuOpen(null);
	};

	const handleEditKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			onSaveEditedTask();
		} else if (e.key === 'Escape') {
			onCancelEditingTask();
		}
	};

	return (
		<div className="mt-6 flex flex-col gap-y-2 sm:gap-y-3 md:gap-y-4">
			<div className="flex items-center justify-between mb-2 relative">
				<h2 className="text-sm text-gray-500 dark:text-white font-medium mr-3">
					{t('POMODORO.TASK.task')} <span className="text-gray-500 dark:text-white">{tasks.length}</span>
				</h2>
				<button onClick={toggleTasksMenu} className="text-gray-500 dark:text-gray-100 dark:hover:text-white">
					<MoreHorizontal size={16} className="dark:text-white" />
				</button>

				<AnimatePresence>
					{isTasksMenuOpen && (
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.9 }}
							transition={{ duration: 0.1 }}
							className="absolute right-0 top-6 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 py-1 w-40"
						>
							<button
								onClick={() => {
									onDeleteAllTasks();
									setIsTasksMenuOpen(false);
								}}
								className="w-full text-left px-3 py-1 text-sm text-red-400 dark:hover:bg-gray-700 hover:bg-gray-400 flex items-center"
							>
								<Trash2 size={14} className="mr-2" />
								{t('POMODORO.TASK.delete_all')}
							</button>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<div className="space-y-2">
				<AnimatePresence>
					{tasks.map((task) => (
						<motion.div
							key={task.id}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, height: 0, marginTop: 0 }}
							transition={{ duration: 0.2 }}
							className={`relative bg-gray-100 dark:bg-gray-900 rounded-md p-2 border border-gray-200 dark:border-gray-800 ${
								activeTaskId === task.id && 'border-purple-600'
							}`}
						>
							<div className="flex items-center">
								<button
									onClick={() => onToggleCompletion(task.id)}
									className={`shrink-0 w-5 h-5 rounded-full border ${
										task.completed
											? 'bg-purple-600 border-purple-600'
											: 'dark:border-gray-600 border-gray-200'
									} mr-2 flex items-center justify-center`}
								>
									{task.completed && <Check size={12} className="text-white " />}
								</button>

								{editingTaskId === task.id ? (
									<div className="flex-1 flex">
										<input
											type="text"
											value={editingTaskText}
											onChange={(e) => onEditingTaskTextChange(e.target.value)}
											onKeyDown={handleEditKeyDown}
											autoFocus
											className="flex-1 bg-gray-800 dark:text-white text-sm rounded px-2 py-1 outline-hidden"
										/>
										<div className="flex ml-2">
											<button
												onClick={onSaveEditedTask}
												className="text-green-500 hover:text-green-400 mr-1"
											>
												<Check size={16} />
											</button>
											<button
												onClick={onCancelEditingTask}
												className="text-red-500 hover:text-red-400"
											>
												<X size={16} />
											</button>
										</div>
									</div>
								) : (
									<div
										className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-500' : 'dark:text-white text-black/80'}`}
										onClick={() => onSetActiveTask(task.id)}
									>
										{task.text}
									</div>
								)}

								{editingTaskId !== task.id && (
									<button
										onClick={() => toggleMenu(task.id)}
										className="text-gray-500 hover:text-white"
									>
										<MoreHorizontal size={16} />
									</button>
								)}
							</div>

							<AnimatePresence>
								{isMenuOpen === task.id && (
									<motion.div
										initial={{ opacity: 0, scale: 0.9 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.9 }}
										transition={{ duration: 0.1 }}
										className="absolute right-0 top-8 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 py-1 w-32"
									>
										<button
											onClick={() => {
												onStartEditingTask(task.id, task.text);
												setIsMenuOpen(null);
											}}
											className="w-full text-left px-3 py-1 text-sm text-black  dark:text-white dark:hover:bg-gray-700 hover:bg-gray-400"
										>
											{t('POMODORO.TASK.edit_task')}
										</button>
										<button
											onClick={() => {
												onDeleteTask(task.id);
												setIsMenuOpen(null);
											}}
											className="w-full text-left px-3 py-1 text-sm text-red-400 dark:hover:bg-gray-700 hover:bg-gray-400"
										>
											{t('POMODORO.TASK.delete_task')}
										</button>
									</motion.div>
								)}
							</AnimatePresence>
						</motion.div>
					))}
				</AnimatePresence>

				<div className="rounded-md  py-2 sm:py-2.5 md:py-3 px-2 border border-dashed border-gray-500 dark:border-[#4A4A4A] flex items-center">
					<button onClick={onAddTask} className="text-gray-500 hover:text-white mr-2">
						<Plus size={16} className="text-gray-400 dark:text-[#292D32]" />
					</button>
					<input
						type="text"
						value={newTask}
						onChange={(e) => onNewTaskChange(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={t('POMODORO.TASK.add_tasks')}
						className="flex-1 bg-transparent text-sm outline-hidden text-gray-800 dark:text-white placeholder:text-gray-300 dark:placeholder:text-white/80 focus:outline-none focus:border-none"
					/>
				</div>
			</div>
		</div>
	);
}
