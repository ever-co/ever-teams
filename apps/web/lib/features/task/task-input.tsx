import { useOutsideClick } from '@app/hooks';
import { Popover, Transition } from '@headlessui/react';
import { Card, InputField } from 'lib/components';
import { useState } from 'react';

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
		<Card shadow="bigger" className="rounded-lg md:px-4 md:py-4">
			<div className="grid grid-cols-2">
				<a href="/analytics">Analytics</a>
				<a href="/engagement">Engagement</a>
				<a href="/security">Security</a>
				<a href="/integrations">Integrations</a>
			</div>

			<img src="/solutions.jpg" alt="" />
		</Card>
	);
}
