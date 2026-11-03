'use client';

import { ReactNode, useId } from 'react';
import { RadioMark } from '@/core/components/common/radio-mark';
import { cn } from '@/core/lib/helpers';
import { SETTINGS_SURFACE } from './settings-page';

export interface ChoiceCardOption<T extends string> {
	value: T;
	title: string;
	detail?: ReactNode;
	glyph?: ReactNode;
}

type ChoiceCardsProps<T extends string> = {
	legend: string;
	options: ReadonlyArray<ChoiceCardOption<T>>;
	value: T | null;
	onChange: (value: T) => void;
	disabled?: boolean;
	renderBelow?: (value: T) => ReactNode;
};

function belowOf<T extends string>(isChecked: boolean, value: T, renderBelow?: (value: T) => ReactNode) {
	if (!isChecked) {
		return null;
	}
	if (!renderBelow) {
		return null;
	}
	return renderBelow(value);
}

export function ChoiceCards<T extends string>({
	legend,
	options,
	value,
	onChange,
	disabled = false,
	renderBelow
}: Readonly<ChoiceCardsProps<T>>) {
	const name = useId();

	return (
		<fieldset className={SETTINGS_SURFACE} disabled={disabled}>
			<legend className="sr-only">{legend}</legend>
			{options.map((option) => {
				const isChecked = option.value === value;
				const below = belowOf(isChecked, option.value, renderBelow);
				return (
					<div key={option.value}>
						<label
							className={cn(
								'flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.02] has-focus-visible:bg-foreground/[0.03]',
								isChecked && 'bg-primary/[0.03] hover:bg-primary/[0.04]',
								disabled && 'cursor-not-allowed opacity-60'
							)}
						>
							<input
								type="radio"
								name={name}
								value={option.value}
								checked={isChecked}
								onChange={() => onChange(option.value)}
								className="peer sr-only"
							/>
							{option.glyph && (
								<span className="flex size-8 shrink-0 items-center justify-center rounded-lg keycap-3d text-foreground/70 [&_svg]:size-4">
									{option.glyph}
								</span>
							)}
							<span className="flex min-w-0 flex-1 flex-col gap-0.5">
								<span className="text-[13px] font-medium text-foreground">{option.title}</span>
								{option.detail && (
									<span className="text-xs text-pretty text-muted-foreground">{option.detail}</span>
								)}
							</span>
							<span className="rounded-full peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/25">
								<RadioMark isChecked={isChecked} />
							</span>
						</label>
						{below && <div className="px-4 pb-4">{below}</div>}
					</div>
				);
			})}
		</fieldset>
	);
}
