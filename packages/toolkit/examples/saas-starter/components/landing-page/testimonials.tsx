import { Card, CardContent } from '@ever-teams/toolkit-ui';
import { Star } from 'lucide-react';
import { testimonials } from './data';
import { JSX } from 'react';
import { useTranslations } from 'next-intl';

export function TestimonialsSection(): JSX.Element {
	const t = useTranslations('Testimonials');

	const testimonialKeys = ['sarah_chen', 'marcus_rodriguez', 'emily_watson'];

	return (
		<section id="testimonials" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
			{/* Background decoration */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-amber-400/10 to-yellow-400/10 rounded-full blur-3xl"></div>
				<div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-r from-orange-400/10 to-red-400/10 rounded-full blur-3xl"></div>
			</div>

			<div className="max-w-7xl mx-auto relative">
				<div className="text-center mb-20">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 border border-amber-200 dark:border-amber-700 mb-8">
						<div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full animate-pulse"></div>
						<span className="text-sm font-medium text-amber-700 dark:text-amber-300">{t('badge')}</span>
					</div>
					<h2 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-slate-900 to-amber-900 dark:from-white dark:to-amber-200 bg-clip-text text-transparent mb-6">
						{t('title')}
					</h2>
					<p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
						{t('subtitle')}
					</p>
				</div>

				<div className="grid md:grid-cols-3 gap-8">
					{testimonials.map((testimonial, index) => {
						const testimonialKey = testimonialKeys[index];

						return (
							<Card
								key={testimonialKey}
								className="group bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-0 shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105 relative overflow-hidden"
							>
								{/* Gradient border effect */}
								<div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
								<div className="relative z-10">
									<CardContent className="p-8">
										<div className="flex mb-6">
											{[...Array(testimonial.rating)].map((_, i) => (
												<Star
													key={i}
													className="w-5 h-5 text-yellow-400 fill-current group-hover:scale-110 transition-transform duration-300"
													style={{ animationDelay: `${i * 100}ms` }}
												/>
											))}
										</div>
										<p className="text-slate-700 dark:text-slate-300 mb-6 italic text-lg leading-relaxed">
											"{t(`${testimonialKey}.content`)}"
										</p>
										<div className="flex items-center">
											<div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
												<span className="text-white font-bold text-lg">
													{t(`${testimonialKey}.name`)
														.split(' ')
														.map((n: string) => n[0])
														.join('')}
												</span>
											</div>
											<div>
												<p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors">
													{t(`${testimonialKey}.name`)}
												</p>
												<p className="text-sm text-slate-600 dark:text-slate-400">
													{t(`${testimonialKey}.role`)}
												</p>
											</div>
										</div>
									</CardContent>
								</div>
							</Card>
						);
					})}
				</div>
			</div>
		</section>
	);
}
