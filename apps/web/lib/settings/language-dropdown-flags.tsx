import { languagesFlags } from '@app/constants';
import { setActiveLanguageIdCookie } from '@app/helpers';
import { useLanguage, useLanguageSettings } from '@app/hooks';
import { clsxm } from '@app/utils';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/core/components/ui/select';
import { mapLanguageItems } from '@/core/components/features';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';

export function LanguageDropDownWithFlags({
	btnClassName,
	showFlag = true
}: {
	btnClassName?: string;
	showFlag?: boolean;
}) {
	const { changeLanguage } = useLanguage();
	const { languages, loadLanguagesData, setActiveLanguage } = useLanguageSettings();
	const { setValue } = useForm();
	const router = useRouter();
	const path: any = usePathname();
	const items = useMemo(() => mapLanguageItems(languages), [languages]);
	const pathArray = path?.split('/');
	const isLanguageNotEn = Array.isArray(pathArray) && pathArray[1].length == 2;

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
			const isLanguageNotEn = pathArray && pathArray[1].length == 2;
			if (isLanguageNotEn) {
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
	const ActiveFlag = converLanguageToObject[isLanguageNotEn ? pathArray[1] : 'en'].Flag;
	return (
		<Select
			onValueChange={(e: any) => {
				handleChangeLanguage(e.code);
				setActiveLanguage(e);
			}}
		>
			<SelectTrigger className={clsxm(btnClassName)}>
				{showFlag ? <ActiveFlag className=" h-3 w-4 mr-2.5 " /> : null}

				<span className=" font-light text-sm text-gray-500">
					{items.filter((v) => v.data?.code == pathArray[1]).length
						? items.filter((v) => v.data?.code == pathArray[1])[0].data?.name
						: 'English'}
				</span>
			</SelectTrigger>
			<SelectContent className="bg-light--theme-light overflow-y-auto w-auto rounded-xl z-[50000] relative  rounded-x dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C]">
				{items.map((item: any) => {
					const Flag = converLanguageToObject[item.data.code].Flag;
					return (
						<SelectItem
							chevronClass="hidden"
							key={item.key}
							value={item.data}
							className={clsxm(
								'cursor-pointer relative flex hover:!bg-transparent hover:font-semibold !p-2'
							)}
						>
							<div className="flex gap-2 text-xs">
								<Flag className="h-4 w-6" />
								<span>{item.data.name}</span>
							</div>
						</SelectItem>
					);
				})}
			</SelectContent>
		</Select>
	);
}
