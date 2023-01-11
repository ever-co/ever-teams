import { IClassName, ITaskStatus } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Listbox, Transition } from '@headlessui/react';
import { Card } from 'lib/components';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import {
	CircleIcon,
	ClockIcon,
	CloseCircleIcon,
	LoginIcon,
	SearchStatusIcon,
	TickCircleIcon,
	TimerIcon,
} from 'lib/components/svgs';
import {
	Fragment,
	PropsWithChildren,
	useCallback,
	useMemo,
	useState,
} from 'react';

type Status =
	| Exclude<ITaskStatus, 'Unassigned' | 'For Testing' | 'Closed'>
	| 'Blocked'
	| 'Ready'
	| 'Backlog';

type TStatusItem = {
	bgColor?: string;
	icon: React.ReactNode;
	name?: string;
};

type TStatus = {
	[k in Status]: TStatusItem;
};

export const taskStatus: TStatus = {
	Todo: {
		icon: <LoginIcon />,
		bgColor: '#D6E4F9',
	},
	'In Progress': {
		icon: <TimerIcon />,
		bgColor: '#ECE8FC',
	},
	'In Review': {
		icon: <SearchStatusIcon />,
		bgColor: ' #F3D8B0',
	},
	Ready: {
		icon: <ClockIcon />,
		bgColor: '#F5F1CB',
	},
	Completed: {
		icon: <TickCircleIcon className="stroke-[#292D32]" />,
		bgColor: '#D4EFDF',
	},
	Blocked: {
		icon: <CloseCircleIcon />,
		bgColor: '#F5B8B8',
	},
	Backlog: {
		icon: <CircleIcon />,
		bgColor: '#F2F2F2',
	},
};

export function TaskStatus({
	children,
	name,
	icon,
	bgColor: backgroundColor,
	className,
}: PropsWithChildren<TStatusItem & IClassName>) {
	return (
		<div
			className={clsxm(
				'py-2 px-4 rounded-xl flex items-center text-sm space-x-3 dark:text-default',
				className
			)}
			style={{ backgroundColor }}
		>
			{icon}
			<span>{name}</span>
			{children}
		</div>
	);
}

export function TaskStatusDropdown() {
	const items = useMemo(() => {
		return Object.keys(taskStatus).map((key) => {
			const vlue = taskStatus[key as Status];
			return {
				...vlue,
				name: key,
			} as Required<TStatusItem>;
		});
	}, []);

	const [value, setValue] = useState<Status>('In Progress');

	const item = items.find((r) => r.name === value) || items[0];

	const onChange = useCallback((value: Status) => {
		setValue(value);
	}, []);

	return <StatusDropdown items={items} value={item} onChange={onChange} />;
}

/**
 * Dc Status drop down
 */
function StatusDropdown<T extends Required<TStatusItem>>({
	value,
	onChange,
	items,
}: {
	value: T;
	onChange?(value: string): void;
	items: T[];
}) {
	return (
		<div className="relative">
			<Listbox value={value.name} onChange={onChange}>
				{({ open }) => (
					<>
						<Listbox.Button>
							<TaskStatus {...value}>
								<ChevronDownIcon
									className={clsxm(
										'ml-2 h-5 w-5 text-default transition duration-150 ease-in-out group-hover:text-opacity-80'
									)}
									aria-hidden="true"
								/>
							</TaskStatus>
						</Listbox.Button>

						<Transition
							show={open}
							enter="transition duration-100 ease-out"
							enterFrom="transform scale-95 opacity-0"
							enterTo="transform scale-100 opacity-100"
							leave="transition duration-75 ease-out"
							leaveFrom="transform scale-100 opacity-100"
							leaveTo="transform scale-95 opacity-0"
							className="relative z-40"
						>
							<Listbox.Options className="absolute right-0 z-40">
								<Card
									shadow="bigger"
									className="!px-2 py-2 shadow-xlcard dark:shadow-lgcard-white"
								>
									{items.map((item, i) => (
										<Listbox.Option key={i} value={item.name} as={Fragment}>
											<li className="mb-3 cursor-pointer">
												<TaskStatus {...item} />
											</li>
										</Listbox.Option>
									))}
								</Card>
							</Listbox.Options>
						</Transition>
					</>
				)}
			</Listbox>
		</div>
	);
}
