'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';
import { CodeBlock } from './code-block';
import React from 'react';

interface ComponentExampleProps {
	title: string;
	code: string;
	children: React.ReactNode;
}

export const ComponentExample = ({ title, code, children }: ComponentExampleProps) => {
	return (
		<div className="flex flex-col gap-2">
			<Tabs defaultValue="preview" className="w-full">
				<div className="flex items-center gap-4">
					<h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 pr-4  border-r dark:border-slate-700">
						{title}
					</h3>
					<TabsList>
						<TabsTrigger value="preview">Preview</TabsTrigger>
						<TabsTrigger value="code">Code</TabsTrigger>
					</TabsList>
				</div>
				<TabsContent value="preview">
					<div className="flex items-center justify-center gap-4 rounded-lg m-0 min-w-full  border border-slate-200 dark:border-slate-800 p-2">
						{children}
					</div>
				</TabsContent>
				<TabsContent value="code">
					<CodeBlock code={code} />
				</TabsContent>
			</Tabs>
		</div>
	);
};
