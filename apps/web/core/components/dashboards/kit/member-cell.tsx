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
	const words = name.trim().split(/\s+/).filter(Boolean);
	const first = words[0]?.[0] ?? '';
	const last = lastInitialOf(words);
	return `${first}${last}`.toUpperCase();
}

/** A person in a report row: their own avatar (photo or Gauzy's placeholder, never a plate) and their name. */
export const MemberCell = memo(function MemberCell({
	name,
	imageUrl,
	meta,
	className
}: Readonly<{ name: string; imageUrl?: string | null; meta?: string; className?: string }>) {
	return (
		<span className={cn('flex min-w-0 items-center gap-2.5', className)}>
			<Avatar className="size-6">
				<AvatarImage src={imageUrl ?? undefined} alt="" loading="lazy" />
				<AvatarFallback className="text-[10px]">{initialsOf(name)}</AvatarFallback>
			</Avatar>
			<span className="flex min-w-0 flex-col">
				<span className="truncate text-[13px] text-foreground">{name}</span>
				{meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
			</span>
		</span>
	);
});
