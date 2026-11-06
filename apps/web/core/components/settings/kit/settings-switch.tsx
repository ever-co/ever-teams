'use client';

import { ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';
import { SWITCH_THUMB_CLASS, SWITCH_TRACK_CLASS } from '@/core/components/pages/settings/switch-recipe';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { SettingsRow } from './settings-page';

type SettingsSwitchProps = {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	ariaLabel?: string;
	id?: string;
	disabled?: boolean;
	pending?: boolean;
	'data-testid'?: string;
	className?: string;
};

export function SettingsSwitch({
	checked,
	onCheckedChange,
	ariaLabel,
	id,
	disabled = false,
	pending = false,
	className,
	...rest
}: Readonly<SettingsSwitchProps>) {
	const isLocked = disabled || pending;

	const toggle = () => {
		if (isLocked) {
			return;
		}
		onCheckedChange(!checked);
	};

	return (
		<button
			type="button"
			role="switch"
			id={id}
			aria-checked={checked}
			aria-label={ariaLabel}
			aria-busy={pending || undefined}
			disabled={disabled}
			onClick={toggle}
			data-testid={rest['data-testid']}
			className={cn(SWITCH_TRACK_CLASS, pending && 'cursor-progress opacity-80', className)}
		>
			<span aria-hidden="true" className={SWITCH_THUMB_CLASS} />
		</button>
	);
}

type SwitchRowProps = {
	label: ReactNode;
	description?: ReactNode;
	leading?: ReactNode;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
	pending?: boolean;
	revealed?: ReactNode;
	id: string;
	'data-testid'?: string;
};

export function SwitchRow({
	label,
	description,
	leading,
	checked,
	onCheckedChange,
	disabled,
	pending,
	revealed,
	id,
	...rest
}: Readonly<SwitchRowProps>) {
	const showsRevealed = checked && Boolean(revealed);

	return (
		<div>
			<SettingsRow label={label} description={description} leading={leading} htmlFor={id}>
				<SettingsSwitch
					id={id}
					checked={checked}
					onCheckedChange={onCheckedChange}
					disabled={disabled}
					pending={pending}
					data-testid={rest['data-testid']}
				/>
			</SettingsRow>
			{revealed && (
				<AnimatedHeight>{showsRevealed && <div className="px-4 pb-4">{revealed}</div>}</AnimatedHeight>
			)}
		</div>
	);
}
