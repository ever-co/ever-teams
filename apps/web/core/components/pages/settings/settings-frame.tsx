'use client';

import { PropsWithChildren, ReactNode } from 'react';
import { useAtomValue } from 'jotai';
import { cn } from '@/core/lib/helpers';
import { chatPanelOpenAtom } from '@/core/components/features/chat-panel/atoms/chat-panel-open.atom';

type SettingsFrameProps = PropsWithChildren<{
	navigation: ReactNode;
	className?: string;
}>;

/**
 * Settings: section nav beside the content once there is room for both. The AI chat panel takes part of
 * the width, so the two-column layout starts at a wider viewport while it is open (viewport breakpoints,
 * not container queries: a query container would re-parent the fixed-position overlays of the page).
 */
export function SettingsFrame({ navigation, children, className }: Readonly<SettingsFrameProps>) {
	const chatOpen = useAtomValue(chatPanelOpenAtom);

	return (
		<div
			data-testid="settings-frame"
			className={cn(
				'grid w-full grid-cols-1 items-start gap-6 py-6',
				chatOpen ? '2xl:grid-cols-[14rem_minmax(0,1fr)] 2xl:gap-8' : 'lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8',
				className
			)}
		>
			<aside className={chatOpen ? '2xl:sticky 2xl:top-6' : 'lg:sticky lg:top-6'}>{navigation}</aside>
			<section className="min-w-0 pb-8">{children}</section>
		</div>
	);
}
