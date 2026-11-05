'use client';

import type { ReactNode } from 'react';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { cn } from '@/core/lib/helpers';

const PREVIEW_FRAME = 'relative block overflow-hidden rounded-lg transition-shadow';

const PREVIEW_IDLE = 'hairline-ring ring-border';

const PREVIEW_PICKED = 'ring-2 ring-primary';

interface PreferenceTileProps {
	name: string;
	value: string;
	label: string;
	isPicked: boolean;
	onPick: () => void;
	preview: ReactNode;
}

export function PreferenceTile({ name, value, label, isPicked, onPick, preview }: Readonly<PreferenceTileProps>) {
	return (
		<label className="flex min-w-0 cursor-pointer flex-col gap-2">
			<input
				type="radio"
				name={name}
				value={value}
				checked={isPicked}
				onChange={onPick}
				className="peer sr-only"
			/>
			<span
				className={cn(
					PREVIEW_FRAME,
					'peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/25',
					isPicked && PREVIEW_PICKED,
					!isPicked && PREVIEW_IDLE
				)}
			>
				{preview}
				{isPicked && <SelectedMark className="absolute bottom-1.5 left-1.5" />}
			</span>
			<span className="truncate text-[13px] font-medium text-foreground">{label}</span>
		</label>
	);
}
