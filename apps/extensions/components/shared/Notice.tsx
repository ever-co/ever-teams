import classNames from 'classnames';
import React, { type FC, type ReactNode } from 'react';

import { inheritTextSize } from '~misc/tailwindClasses';

interface NoticeProps {
	tone: 'error' | 'info';
	children: ReactNode;
	action?: { label: string; onClick: () => void };
}

/** An error is announced at once; an information waits for the reader. */
function roleOf(isError: boolean): 'alert' | 'status' {
	if (isError) {
		return 'alert';
	}
	return 'status';
}

/** A short message under the control it is about, with an optional action such as "Try again". */
export const Notice: FC<NoticeProps> = ({ tone, children, action }) => {
	const isError = tone === 'error';

	return (
		<div
			role={roleOf(isError)}
			className={classNames('flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-xs ring-1', {
				'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300': isError,
				'bg-zinc-900/5 text-zinc-600 ring-zinc-900/10 dark:bg-white/5 dark:text-zinc-300 dark:ring-white/10': !isError
			})}>
			<span className={classNames('leading-snug', inheritTextSize)}>{children}</span>
			{action && (
				<button
					type="button"
					onClick={action.onClick}
					className="shrink-0 font-medium underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded">
					{action.label}
				</button>
			)}
		</div>
	);
};

export default Notice;
