'use client';

import { ChangeEvent, useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Check, Plus } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { isHexColor, isSameColor, TASK_PROPERTY_COLOR_SWATCHES } from '@/core/lib/utils/settings-task-properties';

function ColorPickerLoading() {
	return <span aria-hidden="true" className="block h-32 w-full animate-pulse rounded-lg bg-foreground/[0.05]" />;
}

const HexColorPicker = dynamic(() => import('react-colorful').then((module) => module.HexColorPicker), {
	ssr: false,
	loading: ColorPickerLoading
});

const SWATCH_BASE =
	'relative inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/40 [&_svg]:size-3 [&_svg]:stroke-[2.5]';

const SWATCH = `${SWATCH_BASE} text-white hairline-ring ring-black/10`;

const SWATCH_SELECTED = 'ring-2 ring-foreground/70 ring-offset-2 ring-offset-card';

function isCustomColor(color: string | null) {
	if (!color) {
		return false;
	}
	const isSwatch = TASK_PROPERTY_COLOR_SWATCHES.some((swatch) => isSameColor(color, swatch));
	return !isSwatch;
}

function customSwatchStyle(color: string | null, hasCustomColor: boolean) {
	if (!hasCustomColor) {
		return undefined;
	}
	return { backgroundColor: color ?? undefined };
}

function isHexTextAccepted(text: string) {
	const isEmpty = text.trim().length === 0;
	return isEmpty || isHexColor(text);
}

interface PropertyColorFieldProps {
	value: string | null;
	onChange: (color: string) => void;
	labelledBy: string;
}

export function PropertyColorField({ value, onChange, labelledBy }: Readonly<PropertyColorFieldProps>) {
	const t = useTranslations();
	const hexId = useId();
	const [hexText, setHexText] = useState(value ?? '');
	const [shownValue, setShownValue] = useState(value);
	const hasCustomColor = isCustomColor(value);
	const isHexValid = isHexTextAccepted(hexText);
	const pickerColor = value ?? TASK_PROPERTY_COLOR_SWATCHES[0];

	const isValueFromElsewhere = value !== shownValue;
	if (isValueFromElsewhere) {
		setShownValue(value);
		setHexText(value ?? '');
	}

	const handleHexChange = (event: ChangeEvent<HTMLInputElement>) => {
		const text = event.target.value;
		setHexText(text);
		if (!isHexColor(text)) {
			return;
		}
		const color = text.trim();
		setShownValue(color);
		onChange(color);
	};

	return (
		<fieldset aria-labelledby={labelledBy} className="flex min-w-0 flex-wrap items-center gap-1.5">
			{TASK_PROPERTY_COLOR_SWATCHES.map((swatch) => {
				const isSelected = isSameColor(value, swatch);
				return (
					<button
						key={swatch}
						type="button"
						aria-label={swatch}
						aria-pressed={isSelected}
						onClick={() => onChange(swatch)}
						style={{ backgroundColor: swatch }}
						className={cn(SWATCH, isSelected && SWATCH_SELECTED)}
					>
						{isSelected && <Check aria-hidden="true" />}
					</button>
				);
			})}
			<Popover>
				<PopoverTrigger asChild>
					<button
						type="button"
						aria-label={t('settings.taskProperties.CUSTOM_COLOR')}
						aria-pressed={hasCustomColor}
						style={customSwatchStyle(value, hasCustomColor)}
						className={cn(
							SWATCH_BASE,
							!hasCustomColor &&
								'hairline-border border-dashed border-foreground/30 text-muted-foreground hover:bg-foreground/5',
							hasCustomColor && 'text-white',
							hasCustomColor && SWATCH_SELECTED
						)}
					>
						{!hasCustomColor && <Plus aria-hidden="true" />}
						{hasCustomColor && <Check aria-hidden="true" />}
					</button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-56 p-3 [&_.react-colorful]:h-32 [&_.react-colorful]:w-full">
					<HexColorPicker color={pickerColor} onChange={onChange} />
				</PopoverContent>
			</Popover>
			<label htmlFor={hexId} className="sr-only">
				{t('settings.taskProperties.HEX_LABEL')}
			</label>
			<Input
				id={hexId}
				value={hexText}
				onChange={handleHexChange}
				spellCheck={false}
				autoComplete="off"
				maxLength={7}
				aria-invalid={!isHexValid || undefined}
				title={t('settings.taskProperties.HEX_HINT')}
				className="ml-1 h-7 w-[5.5rem] px-2 font-mono text-base uppercase md:text-xs"
			/>
		</fieldset>
	);
}
