import { useLanguageSettings } from '@app/hooks';
import { clsxm } from '@app/utils';
import { Dropdown } from 'lib/components';
import { mapLanguageItems, LanguageItem } from 'lib/features';
import { useCallback, useEffect, useMemo, useState } from 'react';

export const LanguageDropDown = () => {
	const { languages, activeLanguage, setActiveLanguage, languagesFetching } =
		useLanguageSettings();

	const items = useMemo(() => mapLanguageItems(languages), [languages]);

	const [languageItem, setLanguageItem] = useState<LanguageItem | null>(null);

	useEffect(() => {
		setLanguageItem(items.find((t) => t.key === activeLanguage?.id) || null);
	}, [activeLanguage, items]);

	const onChangeLanguage = useCallback(
		(item: LanguageItem) => {
			if (item.data) {
				setActiveLanguage(item.data);
			}
		},
		[setActiveLanguage]
	);

	return (
		<>
			<Dropdown
				className="md:w-[231px] z-auto"
				buttonClassName={clsxm(
					'py-0 font-medium H-[3.1REM]',
					items.length === 0 && ['py-2']
				)}
				value={languageItem}
				onChange={onChangeLanguage}
				items={items}
				loading={languagesFetching}
			></Dropdown>
		</>
	);
};
