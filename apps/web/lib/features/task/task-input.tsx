import { useOutsideClick } from '@app/hooks';
import { Popover, Transition } from '@headlessui/react';
import { PlusIcon } from '@heroicons/react/20/solid';
import {
	Button,
	Card,
	Divider,
	InputField,
	OutlineBadge,
} from 'lib/components';
import { TickCircleIcon } from 'lib/components/svgs';
import { useState } from 'react';
import { TaskItem } from './task-item';

export function TaskInput() {
	const [open, setOpen] = useState(false);
	const { targetEl, ignoreElementRef } = useOutsideClick<HTMLInputElement>(() =>
		setOpen(false)
	);

	return (
		<>
			<Popover className="relative w-full">
				<InputField
					onFocus={() => setOpen(true)}
					placeholder="What you working on?"
					ref={targetEl}
				/>

				<Transition
					show={open}
					enter="transition duration-100 ease-out"
					enterFrom="transform scale-95 opacity-0"
					enterTo="transform scale-100 opacity-100"
					leave="transition duration-75 ease-out"
					leaveFrom="transform scale-100 opacity-100"
					leaveTo="transform scale-95 opacity-0"
				>
					<Popover.Panel className="absolute z-10 -mt-3" ref={ignoreElementRef}>
						<TaskCard />
					</Popover.Panel>
				</Transition>
			</Popover>
		</>
	);
}

export function TaskCard() {
	return (
		<Card
			shadow="bigger"
			className="rounded-lg md:px-4 md:py-4 min-w-[400px] shadow-xlcard"
		>
			<Button variant="outline" className="font-normal text-sm rounded-xl">
				<PlusIcon className="w-[16px] h-[16px]" /> Create new task
			</Button>

			<div className="mt-4 flex space-x-3">
				<OutlineBadge className="input-border text-xs py-2">
					<div className="w-4 h-4 bg-green-300 rounded-full opacity-50" />
					<span>23 Open</span>
				</OutlineBadge>

				<OutlineBadge className="input-border text-xs py-2">
					<TickCircleIcon className="opacity-50" />
					<span>25 Closed</span>
				</OutlineBadge>
			</div>

			<Divider className="mt-4" />

			<ul className="mt-6">
				<li>
					<TaskItem title="Api Integration" />
					<Divider className="mt-5" />
				</li>
			</ul>
		</Card>
	);
}
