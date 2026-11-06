'use client';

import { FormEvent, useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { MENU_ROW, MENU_ROW_DESTRUCTIVE, MENU_SEPARATOR } from '@/core/components/common/menu-recipes';
import { Button, buttonVariants } from '@/core/components/duplicated-components/_button';
import { Input } from '@/core/components/common/input';
import { Check, ChevronDown, Plus, Spinner, Trash } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { PROJECT_COLOR_SWATCHES } from '@/core/lib/utils/project-composer';
import { isHexColor, isSameColor, normalizedHexColor } from '@/core/lib/utils/settings-team';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';

const HexColorPicker = dynamic(() => import('react-colorful').then((module) => module.HexColorPicker), {
	ssr: false,
	loading: () => <div aria-hidden="true" className="h-32 w-full animate-pulse rounded-lg bg-foreground/[0.06]" />
});

const SWATCH_BUTTON =
	'relative inline-flex size-6 cursor-pointer items-center justify-center rounded-full text-white outline-none hairline-ring ring-black/10 transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/40 [&_svg]:size-3.5 [&_svg]:stroke-[2.5]';

const SWATCH_PICKED = 'ring-2 ring-foreground/70 ring-offset-2 ring-offset-popover';

function ColorDot({ color }: Readonly<{ color: string }>) {
	return (
		<span
			aria-hidden="true"
			style={{ backgroundColor: color }}
			className="size-4 shrink-0 rounded-full hairline-ring ring-black/10"
		/>
	);
}

export function TeamColorValue({ color }: Readonly<{ color: string | null | undefined }>) {
	const t = useTranslations();
	if (!color) {
		return <span className="text-[13px] text-muted-foreground">{t('settings.teamGeneral.COLOR_NONE')}</span>;
	}
	return (
		<span className="flex items-center gap-2 text-[13px] text-foreground tabular-nums">
			<ColorDot color={color} />
			{color}
		</span>
	);
}

function Swatch({ color, isPicked, onPick }: Readonly<{ color: string; isPicked: boolean; onPick: () => void }>) {
	const t = useTranslations();
	return (
		<button
			type="button"
			onClick={onPick}
			aria-label={t('settings.teamGeneral.COLOR_SWATCH', { color })}
			aria-pressed={isPicked}
			style={{ backgroundColor: color }}
			className={cn(SWATCH_BUTTON, isPicked && SWATCH_PICKED)}
		>
			{isPicked && <Check aria-hidden="true" />}
		</button>
	);
}

function TriggerFace({ color, isPending }: Readonly<{ color: string | null; isPending: boolean }>) {
	const t = useTranslations();
	if (isPending) {
		return <Spinner className="size-3.5 animate-spin" />;
	}
	if (!color) {
		return <span className="text-muted-foreground">{t('settings.teamGeneral.COLOR_NONE')}</span>;
	}
	return (
		<>
			<ColorDot color={color} />
			<span className="tabular-nums">{color}</span>
		</>
	);
}

function isOffPalette(color: string | null): boolean {
	if (!color) {
		return false;
	}
	const isSwatch = PROJECT_COLOR_SWATCHES.some((swatch) => isSameColor(color, swatch));
	return !isSwatch;
}

function pickerColorOf(draftHex: string, saved: string | null): string {
	const typed = normalizedHexColor(draftHex);
	if (isHexColor(typed)) {
		return typed;
	}
	if (saved) {
		return saved;
	}
	return PROJECT_COLOR_SWATCHES[0];
}

function describedByOf(error: string | null, errorId: string): string | undefined {
	if (!error) {
		return undefined;
	}
	return errorId;
}

interface TeamColorControlProps {
	color: string | null;
	onSave: (color: string | null) => Promise<void>;
}

export function TeamColorControl({ color, onSave }: Readonly<TeamColorControlProps>) {
	const t = useTranslations();
	const hexId = useId();
	const hexErrorId = useId();
	const { value, isPending, change } = useOptimisticSetting<string | null>(color, onSave);
	const [isOpen, setIsOpen] = useState(false);
	const [draftHex, setDraftHex] = useState('');
	const [hexError, setHexError] = useState<string | null>(null);
	const [showsPicker, setShowsPicker] = useState(false);

	const hasColor = Boolean(value);
	const isCustomColor = isOffPalette(value);
	const pickerColor = pickerColorOf(draftHex, value);
	const hexDescribedBy = describedByOf(hexError, hexErrorId);

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			return;
		}
		setDraftHex(value ?? '');
		setHexError(null);
		setShowsPicker(isCustomColor);
	};

	const save = (next: string | null) => {
		setIsOpen(false);
		void change(next);
	};

	const applyHex = (event: FormEvent) => {
		event.preventDefault();
		const normalized = normalizedHexColor(draftHex);
		if (!isHexColor(normalized)) {
			setHexError(t('settings.teamGeneral.COLOR_HEX_INVALID'));
			return;
		}
		save(normalized);
	};

	let valueText: string = t('settings.teamGeneral.COLOR_NONE');
	if (value) {
		valueText = value;
	}

	return (
		<Popover open={isOpen} onOpenChange={handleOpenChange}>
			<PopoverTrigger
				disabled={isPending}
				aria-label={t('settings.teamGeneral.COLOR_CHANGE', { color: valueText })}
				className={cn(buttonVariants({ variant: 'outline' }), 'min-w-28 justify-between')}
			>
				<span className="flex items-center gap-2">
					<TriggerFace color={value} isPending={isPending} />
				</span>
				<ChevronDown aria-hidden="true" className="text-muted-foreground" />
			</PopoverTrigger>
			<PopoverContent align="end" sideOffset={6} className="flex w-64 flex-col gap-3 p-3">
				<fieldset aria-label={t('settings.teamGeneral.COLOR_LABEL')} className="grid min-w-0 grid-cols-6 gap-2">
					{PROJECT_COLOR_SWATCHES.map((swatch) => (
						<Swatch
							key={swatch}
							color={swatch}
							isPicked={isSameColor(value, swatch)}
							onPick={() => save(swatch)}
						/>
					))}
					<button
						type="button"
						onClick={() => setShowsPicker((shown) => !shown)}
						aria-expanded={showsPicker}
						aria-label={t('settings.teamGeneral.COLOR_CUSTOM')}
						className={cn(
							SWATCH_BUTTON,
							'text-muted-foreground ring-0 hairline-border border-dashed border-foreground/30 hover:bg-foreground/5'
						)}
					>
						<Plus aria-hidden="true" />
					</button>
				</fieldset>
				{showsPicker && (
					<div className="[&_.react-colorful]:h-32 [&_.react-colorful]:w-full">
						<HexColorPicker
							color={pickerColor}
							onChange={(next) => {
								setDraftHex(next);
								setHexError(null);
							}}
						/>
					</div>
				)}
				<form onSubmit={applyHex} className="flex flex-col gap-1.5" noValidate>
					<label htmlFor={hexId} className="text-xs font-medium text-muted-foreground">
						{t('settings.teamGeneral.COLOR_HEX_LABEL')}
					</label>
					<div className="flex items-center gap-2">
						<Input
							id={hexId}
							value={draftHex}
							onChange={(event) => {
								setDraftHex(event.target.value);
								setHexError(null);
							}}
							placeholder={PROJECT_COLOR_SWATCHES[0]}
							spellCheck={false}
							autoComplete="off"
							maxLength={7}
							aria-invalid={Boolean(hexError) || undefined}
							aria-describedby={hexDescribedBy}
							className="h-8 tabular-nums"
						/>
						<Button type="submit" variant="outline" size="sm">
							{t('settings.teamGeneral.COLOR_APPLY')}
						</Button>
					</div>
					{hexError && (
						<p id={hexErrorId} role="alert" className="text-xs text-destructive-ink">
							{hexError}
						</p>
					)}
				</form>
				{hasColor && (
					<>
						<div className={MENU_SEPARATOR} />
						<button
							type="button"
							onClick={() => save(null)}
							className={cn(MENU_ROW, MENU_ROW_DESTRUCTIVE, '-my-1')}
						>
							<Trash aria-hidden="true" />
							{t('settings.teamGeneral.COLOR_REMOVE')}
						</button>
					</>
				)}
			</PopoverContent>
		</Popover>
	);
}
