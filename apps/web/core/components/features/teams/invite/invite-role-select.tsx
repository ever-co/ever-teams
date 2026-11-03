'use client';

import type { ReactNode } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { ShieldUser, User, UserCheck } from '@/core/components/icons';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/core/components/common/select';
import { HueIconTile, type GlyphHue } from '@/core/components/common/value-glyphs';
import { ERoleName } from '@/core/types/generics/enums/role';

interface RoleLook {
	labelKey: DottedLanguageObjectStringPaths;
	hintKey: DottedLanguageObjectStringPaths;
	icon: ReactNode;
	hue: GlyphHue;
}

const ROLE_LOOKS: Partial<Record<string, RoleLook>> = {
	[ERoleName.EMPLOYEE]: {
		labelKey: 'modals.invite.roles.member',
		hintKey: 'modals.invite.roles.memberHint',
		icon: <User />,
		hue: 'info'
	},
	[ERoleName.MANAGER]: {
		labelKey: 'modals.invite.roles.manager',
		hintKey: 'modals.invite.roles.managerHint',
		icon: <UserCheck />,
		hue: 'success'
	},
	[ERoleName.ADMIN]: {
		labelKey: 'modals.invite.roles.admin',
		hintKey: 'modals.invite.roles.adminHint',
		icon: <ShieldUser />,
		hue: 'warning'
	}
};

interface InvitableRole {
	id: string;
	name: string;
}

function RoleOption({ role }: Readonly<{ role: InvitableRole }>) {
	const t = useTranslations();
	const look = ROLE_LOOKS[role.name];
	if (!look) {
		return <span className="text-[13px] capitalize">{role.name.toLowerCase()}</span>;
	}

	return (
		<span className="flex min-w-0 items-center gap-2.5">
			<HueIconTile hue={look.hue} className="size-7 rounded-[8px] [&_svg]:size-3.5">
				{look.icon}
			</HueIconTile>
			<span className="flex min-w-0 flex-col">
				<span className="text-[13px] font-medium text-foreground">{t(look.labelKey)}</span>
				<span className="text-xs leading-snug text-muted-foreground">{t(look.hintKey)}</span>
			</span>
		</span>
	);
}

function RoleValue({ role }: Readonly<{ role: InvitableRole }>) {
	const t = useTranslations();
	const look = ROLE_LOOKS[role.name];
	if (!look) {
		return <span className="capitalize text-muted-foreground">{role.name.toLowerCase()}</span>;
	}

	return <span className="text-muted-foreground">{t(look.labelKey)}</span>;
}

/**
 * The role of the people being invited, picked by admins for the whole batch: a compact trigger that fits inside
 * the address field's bar, a menu with what each role can do.
 */
export function InviteRoleSelect({
	roles,
	value,
	onChange,
	disabled
}: Readonly<{
	roles: InvitableRole[];
	value: string | undefined;
	onChange: (roleId: string) => void;
	disabled?: boolean;
}>) {
	const t = useTranslations();
	const selectedRole = roles.find((role) => role.id === value);

	return (
		<Select value={value} onValueChange={(roleId) => onChange(roleId)} disabled={disabled}>
			<SelectTrigger
				aria-label={t('modals.invite.ROLE')}
				className="h-7 w-auto min-w-0 gap-1 rounded-md border-0 bg-transparent px-2 text-xs shadow-none ring-0 hover:bg-foreground/5 dark:bg-transparent"
			>
				<SelectValue placeholder={t('modals.invite.ROLE')}>
					{selectedRole && <RoleValue role={selectedRole} />}
				</SelectValue>
			</SelectTrigger>
			<SelectContent align="end" className="z-[1001] max-h-72 w-80 overflow-y-auto p-1">
				<SelectGroup>
					{roles.map((role) => (
						<SelectItem
							key={role.id}
							value={role.id}
							textValue={role.name}
							className="cursor-pointer py-2 pl-2 pr-8 [&>span:first-child]:right-2 [&>span:first-child]:left-auto"
						>
							<RoleOption role={role} />
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
