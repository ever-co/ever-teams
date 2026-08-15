import { Card, CardContent, CardHeader, CardTitle } from '@ever-teams/toolkit-ui';
import { JSX } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Brain, Users, BarChart3, Shield, Activity } from 'lucide-react';

export function FeaturesGridSection(): JSX.Element {
	const t = useTranslations('FeaturesGrid');

	const additionalFeatures = [
		{
			title: t('automatic_tracking.title'),
			description: t('automatic_tracking.description'),
			icon: Clock,
			gradient: 'from-blue-500 to-cyan-500'
		},
		{
			title: t('activity_monitoring.title'),
			description: t('activity_monitoring.description'),
			icon: Activity,
			gradient: 'from-green-500 to-emerald-500'
		},

		{
			title: t('ai_insights.title'),
			description: t('ai_insights.description'),
			icon: Brain,
			gradient: 'from-purple-500 to-pink-500'
		},
		{
			title: t('team_dashboard.title'),
			description: t('team_dashboard.description'),
			icon: Users,
			gradient: 'from-orange-500 to-red-500'
		},
		{
			title: t('enterprise_security.title'),
			description: t('enterprise_security.description'),
			icon: Shield,
			gradient: 'from-indigo-500 to-purple-500'
		},
		{
			title: t('advanced_reports.title'),
			description: t('advanced_reports.description'),
			icon: BarChart3,
			gradient: 'from-indigo-500 to-green-500'
		}
	];

	return (
		<section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 bg-white/30 dark:bg-slate-900/30 backdrop-blur-lg">
			{/* Background decoration */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-green-400/10 to-emerald-400/10 rounded-full blur-3xl"></div>
				<div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
			</div>

			<div className="max-w-7xl mx-auto relative">
				<div className="text-center mb-20">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700 mb-8">
						<div className="w-2 h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse"></div>
						<span className="text-sm font-medium text-green-700 dark:text-green-300">{t('badge')}</span>
					</div>
					<h2 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 dark:from-white dark:to-blue-200 bg-clip-text text-transparent mb-6">
						{t('title')}
					</h2>
					<p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
						{t('subtitle')}
					</p>
				</div>

				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
					{additionalFeatures.map((feature, index) => (
						<Card
							key={index}
							className="group bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-0 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105 relative overflow-hidden"
						>
							{/* Gradient border effect */}
							<div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
							<div className="relative z-10">
								<CardHeader className="pb-4">
									<div
										className={`w-12 h-12 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
									>
										<feature.icon className="w-6 h-6 text-white" />
									</div>
									<CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors">
										{feature.title}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-slate-600 dark:text-slate-400 leading-relaxed">
										{feature.description}
									</p>
								</CardContent>
							</div>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
