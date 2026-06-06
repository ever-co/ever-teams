'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@ever-teams/toolkit-ui';
import {
	Settings,
	AlertCircle,
	LogOut,
	UserPlus,
	Lock,
	UserCog,
	UserMinus,
	Mail,
	CheckCircle,
	type LucideIcon
} from 'lucide-react';
import { ActivityType } from '@/lib/db/schema';
import { useTranslations } from 'next-intl';
import { ReactElement } from 'react';

type TranslationFunction = ReturnType<typeof useTranslations>;

interface ActivityLog {
	id: number;
	action: string;
	timestamp: Date;
	ipAddress: string | null;
	userName: string | null;
}

interface ActivityLogsListProps {
	logs: ActivityLog[];
}

const iconMap: Record<ActivityType, LucideIcon> = {
	[ActivityType.SIGN_UP]: UserPlus,
	[ActivityType.SIGN_IN]: UserCog,
	[ActivityType.SIGN_OUT]: LogOut,
	[ActivityType.UPDATE_PASSWORD]: Lock,
	[ActivityType.DELETE_ACCOUNT]: UserMinus,
	[ActivityType.UPDATE_ACCOUNT]: Settings,
	[ActivityType.CREATE_TEAM]: UserPlus,
	[ActivityType.REMOVE_TEAM_MEMBER]: UserMinus,
	[ActivityType.INVITE_TEAM_MEMBER]: Mail,
	[ActivityType.ACCEPT_INVITATION]: CheckCircle
};

function formatAction(action: ActivityType, t: TranslationFunction): string {
	switch (action) {
		case ActivityType.SIGN_UP:
			return t('actions.sign_up');
		case ActivityType.SIGN_IN:
			return t('actions.sign_in');
		case ActivityType.SIGN_OUT:
			return t('actions.sign_out');
		case ActivityType.UPDATE_PASSWORD:
			return t('actions.update_password');
		case ActivityType.DELETE_ACCOUNT:
			return t('actions.delete_account');
		case ActivityType.UPDATE_ACCOUNT:
			return t('actions.update_account');
		case ActivityType.CREATE_TEAM:
			return t('actions.create_team');
		case ActivityType.REMOVE_TEAM_MEMBER:
			return t('actions.remove_team_member');
		case ActivityType.INVITE_TEAM_MEMBER:
			return t('actions.invite_team_member');
		case ActivityType.ACCEPT_INVITATION:
			return t('actions.accept_invitation');
		default:
			return t('actions.unknown');
	}
}

function getRelativeTime(date: Date, t: TranslationFunction): string {
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) return 'just now';
	if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
	if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
	if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
	return date.toLocaleDateString();
}

export function ActivityLogsList({ logs }: ActivityLogsListProps): ReactElement {
	const t = useTranslations('Dashboard.ActivityPage');

	return (
		<Card className="shadow-none border dark:border-gray-700 dark:bg-zinc-950">
			<CardHeader>
				<CardTitle>{t('title')}</CardTitle>
			</CardHeader>
			<CardContent>
				{logs.length > 0 ? (
					<ul className="space-y-4">
						{logs.map((log) => {
							const Icon = iconMap[log.action as ActivityType] || Settings;
							const formattedAction = formatAction(log.action as ActivityType, t);

							return (
								<li key={log.id} className="flex items-center space-x-4">
									<div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2">
										<Icon className="w-5 h-5 text-blue-800 dark:text-white" />
									</div>
									<div className="flex-1">
										<p className="text-sm font-medium text-gray-900 dark:text-white">
											{formattedAction}
											{log.ipAddress && t('from_ip') + log.ipAddress}
										</p>
										<p className="text-xs text-gray-500 dark:text-gray-400">
											{getRelativeTime(log.timestamp, t)}
										</p>
									</div>
								</li>
							);
						})}
					</ul>
				) : (
					<div className="flex flex-col items-center justify-center text-center py-12">
						<AlertCircle className="h-12 w-12 text-blue-500 mb-4" />
						<h3 className="text-lg font-semibold text-gray-900 mb-2">{t('empty_state.title')}</h3>
						<p className="text-sm text-gray-500 max-w-sm">{t('empty_state.description')}</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
