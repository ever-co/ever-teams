import { CodeBlock } from '../../ui/CodeBlock';

export const IntegrationGuides = () => (
	<div className="mb-32">
		<h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">Integration Guides</h2>
		<div className="space-y-12">
			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Basic Integration</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					The simplest way to integrate Teams components with Craft.js is through component registration and
					user components.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { Editor, Frame, Element } from '@craftjs/core';
import { TeamsModernTimer, TeamsProvider } from '@ever-teams/atoms';

// Create a User Component wrapper for TeamsModernTimer
const CraftModernTimer = ({...props}) => {
  const { connectors: { connect, drag } } = useNode();

  return (
    <div ref={ref => connect(drag(ref))}>
      <TeamsModernTimer {...props} />
    </div>
  );
};

function App() {
  return (
    <TeamsProvider>
      <Editor resolver={{ CraftModernTimer }}>
        <Frame>
          <Element canvas>
            <CraftModernTimer
              variant="default"
              showProgress={true}
            />
          </Element>
        </Frame>
      </Editor>
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
					Customize the look and feel by configuring Teams&apos;s theme options within Craft.js.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { TeamsThemeProvider } from '@ever-teams/atoms';
import { Editor } from '@craftjs/core';

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
      <Editor>
        {/* Your Craft.js editor content */}
      </Editor>
    </TeamsThemeProvider>
  );
}`}
				/>
			</div>

			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					Component Settings Panel
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					Create custom settings panels for Teams components in your Craft.js editor.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { useNode } from '@craftjs/core';

const TimerSettings = () => {
  const { actions: { setProp }, variant, showProgress } = useNode((node) => ({
    variant: node.data.props.variant,
    showProgress: node.data.props.showProgress
  }));

  return (
    <div className="settings-panel">
      <select
        value={variant}
        onChange={e => setProp(props => props.variant = e.target.value)}
      >
        <option value="default">Default</option>
        <option value="bordered">Bordered</option>
      </select>

      <label>
        <input
          type="checkbox"
          checked={showProgress}
          onChange={e => setProp(props => props.showProgress = e.target.checked)}
        />
        Show Progress
      </label>
    </div>
  );
};

// Add settings to your component
CraftModernTimer.craft = {
  related: {
    settings: TimerSettings
  }
};`}
				/>
			</div>
		</div>
	</div>
);
