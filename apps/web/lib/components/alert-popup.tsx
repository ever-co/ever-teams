import React from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@components/ui/popover';

interface IConfirmPopup {
	buttonOpen: any;
	open: boolean;
}
/**
 *
 *
 * @export
 * @param {React.PropsWithChildren<IConfirmPopup>} { children, buttonOpen, open }
 * @return {*}
 */
export function AlertPopup({ children, buttonOpen, open }: React.PropsWithChildren<IConfirmPopup>) {
	return (
		<Popover open={open}>
			<PopoverTrigger>{buttonOpen}</PopoverTrigger>
			<PopoverContent className="min-w-max bg-light--theme-light dark:bg-dark--theme-light outline-none dark:border-gray-600">
				<div className="p-4 space-y-4">
					<div>
						<h4 className="text-lg font-semibold">Delete this plan</h4>
						<p className="text-sm text-gray-600">Are you sure you want to delete this plan?</p>
					</div>
					<div className="flex space-x-4">{children}</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
