import { ChevronDown } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
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
			<div
				className={`overflow-hidden rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5 ${className}`}
			>
				<Accordion type="single" collapsible defaultValue={defaultValue}>
					<AccordionItem value={accordionValue} className="border-none">
						<AccordionTrigger className="flex h-auto w-full items-center justify-between px-5 py-3.5 text-left hover:bg-foreground/[0.025] hover:no-underline [&>svg:last-child]:hidden">
							<>
								<Text
									className={cn(
										'text-left text-base font-semibold text-balance text-foreground',
										isDanger && 'text-destructive-ink'
									)}
								>
									{title}
								</Text>
								<ChevronDown className="size-4 text-muted-foreground transition-transform duration-200" />
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
