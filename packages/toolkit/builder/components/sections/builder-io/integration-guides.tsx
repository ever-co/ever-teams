import { CodeBlock } from '../../ui/CodeBlock';

export const IntegrationGuides = () => (
	<div className="mb-32">
		<h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">Integration Guides</h2>
		<div className="space-y-12">
			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Basic Integration</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					The simplest way to integrate Teams components with Builder.io is through component registration.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { Builder } from '@builder.io/react';
import { TeamsModernTimer, TeamsProvider } from '@ever-teams/atoms';

// Register the Modern Timer component
Builder.registerComponent(TeamsModernTimer, {
  name: 'Modern Timer',
  inputs: [
    {
      name: 'variant',
      type: 'string',
      enum: ['default', 'bordered'],
      defaultValue: 'default'
    },
    {
      name: 'showProgress',
      type: 'boolean',
      defaultValue: false
    }
  ]
});

// Wrap your Builder.io content with TeamsProvider
function App() {
  return (
    <TeamsProvider>
      <BuilderComponent model="page" />
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
					Customize the look and feel by configuring Teams&apos;s theme options within Builder.io.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { TeamsThemeProvider } from '@ever-teams/atoms';
import { BuilderComponent } from '@builder.io/react';

function App() {
  return (
    <TeamsThemeProvider
      theme={{
        colors: {
          primary: '#FF1CF7',
          secondary: '#00F0FF'
        }
      }}
    >
      <BuilderComponent model="page" />
    </TeamsThemeProvider>
  );
}`}
				/>
			</div>

			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					Component Event Handling
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					Handle component events and state changes in your Builder.io projects.
				</p>
				<CodeBlock
					language="typescript"
					code={`Builder.registerComponent(TeamsModernTimer, {
  name: 'Modern Timer',
  inputs: [
    {
      name: 'onStart',
      type: 'function',
      helperText: 'Triggered when timer starts'
    },
    {
      name: 'onPause',
      type: 'function',
      helperText: 'Triggered when timer pauses'
    },
    {
      name: 'onComplete',
      type: 'function',
      helperText: 'Triggered when timer completes'
    }
  ]
});`}
				/>
			</div>
		</div>
	</div>
);
