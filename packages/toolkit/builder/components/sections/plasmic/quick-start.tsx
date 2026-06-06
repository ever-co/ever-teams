import { CodeBlock } from '../../ui/CodeBlock';

export const QuickStart = () => (
	<div className="mb-32">
		<h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">Quick Start</h2>
		<div className="space-y-8">
			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					1. Install Dependencies
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					First, install the required packages. The @ever-teams/atoms package contains our core components, UI and
					Theming.
				</p>
				<CodeBlock language="bash" code="npm install @ever-teams/atoms" />
			</div>

			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					2. Setup Theme Provider
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					Wrap your application with TeamsProvider to enable theming and context features.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { TeamsProvider } from '@ever-teams/atoms';

export default function App() {
  return (
    <TeamsProvider>
      {/* Your app content */}
    </TeamsProvider>
  );
}`}
				/>
			</div>

			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					3. Register Components in Plasmic
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					Register the components you want to use in Plasmic. This makes them available in the Plasmic Studio
					interface.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { TeamsLoginForm, ModernTimer, TeamsProgress } from '@ever-teams/atoms';
import { PLASMIC } from './plasmic-init';

// Register Authentication Form
PLASMIC.registerComponent(TeamsLoginForm, {
  name: 'Teams Login Form',
  props: {
    source: {
      type: 'choice',
      options: [
        { label: 'Storybook', value: 'storybook' },
        { label: 'Example', value: 'example' }
      ]
    },
    className: { type: 'string' }
  }
});

// Register Modern Timer
PLASMIC.registerComponent(ModernTimer, {
  name: 'Modern Timer',
  props: {
    variant: {
      type: 'choice',
      options: [
        { label: 'Basic', value: 'basic' },
        { label: 'Progress', value: 'progress' },
        { label: 'Expandable', value: 'expandable' }
      ]
    },
    showControls: { type: 'boolean', defaultValue: true }
  }
});`}
				/>
			</div>

			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					4. Configure Authentication (Optional)
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					If you&apos;re using authentication features, configure your auth settings.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { TeamsConfig } from '@ever-teams/atoms';

TeamsConfig.init({
  authEndpoint: 'https://your-auth-endpoint.com',
  apiKey: process.env.NEXT_PUBLIC_TEAMS_API_KEY
});`}
				/>
			</div>
		</div>
	</div>
);
