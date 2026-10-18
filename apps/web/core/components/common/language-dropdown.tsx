import { useLanguageSettings } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { Dropdown } from '@/core/components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LanguageItem, mapLanguageItems } from './language-item';

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
				className="w-full"
				buttonClassName={clsxm(
					'h-9 rounded-md bg-card py-0 text-sm font-medium',
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
