import { setActiveLanguageIdCookie } from '@app/helpers';
import { useLanguage, useLanguageSettings } from '@app/hooks';
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@components/ui/select';
import { Text, ThemeToggler } from 'lib/components';
import { LanguageItem, mapLanguageItems } from 'lib/features';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

export function Footer({ className }: IClassName) {
	const t = useTranslations();
	const { currentLanguage, changeLanguage } = useLanguage();
	const { languages, loadLanguagesData, activeLanguage, setActiveLanguage, languagesFetching } =
		useLanguageSettings();
	const { setValue } = useForm();
	const router = useRouter();
	const path: any = usePathname();
	const items = useMemo(() => mapLanguageItems(languages), [languages]);
	// {Value?.selectedLabel || (Value?.Label && <Value.Label />)}
	const [languageItem, setLanguageItem] = useState<LanguageItem | null>(null);
	const Value = languageItem;
	const pathArray = path?.split('/');

	useEffect(() => {
		loadLanguagesData();
	}, [loadLanguagesData]);
	useEffect(() => {
		setLanguageItem(items.find((t) => t.key === activeLanguage?.code || t.key === currentLanguage) || null);
	}, [activeLanguage, items, currentLanguage]);
	const handleChangeLanguage = useCallback(
		(newLanguage: string) => {
			setActiveLanguageIdCookie(newLanguage);
			changeLanguage(newLanguage);
			setValue('preferredLanguage', newLanguage);
			const pathArray = path?.split('/');
			const pathWithoutLanguage = path?.replace(`/${pathArray[1]}`, '');
			const isLangaugeNotEn = pathArray && pathArray[1].length == 2;
			if (isLangaugeNotEn) {
				router.replace(`/${newLanguage}/${pathWithoutLanguage}`);
			} else if (newLanguage !== 'en') {
				router.replace(`/${newLanguage}/${path}`);
			}
		},
		[changeLanguage, setValue, path, router]
	);

	return (
		<footer className={clsxm('flex flex-col xs:flex-row justify-around items-center w-full py-6 px-3', className)}>
			<p className="text-neutral text-xs font-normal leading-4 -tracking-[-0.02em] text-center md:mb-2 mb-7">
				{t('layout.footer.COPY_RIGHT1', { date: new Date().getFullYear() })}{' '}
				<Text.Link href="https://ever.team">{t('TITLE')}</Text.Link> {t('layout.footer.BY')}{' '}
				<Text.Link href="https://ever.co/">{t('layout.footer.COPY_RIGHT4')}</Text.Link>{' '}
				{t('layout.footer.RIGHTS_RESERVED')}
			</p>
			<div className="flex">
				<Select
					onValueChange={(e: any) => {
						handleChangeLanguage(e?.code);
						setActiveLanguage(e);
					}}
				>
					<SelectTrigger className="border-none bg-light--theme-dark mr-4 dark:bg-[#1D222A]">
						{items.filter((v) => v.data?.code == pathArray[1]).length
							? items.filter((v) => v.data?.code == pathArray[1])[0].data?.name
							: 'English'}
					</SelectTrigger>
					<SelectContent className="bg-light--theme-light overflow-y-auto rounded-[16px] p-3 !w-20 rounded-x dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C]">
						{items.map((item) => (
							<SelectItem
								chevronClass="hidden"
								key={item.key}
								value={item.data}
								className={clsxm('cursor-pointer pl-2 hover:!bg-transparent hover:font-semibold')}
							>
								{item.data?.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<ThemeToggler />
			</div>
		</footer>
	);
}
