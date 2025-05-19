import type React from 'react';

import { Label } from '@/core/components/common/label';
import { SidebarGroup, SidebarGroupContent, SidebarInput } from '@/core/components/common/sidebar';
import { CommandIcon } from '../../../icons';

export function SidebarCommandForm({ ...props }: React.ComponentProps<'form'>) {
	return (
		<>
			<form {...props}>
				<SidebarGroup className="py-0 mt-2">
					<SidebarGroupContent className="relative inline-flex">
						<Label htmlFor="command" className="sr-only">
							Command
						</Label>
						<SidebarInput
							id="command"
							placeholder="Enter a command..."
							className="pl-8 file:text-foreground placeholder:text-gray-500 dark:placeholder:text-muted-foreground/70 flex rounded-md border px-3 py-1.5 text-sm shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive h-fit ps-9 pe-9  w-fit min-w-32 max-w-[98.5%] bg-[#eaeef4] dark:bg-dark--theme-light border-gray-200 dark:border-gray-700"
							aria-label="Command"
						/>

						<div className="absolute inset-y-0 flex items-center justify-center text-gray-500 pointer-events-none start-0 ps-2 dark:text-muted-foreground/70 peer-disabled:opacity-50">
							<CommandIcon className="absolute -translate-y-1/2 opacity-50 pointer-events-none select-none left-2 top-1/2 size-4" />
						</div>
						<div className="absolute inset-y-0 flex items-center justify-center pointer-events-none end-1 pe-2 text-muted-foreground">
							<kbd className="inline-flex text-center size-6 max-h-full items-center justify-center rounded bg-background shadow-xs p-1 font-[inherit] font-medium text-xs text-muted-foreground/70">
								⌘K
							</kbd>
						</div>
					</SidebarGroupContent>
				</SidebarGroup>
			</form>
		</>
	);
}
