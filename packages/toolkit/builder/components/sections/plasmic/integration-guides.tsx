import { CodeBlock } from '../../ui/CodeBlock';

export const IntegrationGuides = () => (
	<div className="mb-32">
		<h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">Integration Guides</h2>
		<div className="space-y-12">
			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Basic Integration</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					The simplest way to integrate Teams components with Plasmic is through direct component registration.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { TeamsLoginForm, TeamsProvider } from '@ever-teams/atoms';

function App() {
  return (
    <TeamsProvider>
      <TeamsLoginForm source="storybook" />
    </TeamsProvider>
  );
}`}
				/>
			</div>

			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					Custom Theme Integration
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					Customize the look and feel by extending Plasmic&apos;s theme with Teams&apos;s theme options.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { TeamsThemeProvider } from '@ever-teams/atoms';
import { PlasmicRootProvider } from '@plasmicapp/loader-nextjs';

function App() {
  return (
    <PlasmicRootProvider>
      <TeamsThemeProvider
        theme={{
          colors: {
            primary: '#FF1CF7',
            secondary: '#00F0FF'
          }
        }}
      >
        {/* Your app content */}
      </TeamsThemeProvider>
    </PlasmicRootProvider>
  );
}`}
				/>
			</div>

			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					Component Event Handling
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					Handle component events and state changes in your Plasmic projects.
				</p>
				<CodeBlock
					language="typescript"
					code={`PLASMIC.registerComponent(ModernTimer, {
  name: 'Modern Timer',
  props: {
    onStart: {
      type: 'eventHandler',
      argTypes: [{ name: 'time', type: 'number' }]
    },
    onPause: {
      type: 'eventHandler',
      argTypes: [{ name: 'elapsedTime', type: 'number' }]
    }
  }
});`}
				/>
			</div>
		</div>
	</div>
);
