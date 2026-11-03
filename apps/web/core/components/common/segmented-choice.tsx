'use client';

import { useActiveIndicator } from '@/core/hooks/common/use-active-indicator';
import { cn } from '@/core/lib/helpers';

interface SegmentedChoiceProps<T extends string> {
	name: string;
	legend: string;
	options: ReadonlyArray<{ value: T; label: string }>;
	value: T;
	onChange: (value: T) => void;
}

/** The chip's checked tint laid over the card colour, so the pill stays opaque on the grey track. */
const pillClass =
	'bg-card from-primary/10 to-primary/10 ring-primary/30 dark:from-primary/15 dark:to-primary/15 dark:ring-primary/40 rounded-md bg-linear-to-r shadow-sm hairline-ring shadow-black/10';

export function SegmentedChoice<T extends string>({
	name,
	legend,
	options,
	value,
	onChange
}: Readonly<SegmentedChoiceProps<T>>) {
	const { listRef, activeRef, box } = useActiveIndicator<HTMLDivElement, HTMLLabelElement>(value);

	return (
		<fieldset className="min-w-0">
			<legend className="text-sm leading-none font-medium">{legend}</legend>
			<div
				ref={listRef}
				className="bg-foreground/5 relative mt-3 grid auto-cols-fr grid-flow-col rounded-lg p-1 sm:max-w-xs"
			>
				{box && (
					<span
						aria-hidden="true"
						style={{ transform: `translateX(${box.left}px)`, width: box.width }}
						className={cn(
							pillClass,
							'pointer-events-none absolute inset-y-1 left-0 transition-[transform,width] duration-200 ease-out'
						)}
					/>
				)}
				{options.map((option) => {
					const isActive = option.value === value;
					const activeOptionRef = isActive && activeRef;
					return (
						<label
							key={option.value}
							ref={activeOptionRef || undefined}
							className={cn(
								'has-[:focus-visible]:ring-ring/50 relative flex cursor-pointer items-center justify-center rounded-md py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-[3px] max-lg:py-2.5',
								isActive && 'text-primary-ink',
								!isActive && 'text-muted-foreground',
								isActive && !box && pillClass
							)}
						>
							<input
								type="radio"
								name={name}
								value={option.value}
								checked={isActive}
								onChange={() => onChange(option.value)}
								className="sr-only"
							/>
							{option.label}
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}
