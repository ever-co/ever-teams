'use client';

import { IS_DEMO_MODE, DEMO_ACCOUNTS_CONFIG } from '@/core/constants/config/constants';
import { Button } from '@/core/components/common/button';
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
				'p-5 rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5',
				'w-min min-w-36',
				className
			)}
		>
			{/* Header */}
			<div className="mb-4 text-left text-pretty">
				<h3 className="mb-1 text-base font-semibold text-balance text-foreground">
					{t('pages.authLogin.DEMO_ACCOUNTS_TITLE')}
				</h3>
				<p className="text-sm text-muted-foreground">{t('pages.authLogin.DEMO_ACCOUNTS_SUBTITLE')}</p>
			</div>

			{/* Quick Access Buttons */}
			<div className="flex flex-col gap-y-2">
				{DEMO_ACCOUNTS_CONFIG.map((account) => {
					const Icon = account.icon || null;
					return (
						<Button
							key={account.type}
							type="button"
							variant="outline"
							size="default"
							onClick={() => onDemoLogin(account.email, account.password)}
							className="justify-start w-full text-left"
						>
							<Icon className="size-4 fill-current" />
							<span>
								{t(`pages.authLogin.${account.translationKey}` as DottedLanguageObjectStringPaths)}
							</span>
						</Button>
					);
				})}
			</div>
		</div>
	);
}
