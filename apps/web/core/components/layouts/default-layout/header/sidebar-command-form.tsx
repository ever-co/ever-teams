import type React from 'react';

import { useTranslations } from 'next-intl';
import { Label } from '@/core/components/common/label';
import { SidebarGroup, SidebarGroupContent, SidebarInput } from '@/core/components/common/sidebar';
import { CommandIcon } from '../../../icons';

export function SidebarCommandForm({ ...props }: React.ComponentProps<'form'>) {
	const t = useTranslations();
	return (
		<>
			<form {...props}>
				<SidebarGroup className="py-0 mt-2">
					<SidebarGroupContent className="relative inline-flex">
						<Label htmlFor="command" className="sr-only">
							{t('sidebar.COMMAND')}
						</Label>
						<SidebarInput
							id="command"
							placeholder={t('placeholders.ENTER_A_COMMAND')}
							className="h-fit w-fit min-w-32 max-w-[98.5%] py-1.5 ps-9 pe-9 text-sm"
							aria-label={t('sidebar.COMMAND')}
						/>

						<div className="pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 text-muted-foreground peer-disabled:opacity-50">
							<CommandIcon className="absolute -translate-y-1/2 opacity-50 pointer-events-none select-none left-2 top-1/2 size-4" />
						</div>
						<div className="absolute inset-y-0 flex items-center justify-center pointer-events-none end-1 pe-2 text-muted-foreground">
							<kbd className="inline-flex size-6 max-h-full items-center justify-center rounded-sm bg-foreground/5 p-1 text-center font-[inherit] text-xs font-medium text-muted-foreground">
								⌘K
							</kbd>
						</div>
					</SidebarGroupContent>
				</SidebarGroup>
			</form>
		</>
	);
}
