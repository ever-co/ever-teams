import { setActiveLanguageIdCookie } from '@app/helpers';
import { useLanguage } from '@app/hooks';
import { useCallback } from 'react';

export const LangSwitcher = () => {
	const { currentLanguage, changeLanguage } = useLanguage();
	const handleChangeLanguage = useCallback(
		(newLanguage: string) => {
			setActiveLanguageIdCookie(newLanguage);
			changeLanguage(newLanguage);
		},
		[changeLanguage]
	);
	return (
		<div className="max-w-[120px] flex items-center">
			<select
				value={currentLanguage}
				defaultValue={currentLanguage}
				onChange={(e) => handleChangeLanguage(e.target.value)}
				className="block w-full px-4 py-3 text-sm border-gray-200 rounded-full pr-9 focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400"
			>
				<option selected>Select language</option>
				<option value="fr">FR</option>
				<option value="ar">Arabic</option>
				<option value="zh">Chines</option>
			</select>
		</div>
	);
};
