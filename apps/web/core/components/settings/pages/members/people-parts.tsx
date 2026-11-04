import { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { commandKeycapClass } from '@/core/components/common/command';
import { hueStyle, type GlyphHue } from '@/core/components/common/value-glyphs';
import { cn } from '@/core/lib/helpers';

export const PERSON_ROW = 'flex min-h-14 items-center gap-3 px-4 py-2.5';

const CHIP =
	'chip-3d inline-flex h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[11px] font-medium [&_svg]:size-3';

function initialsOf(name: string): string {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const letters = words.slice(0, 2).map((word) => word[0]);
	return letters.join('').toUpperCase();
}

export function MemberAvatar({ name, imageUrl }: Readonly<{ name: string; imageUrl: string | null }>) {
	return (
		<Avatar className="size-8">
			<AvatarImage src={imageUrl ?? undefined} alt="" />
			<AvatarFallback className="text-[11px]">{initialsOf(name)}</AvatarFallback>
		</Avatar>
	);
}

export function InvitedAvatar({ label }: Readonly<{ label: string }>) {
	const initial = label.trim().charAt(0).toUpperCase();
	return (
		<span
			aria-hidden="true"
			className="flex size-8 shrink-0 items-center justify-center rounded-full hairline-border border-dashed border-foreground/30 text-[11px] font-medium text-muted-foreground"
		>
			{initial}
		</span>
	);
}

export function PersonChip({
	hue,
	icon,
	children
}: Readonly<{ hue: GlyphHue; icon?: ReactNode; children: ReactNode }>) {
	return (
		<span style={hueStyle(hue)} className={CHIP}>
			{icon}
			{children}
		</span>
	);
}

export function PersonLines({
	name,
	detail,
	adornment,
	className
}: Readonly<{ name: string; detail?: ReactNode; adornment?: ReactNode; className?: string }>) {
	return (
		<div className={cn('flex min-w-0 flex-1 flex-col gap-0.5', className)}>
			<span className="flex min-w-0 items-center gap-1.5">
				<span className="truncate text-[13px] leading-tight font-medium text-foreground">{name}</span>
				{adornment}
			</span>
			{detail && <span className="truncate text-xs leading-tight text-muted-foreground">{detail}</span>}
		</div>
	);
}

export function SectionCount({ count, label }: Readonly<{ count: number; label: string }>) {
	if (count < 1) {
		return null;
	}
	return (
		<kbd aria-label={label} className={cn(commandKeycapClass, 'tabular-nums')}>
			{count}
		</kbd>
	);
}
