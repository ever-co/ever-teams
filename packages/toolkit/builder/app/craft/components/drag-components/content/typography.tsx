import { useEditor, useNode } from '@craftjs/core';
import React from 'react';
import { ActiveBorder } from '../../active-border';
import { HeadingSettings, TextBlockSettings, ParagraphSettings } from '../settings/typography-settings';

// If level can only be specific HTML heading elements
type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
export const Typography = ({ level, children, ...props }: { level: HeadingLevel, children: React.ReactNode, [key: string]: any }) => {
    const { connectors: { connect, drag }, selected, id } = useNode((node) => ({
        selected: node.events.selected,
        id: node.id
    }));

    const { hoveredNodeId } = useEditor((state) => ({
        hoveredNodeId: state.events
    }));
    const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

    const Tag = level;
    return (
        <div
            ref={(ref) => {
                if (ref instanceof HTMLElement) {
                    connect(drag(ref));
                }
            }}
            className="relative"
        >
            <ActiveBorder active={hoveredId === id} id={id}>
                <Tag className={`text-slate-900 dark:text-slate-100 ${props.className}`}>
                    {children}
                </Tag>
            </ActiveBorder>
        </div>
    );
};

Typography.craft = {
    props: {
        level: {
            type: 'select',
            options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'],
            defaultValue: 'h1'
        },
        className: {
            type: 'text',
            defaultValue: 'text-4xl font-bold'
        }
    },
    related: {
        settings: HeadingSettings
    }
};

// Text Block Component
export const TextBlockComponent = ({ text, className = "" }: { text: string, className?: string }) => {
    const { connectors: { connect, drag }, selected, id } = useNode((node) => ({
        selected: node.events.selected,
        id: node.id
    }));

    const { hoveredNodeId } = useEditor((state) => ({
        hoveredNodeId: state.events
    }));
    const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

    return (
        <div
            ref={(ref) => {
                if (ref instanceof HTMLElement) {
                    connect(drag(ref));
                }
            }}
            className="relative"
        >
            <ActiveBorder active={hoveredId === id} id={id}>
                <div className={`text-slate-600 dark:text-slate-400 ${className}`}>
                    {text}
                </div>
            </ActiveBorder>
        </div>
    );
};

TextBlockComponent.craft = {
    props: {
        text: {
            type: 'text',
            defaultValue: 'Text block content'
        },
        className: {
            type: 'text',
            defaultValue: 'text-base'
        }
    },
    related: {
        settings: TextBlockSettings
    }
};

// Paragraph Component
export const ParagraphText = ({ text, className = "" }: { text: string, className?: string }) => {
    const { connectors: { connect, drag }, selected, id } = useNode((node) => ({
        selected: node.events.selected,
        id: node.id
    }));

    const { hoveredNodeId } = useEditor((state) => ({
        hoveredNodeId: state.events
    }));
    const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

    return (
        <div
            ref={(ref) => {
                if (ref instanceof HTMLElement) {
                    connect(drag(ref));
                }
            }}
            className="relative"
        >
            <ActiveBorder active={hoveredId === id} id={id}>
                <p className={`text-slate-600 dark:text-slate-400 ${className}`}>
                    {text}
                </p>
            </ActiveBorder>
        </div>
    );
};

ParagraphText.craft = {
    props: {
        text: {
            type: 'text',
            defaultValue: 'Paragraph text'
        },
        className: {
            type: 'text',
            defaultValue: 'text-base'
        }
    },
    related: {
        settings: ParagraphSettings
    }
};
