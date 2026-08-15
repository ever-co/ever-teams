import { useNode } from '@craftjs/core';
import React from 'react';
import { EditBar } from '../../editbar';

export const HeadingSettings = () => {
    const {
        actions: { setProp },
        props
    } = useNode((node) => ({
        props: node.data.props
    }));

    return (
        <EditBar
            config={[
                {
                    type: 'text',
                    label: 'Text',
                    property: 'text'
                },
                {
                    type: 'select',
                    label: 'Level',
                    property: 'level',
                    list: [
                        { value: 'h1', label: 'H1' },
                        { value: 'h2', label: 'H2' },
                        { value: 'h3', label: 'H3' },
                        { value: 'h4', label: 'H4' },
                        { value: 'h5', label: 'H5' },
                        { value: 'h6', label: 'H6' }
                    ]
                },
                {
                    type: 'select',
                    label: 'Font Weight',
                    property: 'fontWeight',
                    list: [
                        { value: 'font-normal', label: 'Normal' },
                        { value: 'font-medium', label: 'Medium' },
                        { value: 'font-semibold', label: 'Semibold' },
                        { value: 'font-bold', label: 'Bold' }
                    ]
                },
                {
                    type: 'select',
                    label: 'Text Size',
                    property: 'textSize',
                    list: [
                        { value: 'text-xl', label: 'Small' },
                        { value: 'text-2xl', label: 'Medium' },
                        { value: 'text-3xl', label: 'Large' },
                        { value: 'text-4xl', label: 'Extra Large' }
                    ]
                }
            ]}
        />
    );
};

export const TextBlockSettings = () => {
    const {
        actions: { setProp },
        props
    } = useNode((node) => ({
        props: node.data.props
    }));

    return (
        <EditBar
            config={[
                {
                    type: 'text',
                    label: 'Text',
                    property: 'text'
                },
                {
                    type: 'select',
                    label: 'Font Weight',
                    property: 'fontWeight',
                    list: [
                        { value: 'font-normal', label: 'Normal' },
                        { value: 'font-medium', label: 'Medium' },
                        { value: 'font-semibold', label: 'Semibold' }
                    ]
                },
                {
                    type: 'select',
                    label: 'Text Size',
                    property: 'textSize',
                    list: [
                        { value: 'text-sm', label: 'Small' },
                        { value: 'text-base', label: 'Base' },
                        { value: 'text-lg', label: 'Large' }
                    ]
                }
            ]}
        />
    );
};

export const ParagraphSettings = () => {
    const {
        actions: { setProp },
        props
    } = useNode((node) => ({
        props: node.data.props
    }));

    return (
        <EditBar
            config={[
                {
                    type: 'text',
                    label: 'Text',
                    property: 'text'
                },
                {
                    type: 'select',
                    label: 'Font Weight',
                    property: 'fontWeight',
                    list: [
                        { value: 'font-normal', label: 'Normal' },
                        { value: 'font-medium', label: 'Medium' }
                    ]
                },
                {
                    type: 'select',
                    label: 'Line Height',
                    property: 'lineHeight',
                    list: [
                        { value: 'leading-normal', label: 'Normal' },
                        { value: 'leading-relaxed', label: 'Relaxed' },
                        { value: 'leading-loose', label: 'Loose' }
                    ]
                }
            ]}
        />
    );
};
