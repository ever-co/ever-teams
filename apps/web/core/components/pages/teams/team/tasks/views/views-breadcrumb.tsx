'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Breadcrumb } from '@/core/components/duplicated-components/breadcrumb';
import { Layers } from '@/core/components/icons';

/** "Views", then the view the page is on when there is one: the top bar of the views index and of its notices. */
export function ViewsBreadcrumb({ current }: Readonly<{ current?: { title: string; path: string } }>) {
	const t = useTranslations();
	const locale = useLocale();
	const paths: Array<{ title: string; href: string }> = [{ title: t('taskViews.TITLE'), href: `/${locale}/views` }];
	if (current) {
		paths.push({ title: current.title, href: `/${locale}${current.path}` });
	}
	return (
		<div className="flex min-w-0 items-center gap-2">
			<Layers className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
			<Breadcrumb paths={paths} className="min-w-0 text-sm" />
		</div>
	);
}
