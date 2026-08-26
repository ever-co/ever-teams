import { ChevronUpIcon } from '@heroicons/react/20/solid';
import { Divider } from './divider';
import { Text } from './typography';
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
	// Generate a unique value for the accordion item
	const accordionValue = id || `accordion-${title.replace(/\s+/g, '-').toLowerCase()}`;
	const defaultValue = defaultOpen ? accordionValue : undefined;

	return (
		<div className="w-full scroll-mt-6" id={id}>
			<div className={`overflow-hidden rounded-xl border bg-card shadow-sm dark:border-white/10 ${className}`}>
				<Accordion type="single" collapsible defaultValue={defaultValue}>
					<AccordionItem value={accordionValue} className="border-none">
						<AccordionTrigger className="flex h-auto w-full items-center justify-between px-5 py-4 text-left hover:bg-muted/40 hover:no-underline [&>svg]:hidden">
							<>
								<Text
									className={`text-lg font-semibold tracking-tight dark:text-white text-left ${
										isDanger ? 'text-[#EB6961]' : 'text-[#282048]'
									}`}
								>
									{title}
								</Text>
								<ChevronUpIcon className="h-5 w-5 text-[#292D32] dark:text-white transition-transform duration-200 data-[state=closed]:rotate-180" />
							</>
						</AccordionTrigger>
						<AccordionContent className="px-5 pb-5 pt-0 text-sm text-muted-foreground">
							<Divider className="mb-4" />
							{children}
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</div>
	);
};
