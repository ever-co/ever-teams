import { cn } from '@/core/lib/helpers';
import { useState, PropsWithChildren } from 'react';
import { Tooltip } from '../duplicated-components/tooltip';

type Props = {
	text: string;
	className?: string;
	copiedTooltipText?: string;
	defaultTooltipText?: string;
};

export function CopyTooltip(props: PropsWithChildren<Props>) {
	const { copiedTooltipText = 'Copied', defaultTooltipText = 'Copy' } = props;
	const [copied, setCopied] = useState(false);

	const copyTitle = () => {
		navigator.clipboard.writeText(props.text);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<Tooltip label={copied ? copiedTooltipText : defaultTooltipText} enabled>
			<div className={cn('copy-tooltip', props.className)} onClick={copyTitle}>
				{props.children}
			</div>
		</Tooltip>
	);
}
