import { languagesFlags } from '@app/constants';
import { setActiveLanguageIdCookie } from '@app/helpers';
import { useLanguage, useLanguageSettings } from '@app/hooks';
import { clsxm } from '@app/utils';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@components/ui/select';
import { mapLanguageItems } from 'lib/features';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

export function LanguageDropDownWithFlags({ btnClassName }: { btnClassName?: string }) {
	const { changeLanguage } = useLanguage();
	const { languages, loadLanguagesData, setActiveLanguage } = useLanguageSettings();
	const { setValue } = useForm();
	const router = useRouter();
	const path: any = usePathname();
	const items = useMemo(() => mapLanguageItems(languages), [languages]);
	const pathArray = path?.split('/');
	const isLangaugeNotEn = Array.isArray(pathArray) && pathArray[1].length == 2;

	useEffect(() => {
		loadLanguagesData();
	}, [loadLanguagesData]);

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
	const converLanguageToObject = languagesFlags.reduce((acc: any, obj) => {
		acc[obj.code] = obj;
		return acc;
	}, {});
	return (
		<Select
			onValueChange={(e: any) => {
				handleChangeLanguage(e.code);
				setActiveLanguage(e);
			}}
		>
			<SelectTrigger className={clsxm('border-none bg-light--theme-dark mr-4 dark:bg-[#1D222A]', btnClassName)}>
				<Image
					src={converLanguageToObject[isLangaugeNotEn ? pathArray[1] : 'en'].flag}
					alt=""
					className="mr-2"
					width={15}
					height={20}
				/>
				{items.filter((v) => v.data?.code == pathArray[1]).length
					? items.filter((v) => v.data?.code == pathArray[1])[0].data?.name
					: 'English'}
			</SelectTrigger>
			<SelectContent className="bg-light--theme-light overflow-y-auto rounded-[16px] z-[50000] relative p-3 min-w-28 rounded-x dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C]">
				{items.map((item: any) => (
					<SelectItem
						chevronClass="hidden"
						key={item.key}
						value={item.data}
						className={clsxm('cursor-pointer relative flex pl-2 hover:!bg-transparent hover:font-semibold')}
					>
						<div className="flex">
							<Image
								src={converLanguageToObject[item.data.code].flag}
								alt=""
								className="mr-2"
								width={15}
								height={20}
							/>
							<span>{item.data.name}</span>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
