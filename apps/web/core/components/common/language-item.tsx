import { clsxm } from '@/core/lib/utils';
import { DropdownItem } from '@/core/components';
import { ILanguageItemList as ILanguage } from '@/core/types/interfaces/common/language';

export type LanguageItem = DropdownItem<ILanguage>;

export function mapLanguageItems(languages: ILanguage[]) {
	const items = languages.map<LanguageItem>((language) => {
		return {
			key: language.code,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<LanguageItem title={language.name} className={selected ? 'font-medium' : ''} />
				</div>
			),
			selectedLabel: <LanguageItem title={language.name} className="py-2 mb-0" />,
			data: language
		};
	});

	return items;
}

export function LanguageItem({
	title,
	// count,
	// color,
	// disabled,
	className
}: {
	title?: string;
	count?: number;
	className?: string;
	color?: string;
	disabled?: boolean;
}) {
	return (
		<div className={clsxm('flex items-center justify-start space-x-2 text-sm cursor-pointer mb-4', className)}>
			<span className={clsxm('text-normal dark:text-white')}>{title}</span>
		</div>
	);
}
