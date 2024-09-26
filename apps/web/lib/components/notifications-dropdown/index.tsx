import React from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/20/solid';
import { ScrollArea, ScrollBar } from '@components/ui/scroll-bar';

/**
 * A dropdown component that displays user notifications.
 *
 * @param {object} props - The props object
 *
 * @returns {JSX.Element} The Notification dropdown component
 */
export default function NotificationsDropdown(props: { children: React.ReactNode }) {
	const { children } = props;

	const childrenArray = React.Children.toArray(children).map((child) => {
		console.log(child);

		return React.isValidElement(child);
	});

	if (childrenArray[0]) {
		return (
			<div className="w-full h-auto border border-green-700">
				{childrenArray.length > 1 ? (
					<Disclosure>
						{({ open }) => (
							<>
								<div className="w-full h-auto flex">
									<div className="w-full bg-red-600">{childrenArray[0]}</div>
									<Disclosure.Button className="flex w-6 h-6 justify-center items-center">
										<ChevronUpIcon
											className={`${open ? 'rotate-180 transform' : ''} h-5 w-5 text-primary`}
										/>
									</Disclosure.Button>
								</div>

								<Disclosure.Panel className="p-1 w-full overflow-hidden h-24">
									<ScrollArea>
										{childrenArray.slice(1)}
										<ScrollBar className="-pr-20" />
									</ScrollArea>
								</Disclosure.Panel>
							</>
						)}
					</Disclosure>
				) : (
					childrenArray[0]
				)}
			</div>
		);
	} else {
		return <div className="w-full h-19 bg-green-400">no data</div>;
	}
}
