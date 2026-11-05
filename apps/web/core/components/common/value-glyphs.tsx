import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';

export type GlyphHue = 'primary' | 'info' | 'success' | 'warning' | 'destructive' | 'neutral';

const HUE_VALUE: Record<GlyphHue, string> = {
	primary: 'hsl(var(--primary))',
	info: 'hsl(var(--info))',
	success: 'hsl(var(--success))',
	warning: 'hsl(var(--warning))',
	destructive: 'hsl(var(--destructive))',
	neutral: 'hsl(var(--muted-foreground))'
};

const MAX_SYMBOL_LENGTH = 2;

export function hueStyle(hue: GlyphHue) {
	const style = { '--chip': HUE_VALUE[hue] } as CSSProperties;
	return style;
}

/** An icon on a small plate tinted with its hue, the app's 3D label recipe. */
export function HueIconTile({
	hue,
	children,
	className
}: Readonly<{ hue: GlyphHue; children: ReactNode; className?: string }>) {
	return (
		<span
			aria-hidden="true"
			style={hueStyle(hue)}
			className={cn(
				'chip-3d inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] [&_svg]:size-4',
				className
			)}
		>
			{children}
		</span>
	);
}

/** Narrow symbols (`$`, `€`, `؋`) read at a glance; longer ones fall back to the code's first letters. */
export function currencySymbolOf(code: string, locale: string) {
	try {
		const formatter = new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: code,
			currencyDisplay: 'narrowSymbol'
		});
		const parts = formatter.formatToParts(0);
		const symbol = parts.find((part) => part.type === 'currency')?.value ?? code;
		const isShort = symbol.length <= MAX_SYMBOL_LENGTH;
		if (isShort) {
			return symbol;
		}
		return code.slice(0, MAX_SYMBOL_LENGTH);
	} catch {
		return code.slice(0, MAX_SYMBOL_LENGTH);
	}
}

/** A coin carrying the currency's symbol, in the money hue. */
export function CurrencyGlyph({ symbol, className }: Readonly<{ symbol: string; className?: string }>) {
	const isSingleCharacter = symbol.length === 1;
	return (
		<span
			aria-hidden="true"
			style={hueStyle('success')}
			className={cn(
				'chip-3d inline-flex size-[18px] shrink-0 items-center justify-center rounded-full font-semibold leading-none',
				isSingleCharacter && 'text-[10px]',
				!isSingleCharacter && 'text-[8px]',
				className
			)}
		>
			{symbol}
		</span>
	);
}

/** A tear-off calendar page showing the day of the month the row resolves to. */
export function DateGlyph({ date, className }: Readonly<{ date: Date; className?: string }>) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'keycap-3d inline-flex size-[18px] shrink-0 flex-col overflow-hidden rounded-[5px] text-foreground',
				className
			)}
		>
			<span className="h-1 w-full shrink-0 bg-destructive/80" />
			<span className="flex flex-1 items-center justify-center text-[9px] font-semibold leading-none tabular-nums">
				{date.getDate()}
			</span>
		</span>
	);
}
