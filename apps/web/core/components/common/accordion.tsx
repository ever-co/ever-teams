'use client';

import * as React from 'react';
import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import { ChevronDown } from '@/core/components/icons';

import { cn } from '@/core/lib/helpers';

type AccordionRootBaseProps = Omit<
	AccordionPrimitive.Root.Props<string>,
	'value' | 'defaultValue' | 'onValueChange' | 'multiple'
>;

interface AccordionSingleProps extends AccordionRootBaseProps {
	type: 'single';
	collapsible?: boolean;
	value?: string;
	defaultValue?: string;
	onValueChange?(value: string): void;
}

interface AccordionMultipleProps extends AccordionRootBaseProps {
	type: 'multiple';
	value?: string[];
	defaultValue?: string[];
	onValueChange?(value: string[]): void;
}

type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

function toValueList(value: string | undefined): string[] {
	if (!value) {
		return [];
	}
	return [value];
}

function toSingleValue(valueList: string[]): string {
	return valueList[0] ?? '';
}

/** Radix `type="single"`: one open item, a string value, and `collapsible` decides whether it can close. */
const SingleAccordion = React.forwardRef<HTMLDivElement, AccordionSingleProps>(
	({ type, collapsible = false, value, defaultValue, onValueChange, className, ...props }, ref) => {
		const [internalValue, setInternalValue] = React.useState<string[]>(() => toValueList(defaultValue));
		const isControlled = value !== undefined;
		let currentValue = internalValue;
		if (isControlled) {
			currentValue = toValueList(value);
		}
		const handleValueChange = (nextValue: string[]) => {
			const isClosingTheOpenItem = nextValue.length === 0;
			const mustStayOpen = !collapsible && isClosingTheOpenItem;
			if (mustStayOpen) {
				return;
			}
			if (!isControlled) {
				setInternalValue(nextValue);
			}
			onValueChange?.(toSingleValue(nextValue));
		};
		return (
			<AccordionPrimitive.Root
				ref={ref}
				data-slot="accordion"
				data-type={type}
				className={cn(className)}
				value={currentValue}
				onValueChange={handleValueChange}
				{...props}
			/>
		);
	}
);
SingleAccordion.displayName = 'SingleAccordion';

const MultipleAccordion = React.forwardRef<HTMLDivElement, AccordionMultipleProps>(
	({ type, value, defaultValue, onValueChange, className, ...props }, ref) => {
		const handleValueChange = (nextValue: string[]) => {
			onValueChange?.(nextValue);
		};
		return (
			<AccordionPrimitive.Root
				ref={ref}
				data-slot="accordion"
				data-type={type}
				multiple
				className={cn(className)}
				value={value}
				defaultValue={defaultValue}
				onValueChange={handleValueChange}
				{...props}
			/>
		);
	}
);
MultipleAccordion.displayName = 'MultipleAccordion';

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>((props, ref) => {
	if (props.type === 'multiple') {
		return <MultipleAccordion ref={ref} {...props} />;
	}
	return <SingleAccordion ref={ref} {...props} />;
});
Accordion.displayName = 'Accordion';

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionPrimitive.Item.Props>(
	({ className, ...props }, ref) => (
		<AccordionPrimitive.Item
			ref={ref}
			data-slot="accordion-item"
			className={cn('hairline-b', className)}
			{...props}
		/>
	)
);
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionPrimitive.Trigger.Props>(
	({ className, children, ...props }, ref) => (
		<AccordionPrimitive.Header className="flex">
			<AccordionPrimitive.Trigger
				ref={ref}
				data-slot="accordion-trigger"
				className={cn(
					'flex flex-1 items-center justify-between py-4 font-medium transition-colors hover:underline data-panel-open:[&>svg]:rotate-180',
					className
				)}
				{...props}
			>
				{children}
				<ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 -rotate-90" />
			</AccordionPrimitive.Trigger>
		</AccordionPrimitive.Header>
	)
);
AccordionTrigger.displayName = 'AccordionTrigger';

/**
 * The panel clips while its height animates; once open it keeps an 8px margin around its box, so the ring and the
 * shadow of a card placed at its edge are never cut.
 */
const ACCORDION_PANEL =
	'h-(--accordion-panel-height) overflow-hidden text-sm transition-[height] duration-200 ease-out data-open:overflow-clip data-open:[overflow-clip-margin:8px] data-starting-style:h-0 data-ending-style:h-0';

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionPrimitive.Panel.Props>(
	({ className, children, ...props }, ref) => (
		<AccordionPrimitive.Panel ref={ref} data-slot="accordion-content" className={ACCORDION_PANEL} {...props}>
			<div className={cn('pb-4 pt-0', className)}>{children}</div>
		</AccordionPrimitive.Panel>
	)
);
AccordionContent.displayName = 'AccordionContent';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
