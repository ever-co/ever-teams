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
			className={clsxm('flex w-full min-w-[170px] items-center justify-between rounded-md px-2 py-1.5')}
			style={{ backgroundColor: bg }}
		>
			<div className={clsxm('flex items-center gap-1 text-ellipsis whitespace-nowrap')}>
				{checked ? (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						width="20px"
						height="20px"
						className="size-4 fill-current"
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
		{ label: 'Working now', value: ETimerStatus.RUNNING, bg: 'hsl(var(--success) / 0.12)' },
		{ label: 'Paused', value: ETimerStatus.PAUSE, bg: 'hsl(var(--warning) / 0.15)' },
		{ label: 'Off', value: ETimerStatus.SUSPENDED, bg: 'hsl(var(--foreground) / 0.06)' },
		{ label: 'Invited', value: 'invited', bg: 'hsl(var(--info) / 0.12)' }
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
					<SelectTrigger className="h-8 min-w-[170px] p-0" style={{ backgroundColor: value.bg }}>
						<div className="flex w-full items-center justify-between px-2.5">
							<div className="flex items-center gap-1 text-ellipsis whitespace-nowrap">
								<span>
									<CircleIcon className="h-4 w-4" />
								</span>
								<div className="capitalize text-ellipsis">{value.label}</div>
							</div>
						</div>
					</SelectTrigger>
					<SelectContent className="min-w-[200px] p-0" position="popper" sideOffset={5} align="start">
						<div className="flex min-w-[170px] flex-col gap-0.5 p-1">
							{options.map((item) => (
								<SelectItem
									key={item.value}
									value={item.value}
									className="p-0 focus:bg-transparent focus:text-foreground data-[state=checked]:bg-transparent"
								>
									<div
										className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5"
										style={{ backgroundColor: item.bg }}
									>
										<div className="flex min-w-[170px] items-center gap-1 text-ellipsis whitespace-nowrap">
											{value.value === item.value ? (
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													width="20px"
													height="20px"
													className="size-4 fill-current"
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
