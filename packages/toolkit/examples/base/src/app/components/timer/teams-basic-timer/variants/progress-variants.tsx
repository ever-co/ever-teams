'use client';

import {
  TeamsBasicTimer
} from '@ever-teams/atoms';
import { ComponentExample } from '@/components/component-example';

export function ProgressVariants() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <ComponentExample
        title="Default with Progress"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer icon progress readonly />`}
      >
        <TeamsBasicTimer icon progress readonly />
      </ComponentExample>

      <ComponentExample
        title="Border with Progress"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer border="thick" icon progress readonly />`}
      >
        <TeamsBasicTimer border="thick" icon progress readonly />
      </ComponentExample>

      <ComponentExample
        title="Border Rounded with Progress"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer border="thick" icon progress readonly rounded="small" />`}
      >
        <TeamsBasicTimer border="thick" icon progress readonly rounded="small" />
      </ComponentExample>

      <ComponentExample
        title="Border Full Rounded with Progress"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer border="thick" icon progress readonly rounded="large" />`}
      >
        <TeamsBasicTimer border="thick" icon progress readonly rounded="large" />
      </ComponentExample>

      <ComponentExample
        title="Gray with Progress"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="secondary" icon progress readonly />`}
      >
        <TeamsBasicTimer background="secondary" icon progress readonly />
      </ComponentExample>

      <ComponentExample
        title="Gray Rounded with Progress"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="secondary" icon progress readonly rounded="small" />`}
      >
        <TeamsBasicTimer background="secondary" icon progress readonly rounded="small" />
      </ComponentExample>

      <ComponentExample
        title="Gray Full Rounded with Progress"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="secondary" icon progress readonly rounded="large" />`}
      >
        <TeamsBasicTimer background="secondary" icon progress readonly rounded="large" />
      </ComponentExample>

      <ComponentExample
        title="Contained with Progress"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="primary" color="destructive" icon progress readonly />`}
      >
        <TeamsBasicTimer background="primary" color="destructive" icon progress readonly />
      </ComponentExample>

      <ComponentExample
        title="Contained Rounded with Progress"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="primary" color="destructive" icon progress readonly rounded="small" />`}
      >
        <TeamsBasicTimer background="primary" color="destructive" icon progress readonly rounded="small" />
      </ComponentExample>

      <ComponentExample
        title="Contained Full Rounded with Progress"
        code={`import { TeamsBasicTimer } from '@ever-teams/atoms';

<TeamsBasicTimer background="primary" color="destructive" icon progress readonly rounded="large" />`}
      >
        <TeamsBasicTimer background="primary" color="destructive" icon progress readonly rounded="large" />
      </ComponentExample>
    </div>
  );
}