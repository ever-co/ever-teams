import React from 'react';
import { Heading, TextBlockComponent, ParagraphText } from '../../drag-components';

export const typographyComponents = [
    {
        label: "Heading",
        id: "Heading",
        component: <Heading text="Heading" level="h2" className="text-4xl font-bold" />,
        customPreview: (
            <div className="h-20 w-full rounded-md bg-slate-50 dark:bg-slate-900 flex items-center px-4">
                <div className="w-full">
                    <div className="h-7 bg-slate-800 dark:bg-slate-200 rounded-md w-3/4" />
                    <div className="mt-2 h-4 bg-slate-300 dark:bg-slate-700 rounded w-1/2" />
                </div>
            </div>
        )
    },
    {
        label: "Text Block",
        id: "TextBlock",
        component: <TextBlockComponent text="Text block content" className="text-base" />,
        customPreview: (
            <div className="h-20 w-full rounded-md bg-slate-50 dark:bg-slate-900 flex items-center px-4">
                <div className="w-full">
                    <div className="h-4 bg-slate-700 dark:bg-slate-300 rounded w-full" />
                    <div className="mt-2 h-4 bg-slate-700 dark:bg-slate-300 rounded w-4/5" />
                    <div className="mt-2 h-4 bg-slate-700 dark:bg-slate-300 rounded w-2/3" />
                </div>
            </div>
        )
    },
    {
        label: "Paragraph",
        id: "Paragraph",
        component: <ParagraphText text="Paragraph text" className="text-base" />,
        customPreview: (
            <div className="h-20 w-full rounded-md bg-slate-50 dark:bg-slate-900 flex items-center px-4">
                <div className="w-full">
                    <div className="h-3 bg-slate-600 dark:bg-slate-400 rounded w-full" />
                    <div className="mt-1.5 h-3 bg-slate-600 dark:bg-slate-400 rounded w-11/12" />
                    <div className="mt-1.5 h-3 bg-slate-600 dark:bg-slate-400 rounded w-full" />
                    <div className="mt-1.5 h-3 bg-slate-600 dark:bg-slate-400 rounded w-4/5" />
                </div>
            </div>
        )
    }
];
