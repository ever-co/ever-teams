import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ever-teams/toolkit-ui';
import { CodeBlock } from './CodeBlock';
import React from 'react';
import { ComponentExampleProps } from '../../types';

export const ComponentExample = ({ title, description, code, children }: ComponentExampleProps) => {
    return (
        <div className="flex flex-col gap-6 p-6 rounded-lg bg-transparent shadow-sm">
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                        {title}
                    </h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Component
                        </span>
                    </div>
                </div>
                {description && (
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {description}
                    </p>
                )}
            </div>

            <Tabs defaultValue="preview" className="w-full">
                <TabsList className="mb-4 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <TabsTrigger 
                        value="preview" 
                        className="text-sm px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
                    >
                        Preview
                    </TabsTrigger>
                    <TabsTrigger 
                        value="code"
                        className="text-sm px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900"
                    >
                        Code
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="preview">
                    <div className="flex items-center justify-center min-h-[200px] p-6 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                        {children}
                    </div>
                </TabsContent>
                <TabsContent value="code">
                    <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        <CodeBlock code={code} language="tsx" />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
