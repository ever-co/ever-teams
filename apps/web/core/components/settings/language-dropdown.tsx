import { useLanguageSettings } from '@/core/hooks';
import { clsxm } from '@app/utils';
import { Dropdown } from '@/core/components';
import { mapLanguageItems, LanguageItem } from '@/core/components/features';
import { useCallback, useEffect, useMemo, useState } from 'react';

export const LanguageDropDown = ({
	currentLanguage,
	onChangeLanguage
}: {
	currentLanguage: string;
	onChangeLanguage: any;
}) => {
	const { languages, activeLanguage, setActiveLanguage, languagesFetching } = useLanguageSettings();

	const items = useMemo(() => mapLanguageItems(languages), [languages]);

	const [languageItem, setLanguageItem] = useState<LanguageItem | null>(null);

	useEffect(() => {
		setLanguageItem(items.find((t) => t.key === activeLanguage?.code || t.key === currentLanguage) || null);
	}, [activeLanguage, items, currentLanguage]);

	const onChange = useCallback(
		(item: LanguageItem) => {
			if (item.data) {
				onChangeLanguage(item.data.code);
				setActiveLanguage(item.data);
			}
		},
		[setActiveLanguage, onChangeLanguage]
	);

	return (
		<>
			<Dropdown
				className="md:w-[469px]"
				buttonClassName={clsxm(
					'py-0 font-medium h-[54px] bg-light--theme-light dark:bg-dark--theme-light dark:text-white',
					items.length === 0 && ['py-2']
				)}
				value={languageItem}
				onChange={(e: any) => onChange(e)}
				items={items}
				loading={languagesFetching}
			></Dropdown>
		</>
	);
};
