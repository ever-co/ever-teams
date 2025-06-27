import { ChevronUpIcon } from '@heroicons/react/20/solid';
import { Divider } from './divider';
import { Text } from './typography';
import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';

interface isProps {
	title: string;
	children: React.ReactNode;
	className: string;
	isDanger?: boolean;
	id?: string;
	defaultOpen?: boolean;
}

export const Accordian = ({ children, title, className, isDanger, id, defaultOpen = true }: isProps) => {
	const [isOpen, setOpen] = useState<boolean>(defaultOpen);

	// Generate a unique value for the accordion item
	const accordionValue = id || `accordion-${title.replace(/\s+/g, '-').toLowerCase()}`;
	const defaultValue = defaultOpen ? accordionValue : undefined;

	return (
		<div className={`w-full ${isDanger && !isOpen && 'mb-[500px]'}`} id={id}>
			<div
				className={`rounded-2xl p-2 ${className} shadow-[0px_14px_34px_rgba(0,0,0,0.05)] bg-light--theme-light dark:bg-dark--theme-light`}
			>
				<Accordion
					type="single"
					collapsible
					defaultValue={defaultValue}
					onValueChange={(value) => {
						// Update isOpen state based on whether the accordion is open
						setOpen(value === accordionValue);
					}}
				>
					<AccordionItem value={accordionValue} className="border-none">
						<AccordionTrigger className="flex w-full justify-between rounded-lg px-4 py-2 text-left text-sm font-medium hover:bg-white items-center pt-[0.15rem] pb-0 h-[3.81rem] bg-light--theme-light dark:bg-dark--theme-light hover:no-underline [&>svg]:hidden">
							<>
								<Text
									className={`text-2xl font-medium dark:text-white text-center sm:text-left ${
										isDanger ? 'text-[#EB6961]' : 'text-[#282048]'
									}`}
								>
									{title}
								</Text>
								<ChevronUpIcon className="h-5 w-5 text-[#292D32] dark:text-white transition-transform duration-200 data-[state=closed]:rotate-180" />
							</>
						</AccordionTrigger>
						<AccordionContent className="px-4 pt-4 pb-2 text-sm text-gray-500">
							<Divider />
							{children}
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</div>
	);
};
