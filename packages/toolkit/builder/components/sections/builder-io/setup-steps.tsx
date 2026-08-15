'use client';
import { CodeBlock } from "../../ui/CodeBlock";

export const SetupSteps = () => (
  <div className="mb-32">
    <h2 className="text-4xl font-bold mb-8 text-slate-900 dark:text-slate-100">Using the Visual Editor</h2>
    
    <div className="space-y-12">
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-slate-800 dark:text-slate-200">Adding Components</h3>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-400">
          <li>Open Builder.io editor</li>
          <li>Find Teams components in the left sidebar</li>
          <li>Drag and drop components into your layout</li>
          <li>Configure settings in the right panel</li>
        </ul>
      </div>

      <div>
        <h3 className="text-2xl font-semibold mb-6 text-slate-800 dark:text-slate-200">Customizing Components</h3>
        <ul className="list-disc pl-6 space-y-2 text-slate-600 dark:text-slate-400">
          <li>Adjust timer settings</li>
          <li>Change colors and styles</li>
          <li>Set progress indicators</li>
          <li>Configure analytics displays</li>
        </ul>
      </div>
    </div>
  </div>
);