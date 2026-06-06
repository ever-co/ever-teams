'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { JSX } from 'react';
import { useTranslations } from 'next-intl';

export function FAQSection(): JSX.Element {
	const [openFaq, setOpenFaq] = useState<number | null>(null);
	const t = useTranslations('FAQ');

	const faqs = [
		{
			question: t('question_1'),
			answer: t('answer_1')
		},
		{
			question: t('question_2'),
			answer: t('answer_2')
		},
		{
			question: t('question_3'),
			answer: t('answer_3')
		},
		{
			question: t('question_4'),
			answer: t('answer_4')
		}
	];

	return (
		<section id="faq" className="relative z-10 py-20 px-4">
			{/* Background decoration */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				<div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
				<div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-gradient-to-r from-amber-400/10 to-orange-400/10 rounded-full blur-3xl"></div>
			</div>

			<div className="max-w-4xl mx-auto relative">
				<div className="text-center mb-20">
					<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-700 mb-8">
						<div className="w-2 h-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-pulse"></div>
						<span className="text-sm font-medium text-amber-700 dark:text-amber-300">{t('badge')}</span>
					</div>
					<h2 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-slate-900 via-amber-900 to-orange-900 dark:from-white dark:via-amber-200 dark:to-orange-200 bg-clip-text text-transparent mb-6">
						{t('heading')}
					</h2>
					<p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">{t('description')}</p>
				</div>

				<div className="space-y-4">
					{faqs.map((faq, index) => (
						<div
							key={index}
							className="group relative transition-all duration-300 hover:bg-slate-50/50 rounded-lg  dark:hover:bg-slate-800/30"
						>
							<div
								className="cursor-pointer py-2 px-2 transition-all duration-300 hover:px-4 "
								onClick={() => setOpenFaq(openFaq === index ? null : index)}
								role="button"
								tabIndex={0}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										setOpenFaq(openFaq === index ? null : index);
									}
								}}
								aria-expanded={openFaq === index}
								aria-controls={`faq-content-${index}`}
							>
								<div className="flex justify-between items-center">
									<h3
										className={`text-lg md:text-xl font-bold transition-colors duration-300 ${
											openFaq === index
												? 'text-blue-900 dark:text-blue-100'
												: 'text-slate-900 dark:text-slate-100 group-hover:text-blue-900 dark:group-hover:text-blue-100'
										}`}
									>
										{faq.question}
									</h3>
									<div
										className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
											openFaq === index
												? 'bg-gradient-to-r from-blue-500 to-purple-500'
												: 'bg-slate-100 dark:bg-slate-800 group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:to-purple-500'
										}`}
									>
										<ChevronDown
											className={`w-5 h-5 transition-all duration-300 ${
												openFaq === index
													? 'rotate-180 text-white'
													: 'text-slate-600 dark:text-slate-400 group-hover:text-white'
											}`}
										/>
									</div>
								</div>
							</div>

							<div
								id={`faq-content-${index}`}
								className={`overflow-hidden transition-all duration-500 ease-out ${
									openFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
								}`}
							>
								<div
									className={`px-2 pb-6 transform transition-all duration-500 ${
										openFaq === index ? 'translate-y-0' : '-translate-y-4'
									}`}
								>
									<div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-700 to-transparent mb-3"></div>
									<p className="text-slate-700 dark:text-slate-300 leading-relaxed text-base pl-2">
										{faq.answer}
									</p>
								</div>
							</div>

							{/* Bottom border for separation */}
							<div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200/50 dark:via-slate-700/50 to-transparent"></div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
