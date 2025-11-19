'use client';

import { IS_DEMO_MODE, DEMO_ACCOUNTS_CONFIG } from '@/core/constants/config/constants';
import { Button } from '@/core/components';
import { useTranslations } from 'next-intl';
import { cn } from '@/core/lib/helpers';
import { DottedLanguageObjectStringPaths } from 'next-intl';

interface DemoAccountsSectionProps {
	onDemoLogin: (email: string, password: string) => void;
	className?: string;
}

/**
 * DemoAccountsSection Component - Quick Access Buttons Only
 *
 * Displays 3 quick access buttons for demo accounts.
 * Design matches demo.gauzy.co - simple, clean, functional.
 *
 * @param onDemoLogin - Callback function to handle auto-login with email and password
 * @param className - Optional additional CSS classes
 */
export function DemoAccountsSection({ onDemoLogin, className }: DemoAccountsSectionProps) {
	const t = useTranslations();

	// Only render in demo mode
	if (!IS_DEMO_MODE) {
		return null;
	}

	return (
		<div
			className={cn(
				'p-6 w-full rounded-[16px]',
				'bg-gradient-to-br from-indigo-600 to-purple-700',
				'dark:from-indigo-700 dark:to-purple-800',
				'w-min shadow-lg min-w-36',
				className
			)}
		>
			{/* Header */}
			<div className="mb-6 text-left text-pretty">
				<h3 className="mb-2 text-lg font-semibold text-white">{t('pages.authLogin.DEMO_ACCOUNTS_TITLE')}</h3>
				<p className="text-sm text-indigo-100">{t('pages.authLogin.DEMO_ACCOUNTS_SUBTITLE')}</p>
			</div>

			{/* Quick Access Buttons */}
			<div className="flex flex-col gap-y-3">
				{DEMO_ACCOUNTS_CONFIG.map((account) => {
					const Icon = account.icon || null;
					return (
						<Button
							key={account.type}
							type="button"
							onClick={() => onDemoLogin(account.email, account.password)}
							className={cn(
								'flex gap-2 justify-start items-center text-left px-3 text-nowrap whitespace-nowrap w-full py-1.5',
								'bg-white hover:bg-gray-50',
								'font-medium text-indigo-700',
								'rounded-lg border-0',
								'transition-all duration-200',
								'text-xs shadow-sm hover:shadow-md dark:text-white'
							)}
						>
							<Icon className="w-4 h-4 fill-current" />
							<span>{t(`pages.authLogin.${account.translationKey}` as DottedLanguageObjectStringPaths)}</span>
						</Button>
					);
				})}
			</div>
		</div>
	);
}
