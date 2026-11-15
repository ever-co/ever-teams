'use client';

import type { ReactNode } from 'react';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { SECTION_HEADER, SECTION_META, SECTION_TITLE } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';

interface ClientSectionProps {
	title: ReactNode;
	meta?: ReactNode;
	actions?: ReactNode;
	/** On the client page a section is a surface of its own; inside the sheet it sits on the sheet's surface. */
	framed: boolean;
	children: ReactNode;
}

export function ClientSection({ title, meta, actions, framed, children }: Readonly<ClientSectionProps>) {
	if (framed) {
		return (
			<DashboardSection title={title} meta={meta} actions={actions}>
				{children}
			</DashboardSection>
		);
	}
	return (
		<section className="flex flex-col">
			<header className={cn(SECTION_HEADER, 'px-0')}>
				<div className="flex min-w-0 items-baseline gap-2">
					<h2 className={SECTION_TITLE}>{title}</h2>
					{meta && <span className={SECTION_META}>{meta}</span>}
				</div>
				{actions && <div className="flex items-center gap-2">{actions}</div>}
			</header>
			{children}
		</section>
	);
}
