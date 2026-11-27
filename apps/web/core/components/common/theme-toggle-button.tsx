'use client';

import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { Moon, Sun } from '@/core/components/icons';
import { buttonVariants } from '@/core/components/duplicated-components/_button';
import { useHasMounted } from '@/core/hooks/common/use-has-mounted';
import { cn } from '@/core/lib/helpers';

/**
 * The theme control of the top bar (spec A4 of the shared Ever shell): one icon button that switches light and dark,
 * never three icons in a row. It shows the theme it switches to. "System" stays in Settings › Preferences, with its
 * three picture tiles; a click here picks light or dark explicitly. The resolved theme is only known in the browser,
 * so the button keeps its size and stays blank until then.
 */
export function ThemeToggleButton({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	const { mounted } = useHasMounted();
	const { resolvedTheme, setTheme } = useTheme();
	const isDark = resolvedTheme === 'dark';
	const nextTheme = isDark ? 'light' : 'dark';
	const label = isDark ? t('common.SWITCH_TO_LIGHT_THEME') : t('common.SWITCH_TO_DARK_THEME');
	const buttonClassName = cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'text-muted-foreground', className);

	if (!mounted) {
		return <span aria-hidden="true" className={buttonClassName} />;
	}

	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			onClick={() => setTheme(nextTheme)}
			className={buttonClassName}
		>
			{isDark && <Sun className="size-4" aria-hidden="true" />}
			{!isDark && <Moon className="size-4" aria-hidden="true" />}
		</button>
	);
}
