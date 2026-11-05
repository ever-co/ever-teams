'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { cn } from '@/core/lib/helpers';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export interface Person {
	id: string;
	name: string;
	imageUrl: string | null | undefined;
}

type TaskMember = NonNullable<TTask['members']>[number];

export function personFromTaskMember(member: TaskMember): Person {
	const name = member.fullName ?? member.user?.name ?? '';
	return { id: member.id, name, imageUrl: member.user?.imageUrl };
}

export function personFromTeamMember(member: TOrganizationTeamEmployee): Person {
	const user = member.employee?.user;
	const name = member.employee?.fullName ?? user?.name ?? '';
	return { id: member.id, name, imageUrl: user?.imageUrl };
}

function initialsOf(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const letters = words.slice(0, 2).map((word) => word[0]);
	return letters.join('').toUpperCase();
}

const SIZE_CLASS = {
	sm: 'size-6 text-[10px]',
	md: 'size-7 text-[11px]'
} as const;

export function PersonAvatar({
	person,
	size = 'sm',
	className
}: Readonly<{ person: Person; size?: keyof typeof SIZE_CLASS; className?: string }>) {
	return (
		<Avatar className={cn(SIZE_CLASS[size], 'ring-2 ring-card', className)}>
			<AvatarImage src={person.imageUrl ?? undefined} alt={person.name} />
			<AvatarFallback className="text-[inherit]">{initialsOf(person.name)}</AvatarFallback>
		</Avatar>
	);
}

/**
 * Overlapping avatars with the remainder as a count chip. Each face says who it is on hover; `onPick` turns the
 * stack into buttons (the toolbar filters the board by the picked member).
 */
export function AvatarStack({
	people,
	max = 3,
	size = 'sm',
	onPick,
	pickLabel
}: Readonly<{
	people: Person[];
	max?: number;
	size?: keyof typeof SIZE_CLASS;
	onPick?: (person: Person) => void;
	pickLabel?: (person: Person) => string;
}>) {
	const shown = people.slice(0, max);
	const remaining = people.length - shown.length;
	const hasRemaining = remaining > 0;

	return (
		<div className="flex items-center -space-x-1.5">
			{shown.map((person) => (
				<Tooltip key={person.id}>
					<TooltipTrigger
						render={
							<AvatarStackButton
								person={person}
								size={size}
								onPick={onPick}
								label={pickLabel?.(person) ?? person.name}
							/>
						}
					/>
					<TooltipContent>{person.name}</TooltipContent>
				</Tooltip>
			))}
			{hasRemaining && (
				<span
					className={cn(
						SIZE_CLASS[size],
						'relative flex shrink-0 items-center justify-center rounded-full bg-muted font-medium tabular-nums text-muted-foreground ring-2 ring-card'
					)}
				>
					+{remaining}
				</span>
			)}
		</div>
	);
}

function AvatarStackButton({
	person,
	size,
	onPick,
	label,
	...triggerProps
}: Readonly<{
	person: Person;
	size: keyof typeof SIZE_CLASS;
	onPick?: (person: Person) => void;
	label: string;
}>) {
	if (!onPick) {
		return (
			<span {...triggerProps} className="relative flex rounded-full">
				<PersonAvatar person={person} size={size} />
			</span>
		);
	}
	return (
		<button
			type="button"
			{...triggerProps}
			aria-label={label}
			onClick={() => onPick(person)}
			className="relative flex rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
		>
			<PersonAvatar person={person} size={size} />
		</button>
	);
}
