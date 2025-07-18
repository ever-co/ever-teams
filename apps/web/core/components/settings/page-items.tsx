import { clsxm } from '@/core/lib/utils';
import { DropdownItem } from '@/core/components';
import { useTranslations } from 'next-intl';

export type PaginationItems = DropdownItem<{
	title: string;
}>;

export function mappaginationItems(PaginationList: { title: string }[]) {
	const items = PaginationList.map<PaginationItems>((page) => {
		return {
			key: page.title,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<PaginationItems title={page.title} className={selected ? 'font-medium' : ''} />
				</div>
			),
			selectedLabel: <PaginationItems title={page.title} className="py-2 mb-0" />,
			data: page
		};
	});

	return items;
}

export function PaginationItems({ title, className }: { title?: string; className?: string }) {
	const t = useTranslations();
	return (
		<div className={clsxm('flex items-center justify-start space-x-2 text-sm cursor-pointer mb-0 py-2', className)}>
			<span className={clsxm('text-normal mb-0')}>
				{t('common.SHOW')} {title}
			</span>
		</div>
	);
}
