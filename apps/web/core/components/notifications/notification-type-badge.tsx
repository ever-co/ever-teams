import type { ReactNode } from 'react';
import {
	AtSign,
	Comment,
	DollarCircle,
	Mail,
	Megaphone,
	MessageCircle,
	Notification,
	Timer,
	UserAdd,
	Wallet
} from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { EEmployeeNotificationType } from '@/core/types/interfaces/common/employee-notification';

interface TypeLook {
	glyph: ReactNode;
	hue: string;
}

const TYPE_LOOK: Record<EEmployeeNotificationType, TypeLook> = {
	[EEmployeeNotificationType.Assignment]: { glyph: <UserAdd />, hue: '[--chip:hsl(var(--primary))]' },
	[EEmployeeNotificationType.Mention]: { glyph: <AtSign />, hue: '[--chip:hsl(var(--info))]' },
	[EEmployeeNotificationType.Comment]: { glyph: <Comment />, hue: '[--chip:hsl(var(--success))]' },
	[EEmployeeNotificationType.Invitation]: { glyph: <Mail />, hue: '[--chip:hsl(var(--warning))]' },
	[EEmployeeNotificationType.Message]: { glyph: <MessageCircle />, hue: '[--chip:hsl(var(--info))]' },
	[EEmployeeNotificationType.Broadcast]: { glyph: <Megaphone />, hue: '[--chip:hsl(var(--muted-foreground))]' },
	[EEmployeeNotificationType.Payment]: { glyph: <Wallet />, hue: '[--chip:hsl(var(--success))]' },
	[EEmployeeNotificationType.RateChangeRequest]: { glyph: <DollarCircle />, hue: '[--chip:hsl(var(--warning))]' },
	[EEmployeeNotificationType.TimerReminder]: { glyph: <Timer />, hue: '[--chip:hsl(var(--warning))]' }
};

const UNKNOWN_LOOK: TypeLook = { glyph: <Notification />, hue: '[--chip:hsl(var(--muted-foreground))]' };

function lookOf(type: EEmployeeNotificationType | null): TypeLook {
	if (!type) {
		return UNKNOWN_LOOK;
	}

	return TYPE_LOOK[type];
}

const SIZE_CLASS = {
	sm: 'size-4 [&_svg]:size-2.5',
	md: 'size-6 [&_svg]:size-3.5'
} as const;

/**
 * What kind of event a notification is, as a small round 3D plate in the type's hue (Linear's +, check and @ on the
 * sender's avatar). The same plate leads the type's row in the notification settings.
 */
export function NotificationTypeBadge({
	type,
	size = 'sm',
	className
}: Readonly<{ type: EEmployeeNotificationType | null; size?: keyof typeof SIZE_CLASS; className?: string }>) {
	const look = lookOf(type);

	return (
		<span
			aria-hidden="true"
			className={cn(
				'chip-3d inline-flex shrink-0 items-center justify-center rounded-full [&_svg]:stroke-[2.25]',
				SIZE_CLASS[size],
				look.hue,
				className
			)}
		>
			{look.glyph}
		</span>
	);
}
