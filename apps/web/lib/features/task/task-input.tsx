import { useOutsideClick } from '@app/hooks';
import { clsxm } from '@app/utils';
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
			<Popover className="relative w-full z-30">
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
					<Popover.Panel className="absolute -mt-3" ref={ignoreElementRef}>
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
			className={clsxm(
				'rounded-lg md:px-4 md:py-4 w-[500px] max-h-96',
				'overflow-auto shadow-xlcard dark:shadow-xlcard'
			)}
		>
			<Button variant="outline" className="font-normal text-sm rounded-xl">
				<PlusIcon className="w-[16px] h-[16px]" /> Create new task
			</Button>

			<div className="mt-4 flex space-x-3">
				<OutlineBadge className="input-border text-xs py-2">
					<div className="w-4 h-4 bg-green-300 rounded-full opacity-50" />
					<span className="text-primary dark:text-white font-normal">
						23 Open
					</span>
				</OutlineBadge>

				<OutlineBadge className="input-border text-xs py-2">
					<TickCircleIcon className="opacity-50" />
					<span>25 Closed</span>
				</OutlineBadge>
			</div>

			<Divider className="mt-4" />

			<ul className="my-6">
				<li>
					<TaskItem title="Api Integration" />
					<Divider className="my-5" />
				</li>

				<li>
					<TaskItem title="Design Profile Screen" />
					<Divider className="my-5" />
				</li>

				<li>
					<TaskItem title="Improve main page design" />
				</li>
			</ul>
		</Card>
	);
}
