'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import type { MeetingDeviceKind } from '@/core/hooks/meetings/use-media-preview';
import { cn } from '@/core/lib/helpers';

const DEFAULT_DEVICE = 'default';
const LEVEL_STEPS = 10;
export function LevelMeter({ level, label }: Readonly<{ level: number; label: string }>) {
	const litSteps = Math.round(level * LEVEL_STEPS);
	return (
		<div
			role="meter"
			aria-label={label}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(level * 100)}
			className="flex h-4 items-end gap-0.5"
		>
			{Array.from({ length: LEVEL_STEPS }, (_, step) => (
				<span
					key={step}
					className={cn('w-1 rounded-full transition-colors', step < litSteps ? 'bg-primary' : 'bg-white/30')}
					style={{ height: `${40 + step * 6}%` }}
				/>
			))}
		</div>
	);
}

export function DeviceField({
	label,
	icon,
	kind,
	value,
	devices,
	onChange
}: Readonly<{
	label: string;
	icon: ReactNode;
	kind: MeetingDeviceKind;
	value: string;
	devices: MediaDeviceInfo[];
	onChange: (kind: MeetingDeviceKind, deviceId: string) => void;
}>) {
	const t = useTranslations();
	const selected = value && devices.some((device) => device.deviceId === value) ? value : DEFAULT_DEVICE;
	const pick = (next: string | null) => onChange(kind, !next || next === DEFAULT_DEVICE ? '' : next);

	return (
		<div className="flex min-w-0 flex-col gap-1.5">
			<span className="text-xs font-medium text-muted-foreground">{label}</span>
			<Select value={selected} onValueChange={pick}>
				<SelectTrigger aria-label={label} className="h-9 w-full min-w-0">
					<span className="flex min-w-0 items-center gap-2">
						<span className="shrink-0 text-muted-foreground" aria-hidden="true">
							{icon}
						</span>
						<SelectValue className="truncate" />
					</span>
				</SelectTrigger>
				<SelectContent position="popper" sideOffset={4}>
					<SelectItem value={DEFAULT_DEVICE}>{t('meetings.DEVICE_DEFAULT')}</SelectItem>
					{devices.map((device, index) => (
						<SelectItem key={device.deviceId} value={device.deviceId}>
							{device.label || `${label} ${index + 1}`}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
