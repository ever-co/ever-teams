import React from 'react';

export default function EverTeamsIntro(): JSX.Element {
	return (
		<div>
			<div className="prose prose-slate max-w-full p-6">
				{/* Cover image */}
				<img src="./bg-cover-light.webp" alt="Ever Teams SDK Cover" className="w-full rounded-lg mb-8" />

				{/* Title / Intro */}
				<h1 className="mt-0">Welcome to Ever Teams SDK</h1>

				<h2> What is Ever Teams?</h2>

				<p>
					Ever Teams is a powerful, self-hosted and cloud-hosted time tracking software that provides
					developers with a complete SDK for building time tracking applications. Our platform combines
					beautiful UI components, advanced analytics, and seamless integrations to help you create
					professional time tracking solutions.
				</p>

				<h2> Key Features</h2>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-8">
					<div className="p-6 border border-slate-200 rounded-lg bg-slate-50 ">
						<h3 className="text-slate-900  font-semibold mb-4">⏱️ Time Tracking Components</h3>
						<p className="text-slate-600 ">
							Multiple timer styles, including Modern, Basic, and Custom variants with progress
							indicators, themes, and interactive controls.
						</p>
					</div>

					<div className="p-6 border border-slate-200 rounded-lg bg-slate-50 ">
						<h3 className="text-slate-900  font-semibold mb-4">📊 Analytics &amp; Tracking</h3>
						<p className="text-slate-600 ">
							Real-time user interaction tracking, session replay, heatmap visualization, and detailed
							analytics insights powered by Microsoft Clarity.
						</p>
					</div>

					<div className="p-6 border border-slate-200 rounded-lg bg-slate-50 ">
						<h3 className="text-slate-900  font-semibold mb-4">📈 Reports &amp; Charts</h3>
						<p className="text-slate-600 ">
							Comprehensive reporting with working hours visualization, project/task reports, and
							customizable chart components.
						</p>
					</div>

					<div className="p-6 border border-slate-200 rounded-lg bg-slate-50 ">
						<h3 className="text-slate-900  font-semibold mb-4">🎨 UI Component Library</h3>
						<p className="text-slate-600 ">
							Built on Radix UI and Tailwind CSS with buttons, forms, date pickers, charts, and more - all
							fully customizable.
						</p>
					</div>

					<div className="p-6 border border-slate-200 rounded-lg bg-slate-50 ">
						<h3 className="text-slate-900  font-semibold mb-4">🔐 Authentication</h3>
						<p className="text-slate-600 ">
							Complete authentication system with login forms, user management, and secure token handling.
						</p>
					</div>

					<div className="p-6 border border-slate-200 rounded-lg bg-slate-50 ">
						<h3 className="text-slate-900  font-semibold mb-4">🌍 Internationalization</h3>
						<p className="text-slate-600 ">
							Multi-language support with react-i18next integration and comprehensive localization
							features.
						</p>
					</div>
				</div>

				<h2>SDK Architecture</h2>

				<p>Our SDK is organized into focused packages, each serving specific purposes:</p>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-8">
					{[
						{
							title: '@ever-teams/atoms',
							desc: 'Main component library with time trackers, forms, reports, and tracking components'
						},
						{ title: '@ever-teams/toolkit-ui', desc: 'Base UI components built on Radix UI and Tailwind CSS' },
						{ title: '@ever-teams/api', desc: 'API client functionality for backend integration' },
						{ title: '@ever-teams/types', desc: 'TypeScript definitions and interfaces' },
						{
							title: '@ever-teams/tracking',
							desc: 'Analytics and tracking system with Microsoft Clarity integration'
						}
					].map((pkg) => (
						<div key={pkg.title} className="p-4 border border-slate-200  rounded-md bg-white ">
							<h4 className="text-slate-900  font-medium mb-2">{pkg.title}</h4>
							<p className="text-sm text-slate-600 ">{pkg.desc}</p>
						</div>
					))}
				</div>

				<h2>Quick Start</h2>

				<pre className="bg-slate-900 text-slate-100 rounded p-4 overflow-auto">
					{`# Install the core packages
npm install @ever-teams/atoms @ever-teams/toolkit-ui @ever-teams/api @ever-teams/types

# Optional: Install tracking for analytics
npm install @ever-teams/tracking`}
				</pre>

				<pre className="bg-slate-900 text-slate-100 rounded p-4 overflow-auto mt-4">
					{`import { TeamsProvider, TeamsModernTimer, TeamsBasicTimer } from '@ever-teams/atoms';
import { Button } from '@ever-teams/toolkit-ui';

function App() {
  return (
    <TeamsProvider config={{ apiUrl: 'https://api.your-domain.com' }}>
      <div className="p-4">
        <h1>My Time Tracking App</h1>
        <TeamsModernTimer showProgress={true} />
        <TeamsBasicTimer />
        <Button>Get Started</Button>
      </div>
    </TeamsProvider>
  );
}`}
				</pre>

				<h2>Explore More</h2>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-8">
					<div className="p-6 border-2 border-amber-500 rounded-lg text-center bg-white ">
						<h3 className="text-amber-500 font-semibold mb-4">📚 Getting Started</h3>
						<p className="text-sm text-slate-600  mb-4">Learn how to install and configure the SDK</p>
						<a
							href="https://docs.ever.team/docs/introduction/installation-guide"
							target="_blank"
							rel="noopener noreferrer"
							className="text-amber-500 no-underline font-bold hover:underline"
						>
							Read Guide →
						</a>
					</div>

					<div className="p-6 border-2 border-blue-500 rounded-lg text-center bg-white ">
						<h3 className="text-blue-500 font-semibold mb-4">⏰ Timer Components</h3>
						<p className="text-sm text-slate-600  mb-4">
							Explore our comprehensive collection of timer components
						</p>
						<a
							href="/?path=/story/time-trackers-modern-teams--small"
							className="text-blue-500 no-underline font-bold hover:underline"
						>
							View Timer Stories →
						</a>
					</div>

					<div className="p-6 border-2 border-emerald-500 rounded-lg text-center bg-white ">
						<h3 className="text-emerald-500 font-semibold mb-4">🎨 UI Components</h3>
						<p className="text-sm text-slate-600  mb-4">Discover our complete UI component library</p>
						<a
							href="/?path=/story/utilities-buttons-teams-button--small-teams-button"
							className="text-emerald-500 no-underline font-bold hover:underline"
						>
							View UI Stories →
						</a>
					</div>
				</div>

				<h2>Resources</h2>

				<ul className="list-disc pl-6 text-slate-700">
					<li>
						<a
							href="https://ever.team"
							target="_blank"
							rel="noopener noreferrer"
							className="text-amber-500 hover:underline"
						>
							Official Website
						</a>{' '}
						- Learn more about the Ever Teams Platform
					</li>
					<li>
						<a
							href="https://docs.ever.team"
							target="_blank"
							rel="noopener noreferrer"
							className="text-amber-500 hover:underline"
						>
							Documentation
						</a>{' '}
						- Comprehensive platform documentation
					</li>
					<li>
						<a
							href="https://github.com/teams-co/ever-teams"
							target="_blank"
							rel="noopener noreferrer"
							className="text-amber-500 hover:underline"
						>
							GitHub Repository
						</a>{' '}
						- Source code and contributions
					</li>
					<li>
						<a
							href="https://app.ever.team"
							target="_blank"
							rel="noopener noreferrer"
							className="text-amber-500 hover:underline"
						>
							Demo Application
						</a>{' '}
						- Try the platform live
					</li>
					<li>
						<a
							href="https://builders.ever.team"
							target="_blank"
							rel="noopener noreferrer"
							className="text-amber-500 hover:underline"
						>
							Visual Builders
						</a>{' '}
						- No-code component builders
					</li>
				</ul>

				<hr className="my-8" />

				<div className="text-center p-8 bg-slate-100  rounded-lg my-8">
					<p className="text-slate-600 ">Built with ❤️ by the Ever Co. team • Licensed under AGPL-3.0</p>
				</div>
			</div>
		</div>
	);
}
