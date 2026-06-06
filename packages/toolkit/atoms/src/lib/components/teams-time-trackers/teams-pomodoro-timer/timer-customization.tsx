'use client';

import { cn } from '@ever-teams/toolkit-ui';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import slugify from 'slugify';

type TimerLevel = 'very_short' | 'short' | 'medium' | 'long' | 'custom';
const activePresetClassName = 'bg-[#A16BFB] border-transparent';
const activePresetCheckboxClassName = 'scale-100 peer-checked:scale-100 group-hover:scale-100 has-checked:scale-100';

interface TimerPreset {
	name: TimerLevel;
	minutes: number;
	color: string;
	restMinutes: number;
	longRestMinutes: number;
}

interface TimerCustomizationProps {
	presets: TimerPreset[];
	currentPreset: TimerPreset;
	onSelectPreset: (preset: TimerPreset) => void;
	customMinutes: number;
	customRestMinutes: number;
	customLongRestMinutes: number;
	onUpdateCustomValues: (minutes: number, restMinutes: number, longRestMinutes: number) => void;
	onClose: () => void;
}

export default function TimerCustomization({
	presets,
	currentPreset,
	onSelectPreset,
	customMinutes,
	customRestMinutes,
	customLongRestMinutes,
	onUpdateCustomValues,
	onClose
}: TimerCustomizationProps) {
	const [localCustomMinutes, setLocalCustomMinutes] = useState(customMinutes);
	const [localCustomRestMinutes, setLocalCustomRestMinutes] = useState(customRestMinutes);
	const [localCustomLongRestMinutes, setLocalCustomLongRestMinutes] = useState(customLongRestMinutes);
	const { t } = useTranslation();

	const handleCustomChange = () => {
		onUpdateCustomValues(localCustomMinutes, localCustomRestMinutes, localCustomLongRestMinutes);
		onSelectPreset(presets.find((p) => p.name === 'custom')!);
	};

	return (
		<motion.div
			className="absolute right-0 top-10 w-64 bg-white border-gray-200 dark:bg-black border-[0.75px] dark:border-white/20 rounded-lg sm:rounded-xl md:rounded-2xl lg:rounded-3xl p-4 z-20"
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -20 }}
			transition={{ duration: 0.2 }}
		>
			<div className="flex justify-between items-center mb-4">
				<h3 className="text-sm font-medium text-gray-500 dark:text-gray-50">
					{t('POMODORO.timer_customization')}
				</h3>
				<button onClick={onClose} className="text-gray-500 dark:text-gray-50 dark:hover:text-white">
					<X size={16} />
				</button>
			</div>

			<div className="flex flex-col gap-y-4 md:gap-y-5 lg:gap-y-6">
				{presets.slice(0, 4).map((preset) => {
					const id = slugify(preset.name, { lower: true });
					const currentId = slugify(currentPreset.name, { lower: true });
					const isChecked = currentId === id;
					return (
						<label key={id} htmlFor={id} className="flex flex-col items-start gap-1 group">
							<input
								type="radio"
								id={id}
								name="timerPreset"
								value={id}
								className="mr-2 accent-purple-600 hidden"
								checked={isChecked}
								onChange={() => onSelectPreset(preset)}
							/>
							<div className="flex items-center gap-2">
								<span
									className={cn(
										'size-4 sm:size-5 flex items-center justify-center rounded-full aspect-square border-gray-500 dark:border-gray-50 border hover:border-gray-600 dark:hover:border-white group-hover:bg-gray-800  dark:group-hover:border-white transition-colors duration-300 text-white',
										'group-checked:border-transparent  peer-checked:bg-[#A16BFB] group-checked:bg-[#A16BFB]  dark:group-hover:bg-[#A16BFB]',
										isChecked ? activePresetClassName : ''
									)}
								>
									<svg
										width={15}
										height={15}
										viewBox="0 0 15 15"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
										className={cn(
											'scale-0 group-checked:scale-100 peer-checked:scale-100 group-hover:scale-100 has-checked:scale-100 transition-all duration-300',
											isChecked ? activePresetCheckboxClassName : ''
										)}
									>
										<path
											d="M11.7845 3.88672L5.36784 10.3034L2.45117 7.38672"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</span>
								<span className="text-sm font-medium text-black dark:text-white">
									{t(`POMODORO.LEVEL.${preset.name}`)}
								</span>
							</div>
							<div className="flex flex-1 text-sm ml-6">
								<span className="text-gray-400 dark:text-white/40 text-xs">
									{preset.minutes} min - {preset.restMinutes} min - {preset.longRestMinutes} min
								</span>
							</div>
						</label>
					);
				})}
				<div className="flex flex-col items-start gap-1">
					<label key="custom" htmlFor="custom" className="flex flex-col items-start gap-3 group">
						<input
							type="radio"
							id="custom"
							value="custom"
							name="timerPreset"
							className="mr-2 mt-1 accent-purple-600 hidden"
							checked={currentPreset.name === 'custom'}
							onChange={handleCustomChange}
						/>
						<div className="flex items-center gap-2">
							<span
								className={cn(
									'size-4 sm:size-5 flex items-center justify-center rounded-full aspect-square border-gray-500 dark:border-gray-50 border hover:border-gray-600 dark:hover:border-white group-hover:bg-gray-800  dark:group-hover:border-white  transition-colors duration-300 text-white',
									' group-checked:border-transparent  peer-checked:bg-[#A16BFB] group-checked:bg-[#A16BFB]  dark:group-hover:bg-[#A16BFB] ',
									currentPreset.name === 'custom' ? activePresetClassName : ''
								)}
							>
								<svg
									width={15}
									height={15}
									viewBox="0 0 15 15"
									fill="none"
									xmlns="http://www.w3.org/2000/svg"
									className={cn(
										'scale-0 group-checked:scale-100 peer-checked:scale-100 group-hover:scale-100 has-checked:scale-100 transition-all duration-300',
										currentPreset.name === 'custom' ? activePresetCheckboxClassName : ''
									)}
								>
									<path
										d="M11.7845 3.88672L5.36784 10.3034L2.45117 7.38672"
										stroke="currentColor"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</span>
							<span className="text-sm font-medium text-black dark:text-white">
								{t('POMODORO.LEVEL.custom')}
							</span>
						</div>
					</label>
					<div className="flex-1 ml-5">
						<div className="flex flex-col gap-2 mt-2 text-xs">
							<div className="grid grid-cols-2 items-center gap-2 md:gap-4">
								<label htmlFor="custom-pomodoro" className="text-gray-400">
									{t('POMODORO.pomodoro')}
								</label>
								<input
									type="number"
									id="custom-pomodoro"
									min="1"
									max="60"
									value={localCustomMinutes}
									onChange={(e) => setLocalCustomMinutes(Number.parseInt(e.target.value) || 25)}
									onBlur={handleCustomChange}
									className="w-full bg-gray-800 border text-[#A16BFB] placeholder:text-[#A16BFB]/60 border-gray-700 dark:border-white/20 rounded px-2 py-1 mt-1 bg-transparent font-medium"
								/>
							</div>
							<div className="grid grid-cols-2 items-center gap-2 md:gap-4">
								<label htmlFor="custom-rest" className="text-gray-400">
									{t('POMODORO.break')}
								</label>
								<input
									type="number"
									id="custom-rest"
									min="1"
									max="30"
									value={localCustomRestMinutes}
									onChange={(e) => setLocalCustomRestMinutes(Number.parseInt(e.target.value) || 5)}
									onBlur={handleCustomChange}
									className="w-full bg-gray-800 border border-gray-700 text-[#7FE4C5] placeholder:text-[#7FE4C5]/60 dark:border-white/20 rounded px-2 py-1 mt-1 bg-transparent font-medium"
								/>
							</div>
							<div className="grid grid-cols-2 items-center gap-2 md:gap-4">
								<label htmlFor="custom-long-rest" className="text-gray-400 whitespace-nowrap">
									{t('POMODORO.long_break')}
								</label>
								<input
									type="number"
									id="custom-long-rest"
									min="1"
									max="45"
									value={localCustomLongRestMinutes}
									onChange={(e) =>
										setLocalCustomLongRestMinutes(Number.parseInt(e.target.value) || 15)
									}
									onBlur={handleCustomChange}
									className="w-full bg-gray-800 border border-gray-700 text-[#7FE4C5] placeholder:text-[#7FE4C5]/60 dark:border-white/20 rounded px-2 py-1 mt-1 bg-transparent font-medium"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
