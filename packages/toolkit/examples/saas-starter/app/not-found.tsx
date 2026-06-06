'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@ever-teams/toolkit-ui';
import { ArrowLeft } from 'lucide-react';
import { ReactElement } from 'react';

export default function NotFound(): ReactElement {
	const t = useTranslations('NotFound');

	return (
		<div className="flex items-center justify-center min-h-[100dvh] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
			<div className="max-w-md space-y-8 p-8 text-center">
				{/* 404 Number */}
				<div className="text-8xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
					404
				</div>

				{/* Title */}
				<h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('title')}</h1>

				{/* Description */}
				<p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">{t('description')}</p>

				{/* Action Button */}
				<div className="pt-4">
					<Button
						asChild
						size="lg"
						className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
					>
						<Link href="/" className="flex items-center gap-2">
							<ArrowLeft size={16} />
							{t('back_to_home')}
						</Link>
					</Button>
				</div>

				{/* Decorative Elements */}
				<div className="absolute inset-0 -z-10 overflow-hidden">
					<div className="absolute -top-40 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl"></div>
					<div className="absolute -bottom-40 -left-32 w-80 h-80 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 blur-3xl"></div>
				</div>
			</div>
		</div>
	);
}
