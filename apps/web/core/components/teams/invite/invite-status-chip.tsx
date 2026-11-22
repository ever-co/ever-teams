import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { InviteStatusDisplayMap } from '@/core/constants/config/constants';
import { EInviteStatus } from '@/core/types/generics/enums/invite';

const CHIP = 'chip-3d inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] font-medium';

/** An invitation's status in the page's language, in the status's own color (#5688). */
export function InviteStatusChip({ status }: Readonly<{ status: EInviteStatus }>) {
	const t = useTranslations();
	const { foreground, labelKey } = InviteStatusDisplayMap[status];
	const chipStyle = { '--chip': foreground } as CSSProperties;

	return (
		<span style={chipStyle} className={CHIP}>
			{t(labelKey)}
		</span>
	);
}
