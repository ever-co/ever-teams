'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { BlockEmptyMessage } from '@/core/components/dashboards/kit/dashboard-states';
import { DASHBOARD_SURFACE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { Button } from '@/core/components/duplicated-components/_button';
import { PageSkeletonFrame, ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { cn } from '@/core/lib/helpers';
import { NEW_INVOICE_LAYOUT } from './new-invoice-recipes';

const CONTROL_WIDTHS = ['w-44', 'w-40'];

const SKELETON_LINES = 5;

function lineKeys(count: number) {
	return Array.from({ length: count }, (_, index) => `line-${index}`);
}

export function InvoiceSheetSkeleton() {
	return (
		<div aria-hidden="true" className={NEW_INVOICE_LAYOUT}>
			<div className={cn(DASHBOARD_SURFACE, 'flex flex-col gap-6 p-4 sm:p-6')}>
				<div className="flex flex-wrap justify-between gap-4">
					<span className={cn('h-3 w-32', SKELETON_BAR)} />
					<span className={cn('h-3 w-40', SKELETON_BAR)} />
				</div>
				<span className={cn('h-9 w-full rounded-lg', SKELETON_BAR)} />
				<div className="flex flex-col gap-3 px-3">
					{lineKeys(SKELETON_LINES).map((key) => (
						<div key={key} className="flex items-center gap-4">
							<span className={cn('h-8 flex-1 rounded-md', SKELETON_BAR)} />
							<span className={cn('h-2.5 w-12', SKELETON_BAR)} />
							<span className={cn('h-2.5 w-16 max-sm:hidden', SKELETON_BAR)} />
							<span className={cn('h-2.5 w-16', SKELETON_BAR)} />
						</div>
					))}
				</div>
				<span className={cn('ml-auto h-6 w-32', SKELETON_BAR)} />
			</div>
			<div className={cn(DASHBOARD_SURFACE, 'flex flex-col gap-4 p-4')}>
				<span className={cn('h-3 w-20', SKELETON_BAR)} />
				<span className={cn('h-9 w-full rounded-md', SKELETON_BAR)} />
				<span className={cn('h-9 w-full rounded-md', SKELETON_BAR)} />
				<span className={cn('h-9 w-full rounded-md', SKELETON_BAR)} />
			</div>
		</div>
	);
}

function NewInvoiceToolbarSkeleton({ title }: Readonly<{ title?: string }>) {
	const t = useTranslations();
	const shownTitle = title ?? t('invoices.new.TITLE');
	return (
		<div className="px-4" aria-hidden="true">
			<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5">
				<h1 className="truncate text-lg font-semibold text-foreground">{shownTitle}</h1>
			</div>
			<div className="flex flex-wrap items-center gap-2 pb-3">
				<ToolbarPills widths={CONTROL_WIDTHS} />
			</div>
		</div>
	);
}

/** The invoice screen while it loads; an edited invoice's says so in its title. */
export function NewInvoicePageSkeleton({ title }: Readonly<{ title?: string }>) {
	return (
		<PageSkeletonFrame toolbar={<NewInvoiceToolbarSkeleton title={title} />}>
			<InvoiceSheetSkeleton />
		</PageSkeletonFrame>
	);
}

export function NewInvoiceMessage({
	title,
	message,
	action
}: Readonly<{ title: string; message: string; action?: ReactNode }>) {
	return (
		<DashboardSection>
			<BlockEmptyMessage title={title} message={message} action={action} className="py-16" />
		</DashboardSection>
	);
}

export function MessageLink({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
	return (
		<Button asChild variant="outline" size="default">
			<Link href={href}>{children}</Link>
		</Button>
	);
}
