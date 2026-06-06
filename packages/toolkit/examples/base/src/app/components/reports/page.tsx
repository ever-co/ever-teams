'use client';

import Link from 'next/link';

export default function ChartsPage() {
	return (
		<div className="space-y-8">
			<h1 className="text-3xl font-bold">Chart Components</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				<Link href="/components/charts/bar" className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
					<h2 className="text-xl font-semibold mb-2">Bar Charts</h2>
					<p className="text-gray-600">Horizontal and vertical bar charts</p>
				</Link>

				<Link
					href="/components/charts/line"
					className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
				>
					<h2 className="text-xl font-semibold mb-2">Line Charts</h2>
					<p className="text-gray-600">Simple and area line charts</p>
				</Link>

				<Link
					href="/components/charts/radial"
					className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
				>
					<h2 className="text-xl font-semibold mb-2">Radial Charts</h2>
					<p className="text-gray-600">Radial and radar visualizations</p>
				</Link>
			</div>
		</div>
	);
}
