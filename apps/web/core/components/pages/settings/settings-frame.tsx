import { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';

type SettingsFrameProps = PropsWithChildren<{
	navigation: ReactNode;
	className?: string;
}>;

export function SettingsFrame({ navigation, children, className }: SettingsFrameProps) {
	return (
		<div
			data-testid="settings-frame"
			className={cn(
				'grid w-full grid-cols-1 items-start gap-6 py-6 lg:grid-cols-[15rem_minmax(0,1fr)]',
				className
			)}
		>
			<aside className="lg:sticky lg:top-6">{navigation}</aside>
			<section className="min-w-0 pb-8">{children}</section>
		</div>
	);
}
