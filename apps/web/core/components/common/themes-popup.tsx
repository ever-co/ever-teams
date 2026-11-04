import { ThemesPopup as IThemesPopup } from '@/core/types/interfaces/common/theme';
import { Switch } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { ThemePreview } from './theme-preview';
import { clsxm } from '@/core/lib/utils';

const ThemesPopup = ({ theme, currentTheme, text, enabled, setTheme, index }: IThemesPopup) => {
	const t = useTranslations();
	return (
		<div
			onClick={() => setTheme(theme)}
			className="cursor-pointer rounded-lg bg-foreground/[0.03] text-sm font-normal"
		>
			<div className="flex justify-between px-4 my-4">
				<h3 className="font-medium">{text}</h3>
				<Switch
					checked={enabled}
					onChange={() => setTheme(theme)}
					className={clsxm(
						'relative inline-flex h-4 w-7 items-center rounded-full transition-colors',
						enabled && 'bg-primary',
						!enabled && 'bg-foreground/15'
					)}
				>
					<span className="sr-only">{t('form.SET_THEME')}</span>
					<span
						className={clsxm(
							'inline-block size-3 rounded-full bg-white transition-transform',
							enabled && 'translate-x-3',
							!enabled && 'translate-x-1'
						)}
					/>
				</Switch>
			</div>
			<div className="flex justify-center overflow-hidden rounded-lg">
				<ThemePreview
					variant={theme}
					className="w-[290px] max-w-full h-auto rounded-lg"
					style={
						currentTheme === 'light' && index === 0
							? { boxShadow: '5px 20px 26px rgba(0,0,0,0.18)' }
							: currentTheme === 'light' && index > 0
								? { boxShadow: '7px 20px 26px rgba(0,0,0,0.5)' }
								: {}
					}
				/>
			</div>
		</div>
	);
};

export default ThemesPopup;
