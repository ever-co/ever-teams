import { Button } from '@ever-teams/toolkit-ui';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { JSX } from 'react';
import { useTranslations } from 'next-intl';

export function CTASection(): JSX.Element {
	const t = useTranslations('CTA');

	return (
		<section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
			{/* Background decoration */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
			</div>

			<div className="max-w-5xl mx-auto text-center relative">
				<div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 sm:p-12 shadow-2xl hover:shadow-3xl transition-all duration-500 relative overflow-hidden">
					{/* Background pattern */}
					<div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
					<div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
					<div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>

					<div className="relative z-10">
						<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">{t('title')}</h2>
						<p className="text-lg sm:text-xl text-blue-100 mb-8  mx-auto leading-relaxed">
							{t('subtitle')}
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Button
								size="lg"
								className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-300 text-lg px-8 py-4 group hover:scale-105 dark:text-blue-600"
							>
								<Link className="flex justify-center items-center" href={'/sign-in'}>
									{t('get_started')}
									<ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
								</Link>
							</Button>
							<Button
								variant="outline"
								size="lg"
								className="border-2 border-white bg-white/10 hover:bg-white/20 text-lg text-white px-8 py-4 backdrop-blur-sm hover:scale-105 transition-all duration-300"
							>
								{t('contact_sales')}
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
