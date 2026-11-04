'use client';

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { MemberFace } from '@/core/components/dashboards/team/team-marks';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown } from '@/core/components/icons';

export interface PickerMember {
	id: string;
	name: string;
	imageUrl: string | null;
}

/** One member at a time for a one-person view: the face and name on an outline button, the team in a menu. */
export function MemberPickerMenu({
	members,
	member,
	onPick,
	ariaLabel
}: Readonly<{
	members: ReadonlyArray<PickerMember>;
	member: PickerMember | null;
	onPick: (id: string) => void;
	ariaLabel: string;
}>) {
	if (!member) {
		return null;
	}
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" variant="outline" size="default" aria-label={ariaLabel}>
					<MemberFace name={member.name} imageUrl={member.imageUrl} className="size-5 text-[9px]" />
					<span className="max-w-40 truncate">{member.name}</span>
					<ChevronDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="max-h-80 min-w-56">
				{members.map((item) => (
					<DropdownMenuItem key={item.id} onClick={() => onPick(item.id)}>
						<MemberFace name={item.name} imageUrl={item.imageUrl} className="size-5 text-[9px]" />
						<span className="flex-1 truncate">{item.name}</span>
						{item.id === member.id && <SelectedMark />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
