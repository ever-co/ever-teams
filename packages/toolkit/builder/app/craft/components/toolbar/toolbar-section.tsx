import { useNode } from '@craftjs/core';
import React from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { ToolbarSectionProps } from '../../types';

export const ToolbarSection: React.FC<ToolbarSectionProps> = ({
    title,
    props = [],
    summary,
    children
}) => {
    const { nodeProps } = useNode((node) => ({
        nodeProps: props.reduce((res: Record<string, any>, key: string) => {
            res[key] = node.data.props[key] || null;
            return res;
        }, {}),
    }));

    return (
        <Accordion type="single" collapsible className='dark:bg-slate-800'>
            <AccordionItem value="item-1">
                <AccordionTrigger className="flex justify-between items-center px-6 py-4 bg-transparent dark:bg-slate-800">
                    <h5 className="text-sm font-medium text-dark-gray dark:text-slate-200">{title}</h5>
                    {summary && props.length > 0 && (
                        <h5 className="text-sm text-right text-dark-blue">
                            {summary(
                                props.reduce((acc: Record<string, any>, key: string) => {
                                    acc[key] = nodeProps[key];
                                    return acc;
                                }, {})
                            )}
                        </h5>
                    )}
                </AccordionTrigger>
                <AccordionContent className="p-4 dark:bg-slate-800">
                    <div className="grid grid-cols-12 gap-4 overflow-auto">
                        {children}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};
