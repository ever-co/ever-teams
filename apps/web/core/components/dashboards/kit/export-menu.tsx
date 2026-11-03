'use client';

import { type ReactNode, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Button } from '@/core/components/duplicated-components/_button';
import { ChevronDown, Download } from '@/core/components/icons';
import { Spinner } from '@/core/components/common/spinner';

export interface ExportOption {
	key: string;
	label: string;
	icon?: ReactNode;
	/** Builds and downloads the file; heavy libraries are imported inside, on the click. */
	run: () => Promise<void> | void;
}

/**
 * One Export button per report, beside the period. Nothing about a format is loaded before it is picked: each option
 * imports its library and builds the file when chosen, while the button shows that it is working.
 */
export function ExportMenu({
	options,
	isDisabled = false
}: Readonly<{ options: ReadonlyArray<ExportOption>; isDisabled?: boolean }>) {
	const t = useTranslations();
	const [runningKey, setRunningKey] = useState<string | null>(null);
	const isRunning = runningKey !== null;

	const runOption = async (option: ExportOption) => {
		setRunningKey(option.key);
		try {
			await option.run();
		} catch (error) {
			console.error(error);
			toast.error(t('dashboard.export.FAILED'));
		} finally {
			setRunningKey(null);
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button type="button" variant="outline" size="default" disabled={isDisabled || isRunning}>
					{isRunning && <Spinner className="size-4" />}
					{!isRunning && <Download />}
					<span>{t('common.EXPORT')}</span>
					<ChevronDown className="text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-44">
				{options.map((option) => (
					<DropdownMenuItem key={option.key} onClick={() => void runOption(option)}>
						{option.icon}
						<span>{option.label}</span>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
