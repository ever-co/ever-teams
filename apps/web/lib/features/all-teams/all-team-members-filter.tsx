import { ITeamsMembersFilter } from '@app/interfaces';
import { filterValue } from '@app/stores/all-teams';
import { clsxm } from '@app/utils';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDownIcon, CircleIcon } from 'assets/svg';
import { Card, Tooltip } from 'lib/components';
import { Fragment, PropsWithChildren } from 'react';
import { useRecoilState } from 'recoil';

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
		{ label: 'Working now', value: 'running', bg: '#1f973d33' },
		{ label: 'Paused', value: 'pause', bg: '#e58484' },
		{ label: 'Off', value: 'suspended', bg: '#6b7280' },
		{ label: 'Invited', value: 'invited', bg: '#d1ad5b' }
	];
	const [value, setValue] = useRecoilState(filterValue);

	return (
		<Tooltip label="Filter" placement="auto" enabled={true}>
			<div className="relative">
				<Listbox value={value} onChange={(v) => setValue(v)}>
					{({ open }) => {
						return (
							<>
								<Listbox.Button as="div" className="cursor-pointer">
									<MemberFilterOption
										label={value.label}
										icon={
											<span>
												<CircleIcon className="h-4 w-4" />
											</span>
										}
										bg={value.bg}
									>
										<ChevronDownIcon className={clsxm('h-5 w-5 text-default dark:text-white')} />
									</MemberFilterOption>
								</Listbox.Button>
								<Transition
									show={open}
									enter="transition duration-100 ease-out"
									enterFrom="transform scale-95 opacity-0"
									enterTo="transform scale-100 opacity-100"
									leave="transition duration-75 ease-out"
									leaveFrom="transform scale-100 opacity-100"
									leaveTo="transform scale-95 opacity-0"
									className={clsxm('absolute right-0 -left-12 z-40 min-w-min outline-none mt-1')}
								>
									<Listbox.Options className="outline-none ">
										<Card
											shadow="bigger"
											className="p-4 shadow-xlcard dark:shadow-lgcard-white dark:bg-[#1B1D22] dark:border dark:border-[#FFFFFF33] flex flex-col gap-2.5"
										>
											{options.map((item) => (
												<Listbox.Option key={item.value} value={item} as={Fragment}>
													<li className="cursor-pointer outline-none relative">
														<MemberFilterOption
															label={item.label}
															bg={item.bg}
															icon={
																<span>
																	<CircleIcon className="h-4 w-4" />
																</span>
															}
														/>
													</li>
												</Listbox.Option>
											))}
										</Card>
									</Listbox.Options>
								</Transition>
							</>
						);
					}}
				</Listbox>
			</div>
		</Tooltip>
	);
}
