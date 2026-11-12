'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Skeleton } from '@/core/components/common/skeleton';
import { Button } from '@/core/components/duplicated-components/_button';
import { Invoice, Plus } from '@/core/components/icons';
import { PageSkeletonFrame } from '@/core/components/layouts/page-skeleton';
import { cn } from '@/core/lib/helpers';
import { NEW_INVOICE_PATH } from './invoice-access-guard';
import { LEDGER_ROW_GRID, LEDGER_SURFACE } from './invoices-ledger-recipes';

const SKELETON_BAR = 'bg-foreground/[0.06]';

const SKELETON_ROWS = 5;

function rowKeys(count: number) {
	return Array.from({ length: count }, (_, index) => `skeleton-${index}`);
}

function nameBarWidthOf(index: number) {
	const isEven = index % 2 === 0;
	if (isEven) {
		return 'w-36';
	}
	return 'w-24';
}

function InvoicesCountSkeleton() {
	return <Skeleton aria-hidden="true" className={cn('h-2.5 w-16 self-center rounded-full', SKELETON_BAR)} />;
}

export function InvoicesLedgerSkeleton() {
	return (
		<div aria-hidden="true" className="flex flex-col gap-2">
			<Skeleton className={cn('ml-1 h-3 w-28', SKELETON_BAR)} />
			<div className={cn(LEDGER_SURFACE, 'py-1')}>
				{rowKeys(SKELETON_ROWS).map((key, index) => (
					<div key={key} className={cn(LEDGER_ROW_GRID, 'min-h-14 px-3')}>
						<span className="flex items-center gap-2.5">
							<Skeleton className={cn('size-8 rounded-[9px]', SKELETON_BAR)} />
							<span className="flex flex-col gap-1.5">
								<Skeleton className={cn('h-3', SKELETON_BAR, nameBarWidthOf(index))} />
								<Skeleton className={cn('h-2.5 w-20', SKELETON_BAR)} />
							</span>
						</span>
						<Skeleton className={cn('h-3 w-32 max-lg:hidden', SKELETON_BAR)} />
						<Skeleton className={cn('h-3 w-20 max-lg:hidden', SKELETON_BAR)} />
						<Skeleton className={cn('h-4 w-14 max-lg:hidden', SKELETON_BAR)} />
						<Skeleton className={cn('ml-auto h-3 w-16', SKELETON_BAR)} />
						<span />
						<Skeleton className={cn('col-span-full ml-10.5 h-2.5 w-40 lg:hidden', SKELETON_BAR)} />
					</div>
				))}
			</div>
		</div>
	);
}

export function InvoicesToolbar({
	total,
	isLoading,
	canCreate
}: Readonly<{ total: number | null; isLoading: boolean; canCreate: boolean }>) {
	const t = useTranslations();
	const showsCount = !isLoading && total !== null;
	return (
		<div className="px-4">
			<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5">
				<div className="flex min-w-0 items-baseline gap-2">
					<h1 className="truncate text-lg font-semibold text-foreground">{t('invoices.TITLE')}</h1>
					{isLoading && <InvoicesCountSkeleton />}
					{showsCount && (
						<span className="text-xs tabular-nums text-muted-foreground">
							{t('invoices.COUNT', { count: total ?? 0 })}
						</span>
					)}
				</div>
				{canCreate && (
					<Button asChild variant="default" size="default">
						<Link href={NEW_INVOICE_PATH}>
							<Plus />
							<span>{t('invoices.NEW_INVOICE')}</span>
						</Link>
					</Button>
				)}
			</div>
		</div>
	);
}

function InvoicesToolbarSkeleton() {
	const t = useTranslations();
	return (
		<div className="px-4" aria-hidden="true">
			<div className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-2.5">
				<div className="flex min-w-0 items-baseline gap-2">
					<h1 className="truncate text-lg font-semibold text-foreground">{t('invoices.TITLE')}</h1>
					<InvoicesCountSkeleton />
				</div>
			</div>
		</div>
	);
}

export function InvoicesPageSkeleton() {
	return (
		<PageSkeletonFrame toolbar={<InvoicesToolbarSkeleton />}>
			<InvoicesLedgerSkeleton />
		</PageSkeletonFrame>
	);
}

export function InvoicesEmptyState({ canCreate }: Readonly<{ canCreate: boolean }>) {
	const t = useTranslations();
	const router = useRouter();
	if (!canCreate) {
		return (
			<AnimatedEmptyState
				title={t('invoices.EMPTY_TITLE')}
				message={t('invoices.EMPTY_MESSAGE_READ_ONLY')}
				icon={<Invoice />}
				minHeight="420px"
			/>
		);
	}
	return (
		<AnimatedEmptyState
			title={t('invoices.EMPTY_TITLE')}
			message={t('invoices.EMPTY_MESSAGE')}
			icon={<Invoice />}
			actionLabel={t('invoices.NEW_INVOICE')}
			onAction={() => router.push(NEW_INVOICE_PATH)}
			minHeight="420px"
		/>
	);
}

export function InvoicesErrorState({ onRetry }: Readonly<{ onRetry: () => void }>) {
	const t = useTranslations();
	return (
		<AnimatedEmptyState
			title={t('invoices.ERROR_TITLE')}
			message={t('invoices.ERROR_MESSAGE')}
			actionLabel={t('pages.unauthorized.TRY_AGAIN')}
			actionVariant="outline"
			onAction={onRetry}
			minHeight="420px"
		/>
	);
}
