import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { cn } from '@/core/lib/helpers';

function lastInitialOf(words: string[]) {
	if (words.length < 2) {
		return '';
	}
	const lastWord = words[words.length - 1];
	return lastWord?.[0] ?? '';
}

function initialsOf(name: string) {
	const trimmedName = name.trim();
	const words = trimmedName.split(/\s+/).filter(Boolean);
	const first = words[0]?.[0] ?? '';
	const last = lastInitialOf(words);
	const initials = `${first}${last}`;
	return initials.toUpperCase();
}

/** A person in a filter menu or a chip: their own small avatar, never a plate. */
export const MemberFace = memo(function MemberFace({
	name,
	imageUrl,
	className
}: Readonly<{ name: string; imageUrl: string | null; className?: string }>) {
	return (
		<Avatar className={cn('size-4 text-[7px] font-medium', className)}>
			<AvatarImage src={imageUrl ?? undefined} alt="" loading="lazy" />
			<AvatarFallback className="text-[inherit]">{initialsOf(name)}</AvatarFallback>
		</Avatar>
	);
});

/**
 * A project beside its name: its own image when it has one, otherwise a dot in its colour; time logged without a
 * project gets an empty ring so it never passes for a project.
 */
export const ProjectMark = memo(function ProjectMark({
	imageUrl,
	color,
	isNoProject
}: Readonly<{ imageUrl: string | null; color: string | null; isNoProject: boolean }>) {
	if (isNoProject) {
		return <span aria-hidden="true" className="size-2 shrink-0 rounded-full hairline-ring ring-foreground/30" />;
	}
	const dotStyle = { backgroundColor: color ?? undefined };
	if (imageUrl) {
		return (
			<Avatar aria-hidden="true" className="size-4 rounded-[4px] hairline-ring ring-foreground/10">
				<AvatarImage src={imageUrl} alt="" loading="lazy" className="object-cover" />
				<AvatarFallback className="rounded-[4px] bg-primary/60" style={dotStyle} />
			</Avatar>
		);
	}
	return (
		<span
			aria-hidden="true"
			className={cn('size-2 shrink-0 rounded-full', !color && 'bg-primary/60')}
			style={dotStyle}
		/>
	);
});
