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
					First, install the required packages for Craft.js integration with Teams components.
				</p>
				<CodeBlock language="bash" code="npm install @craftjs/core @ever-teams/atoms" />
			</div>

			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					2. Setup Craft Editor
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					Initialize the Craft.js editor with Teams components.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { Editor } from '@craftjs/core';
import { TeamsProvider, TeamsModernTimer, TeamsProgress } from '@ever-teams/atoms';

export default function CraftEditor() {
  return (
    <TeamsProvider>
      <Editor
        resolver={{
          TeamsModernTimer,
          TeamsProgress
        }}
        onRender={RenderNode}
      >
        <div className="relative h-full">
          {/* Your editor content */}
        </div>
      </Editor>
    </TeamsProvider>
  );
}`}
				/>
			</div>

			<div>
				<h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">
					3. Register Components
				</h3>
				<p className="text-slate-600 dark:text-slate-400 mb-4">
					Define your Teams components with Craft.js settings.
				</p>
				<CodeBlock
					language="typescript"
					code={`import { useNode } from '@craftjs/core';
import { TeamsModernTimer } from '@ever-teams/atoms';

export const CraftModernTimer = ({...props}) => {
  const { connectors: { connect, drag } } = useNode();

  return (
    <div ref={ref => connect(drag(ref))}>
      <TeamsModernTimer {...props} />
    </div>
  );
};

CraftModernTimer.craft = {
  displayName: 'Modern Timer',
  props: {
    variant: {
      type: 'select',
      options: ['default', 'bordered']
    },
    showProgress: {
      type: 'boolean'
    }
  }
};`}
				/>
			</div>
		</div>
	</div>
);
