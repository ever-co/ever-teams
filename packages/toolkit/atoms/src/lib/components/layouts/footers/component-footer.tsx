import { cn } from '@ever-teams/toolkit-ui';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useKitOptions } from '@components/teams-provider/kit-root';

function TeamsTimerFooter({ className }: { className?: string }): ReactElement | null {
	const { t } = useTranslation();
	const { branding } = useKitOptions();
	if (branding === false) {
		return null;
	}
	return (
		<div
			className={cn(
				'flex justify-center gap-[2px] items-center dark:text-white text-black text-[0.5rem] font-normal',
				className
			)}
		>
			<span>{t('FOOTER.powered_by')}</span>
			<a className="font-bold underline" href="https://ever.team/" target="_blank" rel="noopener noreferrer">
				{t('ORGANIZATION')} {t('TITLE')}
			</a>
		</div>
	);
}

export { TeamsTimerFooter };
