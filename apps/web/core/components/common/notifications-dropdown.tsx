import React from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronUp as ChevronUpIcon } from '@/core/components/icons';
import { clsxm } from '@/core/lib/utils';
import { ScrollArea, ScrollBar } from '@/core/components/common/scroll-bar';

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
			<div className="h-auto w-full rounded-lg hairline-ring ring-border">
				{childrenArray.length > 1 ? (
					<Disclosure>
						{({ open }) => (
							<>
								<div className="w-full h-auto flex">
									<div className="w-full">{childrenArray[0]}</div>
									<Disclosure.Button className="flex w-6 h-6 justify-center items-center">
										<ChevronUpIcon
											className={clsxm(
												'size-4 text-muted-foreground transition-transform duration-150',
												open && 'rotate-180'
											)}
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
