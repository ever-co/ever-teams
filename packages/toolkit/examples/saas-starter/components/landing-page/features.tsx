import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ever-teams/toolkit-ui';
import { Check } from 'lucide-react';
import { features } from './data';
import { JSX } from 'react';
import { useTranslations } from 'next-intl';

export function FeaturesSection(): JSX.Element {
	const t = useTranslations('Features');
	const featureKeys = ['smart_time_tracking', 'ai_powered_insights', 'team_management', 'advanced_reports'];

	return (
		<section id="features" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
			{/* Background decoration */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-1/4 right-1/4 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl"></div>
				<div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
			</div>

			<div className="max-w-7xl mx-auto relative">
				<div className="text-center mb-20">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border border-blue-200 dark:border-blue-700 mb-8">
						<div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"></div>
						<span className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('badge')}</span>
					</div>
					<h2 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-900 to-blue-900 dark:from-white dark:to-blue-200 bg-clip-text text-transparent mb-6">
						{t('title')}
					</h2>
					<p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
						{t('subtitle')}
					</p>
				</div>

				<div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
					<div className="grid md:grid-cols-2 gap-6">
						{features.map((feature, index) => {
							if (index >= featureKeys.length) return null;
							const featureKey = featureKeys[index];

							return (
								<Card
									key={featureKey}
									className="group hover:scale-105 transition-all duration-500 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-0 shadow-lg hover:shadow-xl relative overflow-hidden"
								>
									{/* Gradient border effect */}
									<div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
									<div className="relative z-10">
										<CardHeader className="pb-4">
											<div
												className={`w-14 h-14 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
											>
												<feature.icon className="w-7 h-7 text-white" />
											</div>
											<CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors">
												{t(`${featureKey}.title`)}
											</CardTitle>
										</CardHeader>
										<CardContent>
											<CardDescription className="text-slate-600 dark:text-slate-400 leading-relaxed">
												{t(`${featureKey}.description`)}
											</CardDescription>
										</CardContent>
									</div>
								</Card>
							);
						})}
					</div>
					<div className="relative">
						<div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl p-8 text-white shadow-2xl hover:shadow-3xl transition-all duration-500 relative overflow-hidden">
							{/* Background pattern */}
							<div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
							<div className="relative z-10">
								<h3 className="text-2xl sm:text-3xl font-bold mb-6">{t('why_choose_title')}</h3>
								<ul className="space-y-4">
									<li className="flex items-center space-x-3 group">
										<div className="flex-shrink-0 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
											<Check className="w-4 h-4 text-white" />
										</div>
										<span className="text-lg">{t('accurate_tracking')}</span>
									</li>
									<li className="flex items-center space-x-3 group">
										<div className="flex-shrink-0 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
											<Check className="w-4 h-4 text-white" />
										</div>
										<span className="text-lg">{t('real_time_sync')}</span>
									</li>
									<li className="flex items-center space-x-3 group">
										<div className="flex-shrink-0 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
											<Check className="w-4 h-4 text-white" />
										</div>
										<span className="text-lg">{t('ai_insights')}</span>
									</li>
									<li className="flex items-center space-x-3 group">
										<div className="flex-shrink-0 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
											<Check className="w-4 h-4 text-white" />
										</div>
										<span className="text-lg">{t('enterprise_security')}</span>
									</li>
									<li className="flex items-center space-x-3 group">
										<div className="flex-shrink-0 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center">
											<Check className="w-4 h-4 text-white" />
										</div>
										<span className="text-lg">{t('easy_integration')}</span>
									</li>
								</ul>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
