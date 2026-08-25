import { languagesFlags } from '@/core/constants/config/constants';
import { setActiveLanguageIdCookie } from '@/core/lib/helpers/index';
import { useLanguage, useLanguageSettings } from '@/core/hooks';
import { clsxm } from '@/core/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/core/components/common/select';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { mapLanguageItems } from './language-item';

export function LanguageDropDownWithFlags({
	btnClassName,
	showFlag = true,
	deferLoading = false
}: {
	btnClassName?: string;
	showFlag?: boolean;
	deferLoading?: boolean;
}) {
	const { changeLanguage } = useLanguage();
	const isDeferred = deferLoading;
	const [interactionActivated, setInteractionActivated] = useState(false);
	const [open, setOpen] = useState(false);
	const [pendingOpen, setPendingOpen] = useState(false);
	const [loadPhase, setLoadPhase] = useState<'idle' | 'activating' | 'retrying' | 'awaiting-items'>('idle');
	const [activationCheckReady, setActivationCheckReady] = useState(false);
	const { languages, loadLanguagesData, setActiveLanguage, loading, isError, refetch } = useLanguageSettings({
		enabled: !isDeferred || interactionActivated
	});
	const { setValue } = useForm();
	const router = useRouter();
	const path: any = usePathname();
	const items = useMemo(() => mapLanguageItems(languages), [languages]);
	const pathArray = path?.split('/');
	const isLanguageNotEn = Array.isArray(pathArray) && pathArray[1].length == 2;

	useEffect(() => {
		if (isDeferred) return;
		loadLanguagesData();
	}, [isDeferred, loadLanguagesData]);

	useEffect(() => {
		if (!isDeferred) return;
		if (pendingOpen && items.length > 0) {
			setPendingOpen(false);
			setOpen(true);
			setLoadPhase('idle');
			setActivationCheckReady(false);
			return;
		}
		if (pendingOpen && loadPhase === 'activating') {
			if (loading) {
				if (!activationCheckReady) setActivationCheckReady(true);
				return;
			}
			if (!activationCheckReady && !isError) {
				setActivationCheckReady(true);
				return;
			}
			setPendingOpen(false);
			setLoadPhase('idle');
			setActivationCheckReady(false);
		} else if (open && items.length === 0) {
			setOpen(false);
		}
	}, [activationCheckReady, isDeferred, isError, items.length, loadPhase, loading, open, pendingOpen]);

	const retryLanguages = useCallback(async () => {
		setLoadPhase('retrying');
		try {
			const result = await refetch();
			if (result.isError || !result.data?.items.length) {
				setPendingOpen(false);
				setLoadPhase('idle');
				return;
			}
			setLoadPhase('awaiting-items');
		} catch {
			setPendingOpen(false);
			setLoadPhase('idle');
		}
	}, [refetch]);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			if (!nextOpen) {
				setPendingOpen(false);
				setOpen(false);
				setLoadPhase('idle');
				setActivationCheckReady(false);
				return;
			}
			if (items.length > 0) {
				setOpen(true);
				return;
			}

			setPendingOpen(true);
			if (!interactionActivated) {
				setLoadPhase('activating');
				setActivationCheckReady(false);
				setInteractionActivated(true);
				return;
			}
			void retryLanguages();
		},
		[interactionActivated, items.length, retryLanguages]
	);

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
			{...(isDeferred ? { open, onOpenChange: handleOpenChange } : {})}
			onValueChange={(e: any) => {
				handleChangeLanguage(e.code);
				setActiveLanguage(e);
			}}
		>
			<SelectTrigger
				className={clsxm(btnClassName)}
				disabled={isDeferred && pendingOpen}
				aria-busy={isDeferred && pendingOpen}
			>
				{showFlag ? <ActiveFlag className="size-3 shrink-0 mr-2.5 " /> : null}

				<span className="text-sm text-gray-500">
					{items.find((v) => v.data?.code == pathArray[1])?.data?.name ?? 'English'}
				</span>
			</SelectTrigger>
			<SelectContent className="bg-light--theme-light overflow-y-auto w-auto rounded-xl z-1001 relative  rounded-x dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C]">
				{items.map((item: any) => {
					const Flag = converLanguageToObject[item.data.code].Flag;
					return (
						<SelectItem
							chevronClass="hidden"
							key={item.key}
							value={item.data}
							className={clsxm(
								'cursor-pointer relative flex hover:bg-transparent! hover:font-semibold p-2!'
							)}
						>
							<div className="flex gap-2 text-xs">
								<Flag className="w-6 h-4" />
								<span>{item.data.name}</span>
							</div>
						</SelectItem>
					);
				})}
			</SelectContent>
		</Select>
	);
}
