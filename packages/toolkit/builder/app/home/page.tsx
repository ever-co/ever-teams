'use client';

import { MainLayout } from '../../components/layouts';
import { useState, useEffect } from 'react';
import { builders, userTypes, comparisonRows, imageConfig } from '../../libs/data';
import {
	ComparisonTable,
	ProductShowcase,
	ValueProposition,
	FrameworkSelection,
	DecisionHelper
} from '../../components/sections/homepage';
import { HeroSection } from '../../components/sections/builder-io';

export default function HomePage() {
	const [currentImageConfig, setCurrentImageConfig] = useState(imageConfig[0]);
	const [activeTab, setActiveTab] = useState<number | null>(null);

	useEffect(() => {
		const INTERVAL_DURATION = 3000;
		let currentIndex = 0;

		const interval = setInterval(() => {
			currentIndex = (currentIndex + 1) % imageConfig.length;
			setCurrentImageConfig(imageConfig[currentIndex]);
		}, INTERVAL_DURATION);

		return () => clearInterval(interval);
	}, []);

	const handleTabChange = (index: number) => {
		setActiveTab(index === activeTab ? null : index);
	};

	return (
		<MainLayout>
			<HeroSection />
			<ProductShowcase currentImageConfig={currentImageConfig} />
			<ValueProposition />
			<FrameworkSelection builders={builders} />
			<ComparisonTable data={comparisonRows} />
			<DecisionHelper userTypes={userTypes} activeTab={activeTab} onTabChange={handleTabChange} />
		</MainLayout>
	);
}
