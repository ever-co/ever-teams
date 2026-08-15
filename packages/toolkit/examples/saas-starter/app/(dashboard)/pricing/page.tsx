'use client';

import { PricingSection } from '@/components/landing-page';
import { JSX } from 'react';
import HomeLayout from '@/components/layout/home-layout';

export default function PricingPage(): JSX.Element {
	return (
		<HomeLayout>
			<PricingSection />
		</HomeLayout>
	);
}
