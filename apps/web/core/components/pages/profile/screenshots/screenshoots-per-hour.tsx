'use client';

import React, { memo, useCallback } from 'react';
import { useModal } from '@/core/hooks';
import { TASK_GROUP_LABEL, TASK_GROUP_STACK } from '@/core/components/tasks/task-row-recipes';
import { cn } from '@/core/lib/helpers';
import { TTimeSlot } from '@/core/types/schemas';
import ScreenshotDetailsModal from './screenshot-details';
import ScreenshotItem from './screenshot-item';
import { type ScreenshotSlotActions, screenshotsOf } from './screenshot-slots';

export type ScreenshotDensity = 'regular' | 'dense';

/** Tiles fill the width they get, a page or a member card, without a breakpoint of their own. */
const SLOT_GRIDS: Record<ScreenshotDensity, string> = {
	regular: 'grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-3 gap-y-5',
	dense: 'grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-3 gap-y-4'
};

function densityOf(isTeamPage: boolean): ScreenshotDensity {
	if (isTeamPage) {
		return 'dense';
	}
	return 'regular';
}

const SlotTile = memo(function SlotTile({
	slot,
	slotActions,
	onOpenSlot,
	isTeamPage
}: Readonly<{
	slot: TTimeSlot;
	slotActions?: ScreenshotSlotActions;
	onOpenSlot: (slot: TTimeSlot) => void;
	isTeamPage: boolean;
}>) {
	const shots = screenshotsOf(slot);
	const firstShot = shots[0];
	const showSlot = useCallback(() => onOpenSlot(slot), [onOpenSlot, slot]);
	return (
		<ScreenshotItem
			idSlot={slot.id}
			startTime={slot.startedAt}
			endTime={slot.stoppedAt ?? ''}
			imageUrl={firstShot?.thumbUrl ?? ''}
			fullImageUrl={firstShot?.fullUrl}
			screenshotCount={shots.length}
			percent={slot.percentage ?? 0}
			onShow={showSlot}
			slotActions={slotActions}
			isTeamPage={isTeamPage}
		/>
	);
});

/** One hour of a day: its range as a label outside, then the grid of its slots. */
export const ScreenshotHourGroup = memo(function ScreenshotHourGroup({
	label,
	slots,
	slotActions,
	onOpenSlot,
	density = 'regular'
}: Readonly<{
	label: string;
	slots: ReadonlyArray<TTimeSlot>;
	slotActions?: ScreenshotSlotActions;
	onOpenSlot: (slot: TTimeSlot) => void;
	density?: ScreenshotDensity;
}>) {
	const isDense = density === 'dense';
	return (
		<section className={TASK_GROUP_STACK} aria-label={label}>
			<h3 className={cn(TASK_GROUP_LABEL, 'tabular-nums')}>{label}</h3>
			<ol className={SLOT_GRIDS[density]}>
				{slots.map((slot) => (
					<li key={slot.id} className="min-w-0">
						<SlotTile slot={slot} slotActions={slotActions} onOpenSlot={onOpenSlot} isTeamPage={isDense} />
					</li>
				))}
			</ol>
		</section>
	);
});

/** An hour of screenshots rendered on its own, with its own detail dialog. */
export const ScreenshotPerHour = ({
	timeSlots,
	startedAt,
	stoppedAt,
	isTeamPage = false
}: {
	timeSlots: TTimeSlot[];
	startedAt: string;
	stoppedAt: string;
	isTeamPage?: boolean;
}) => {
	const { isOpen, closeModal, openModal } = useModal();
	const [selectedElement, setSelectedElement] = React.useState<TTimeSlot | null>(null);

	const openScreenModal = useCallback(
		(el: TTimeSlot) => {
			setSelectedElement(el);
			openModal();
		},
		[openModal]
	);

	const label = `${startedAt} – ${stoppedAt}`;
	return (
		<>
			<ScreenshotHourGroup
				label={label}
				slots={timeSlots}
				onOpenSlot={openScreenModal}
				density={densityOf(isTeamPage)}
			/>
			<ScreenshotDetailsModal open={isOpen} closeModal={closeModal} slot={selectedElement} />
		</>
	);
};

export const ScreenshotPerHourTeam = (props: { timeSlots: TTimeSlot[]; startedAt: string; stoppedAt: string }) => {
	return <ScreenshotPerHour {...props} isTeamPage={true} />;
};
