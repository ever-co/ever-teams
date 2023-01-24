import { ILanguageItemList } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type LanguageItem = DropdownItem<ILanguageItemList>;

export function mapLanguageItems(languages: ILanguageItemList[]) {
	const items = languages.map<LanguageItem>((language) => {
		return {
			key: language.id,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<LanguageItem
						title={language.name}
						className={selected ? 'font-medium' : ''}
					/>
				</div>
			),
			selectedLabel: (
				<LanguageItem title={language.name} className="py-2 mb-0" />
			),
			data: language,
		};
	});

	if (items.length > 0) {
		items.unshift({
			key: 0,
			Label: () => (
				<div className="flex justify-between">
					<LanguageItem
						title={'All'}
						className="w-full cursor-default"
						color="#F5F5F5"
						disabled
					/>
				</div>
			),
			disabled: true,
		});
	}

	return items;
}

export function LanguageItem({
	title,
	count,
	className,
	color,
	disabled,
}: {
	title?: string;
	count?: number;
	className?: string;
	color?: string;
	disabled?: boolean;
}) {
	return (
		<div
			className={clsxm(
				'flex items-center justify-start space-x-2 text-sm cursor-pointer mb-4',
				className
			)}
		>
			<span className={clsxm('text-normal')}>{title}</span>
		</div>
	);
}
