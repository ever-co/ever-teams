'use client';

import HomeLayout from '@/components/layout/home-layout';
import { JSX } from 'react';
import {
	BackgroundElements,
	HeroSection,
	FeaturesSection,
	TestimonialsSection,
	PricingSection,
	FeaturesGridSection,
	FAQSection,
	CTASection
} from '@/components/landing-page';

export default function HomePage(): JSX.Element {
	return (
		<HomeLayout>
			<div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
				<BackgroundElements />
				<HeroSection />
				<FeaturesSection />
				<TestimonialsSection />
				<PricingSection />
				<FeaturesGridSection />
				<FAQSection />
				<CTASection />
			</div>

			<style jsx>{`
				@keyframes blob {
					0% {
						transform: translate(0px, 0px) scale(1);
					}
					33% {
						transform: translate(30px, -50px) scale(1.1);
					}
					66% {
						transform: translate(-20px, 20px) scale(0.9);
					}
					100% {
						transform: translate(0px, 0px) scale(1);
					}
				}
				@keyframes fadeIn {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}
				@keyframes fadeInUp {
					from {
						opacity: 0;
						transform: translateY(30px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
				.animate-blob {
					animation: blob 7s infinite;
				}
				.animate-fade-in {
					animation: fadeIn 1s ease-out;
				}
				.animate-fade-in-up {
					animation: fadeInUp 1s ease-out;
				}
				.animation-delay-200 {
					animation-delay: 0.2s;
				}
				.animation-delay-400 {
					animation-delay: 0.4s;
				}
				.animation-delay-600 {
					animation-delay: 0.6s;
				}
				.animation-delay-2000 {
					animation-delay: 2s;
				}
				.animation-delay-4000 {
					animation-delay: 4s;
				}
			`}</style>
		</HomeLayout>
	);
}
