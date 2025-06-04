import { filterValue } from '@/core/stores/teams/all-teams';
import { clsxm } from '@/core/lib/utils';
import { CircleIcon } from 'assets/svg';
import { PropsWithChildren } from 'react';
import { useAtom } from 'jotai';
import { Tooltip } from '@/core/components/duplicated-components/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/core/components/common/select';
import { ETimerStatus } from '@/core/types/generics/enums/timer';

export interface ITeamsMembersFilter {
	label: string;
	value: ETimerStatus | 'all' | 'invited';
	bg: string;
}

export function MemberFilterOption({
	children,
	label,
	active = true,
	checked = false,
	showIcon = true,
	icon,
	bg
}: PropsWithChildren<{
	label: string;
	active?: boolean;
	checked?: boolean;
	showIcon?: boolean;
	icon?: React.ReactNode;
	bg?: string;
}>) {
	return (
		<div
			className={clsxm(
				'dark:bg-dark--theme-light rounded-xl px-3 py-1 flex items-center justify-between w-full min-w-[170px]'
			)}
			style={{ backgroundColor: bg }}
		>
			<div className={clsxm('flex items-center space-x-1 whitespace-nowrap text-ellipsis dark:text-white')}>
				{checked ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width="20px"
						height="20px"
						className={`dark:fill-white`}
					>
						<path d="M9 19.4L3.3 13.7 4.7 12.3 9 16.6 20.3 5.3 21.7 6.7z" />
					</svg>
				) : (
					<>{showIcon && active && icon}</>
				)}
				<div className={`capitalize text-ellipsis`}>{label}</div>
			</div>
			{children}
		</div>
	);
}

export function MemberFilter() {
	const options: ITeamsMembersFilter[] = [
		{ label: 'All', value: 'all', bg: 'transparent' },
		{ label: 'Working now', value: ETimerStatus.RUNNING, bg: '#1f973d33' },
		{ label: 'Paused', value: ETimerStatus.PAUSE, bg: '#e58484' },
		{ label: 'Off', value: ETimerStatus.SUSPENDED, bg: '#6b7280' },
		{ label: 'Invited', value: 'invited', bg: '#d1ad5b' }
	];
	const [value, setValue] = useAtom(filterValue);

	const handleValueChange = (newValue: string) => {
		const selectedOption = options.find((option) => option.value === newValue);
		if (selectedOption) {
			setValue(selectedOption);
		}
	};

	return (
		<Tooltip label="Filter" placement="auto" enabled={true}>
			<div className="relative">
				<Select value={value.value} onValueChange={handleValueChange}>
					<SelectTrigger
						className="border rounded-lg dark:border-dark-lighter min-w-[170px] p-0 h-auto"
						style={{ backgroundColor: value.bg }}
					>
						<div className="flex items-center justify-between w-full px-3 py-1">
							<div className="flex items-center space-x-1 whitespace-nowrap text-ellipsis dark:text-white">
								<span>
									<CircleIcon className="h-4 w-4" />
								</span>
								<div className="capitalize text-ellipsis">{value.label}</div>
							</div>
						</div>
					</SelectTrigger>
					<SelectContent
						className="p-0 border-none shadow-xl dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] min-w-[200px]"
						position="popper"
						sideOffset={5}
						align="start"
					>
						<div className="p-2 flex flex-col gap-1 min-w-[170px]">
							{options.map((item) => (
								<SelectItem
									key={item.value}
									value={item.value}
									className="p-0 focus:bg-transparent focus:text-foreground data-[state=checked]:bg-transparent"
								>
									<div
										className="rounded-xl px-3 py-1 flex items-center justify-between cursor-pointer"
										style={{ backgroundColor: item.bg }}
									>
										<div className="flex items-center space-x-1 whitespace-nowrap text-ellipsis dark:text-white  min-w-[170px]">
											{value.value === item.value ? (
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													width="20px"
													height="20px"
													className="dark:fill-white"
												>
													<path d="M9 19.4L3.3 13.7 4.7 12.3 9 16.6 20.3 5.3 21.7 6.7z" />
												</svg>
											) : (
												<span>
													<CircleIcon className="h-4 w-4" />
												</span>
											)}
											<div className="capitalize text-ellipsis">{item.label}</div>
										</div>
									</div>
								</SelectItem>
							))}
						</div>
					</SelectContent>
				</Select>
			</div>
		</Tooltip>
	);
}
