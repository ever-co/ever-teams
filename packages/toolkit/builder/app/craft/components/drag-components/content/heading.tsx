import React from 'react';
import { useNode } from '@craftjs/core';
import { EditBar } from '../../editbar';
import { TextDefaultProps } from '../_constants/text';

interface HeadingProps {
    text: string;
    fontSize?: string | number;
    fontWeight?: string;
    color?: string;
    level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    className?: string;
}

export const Heading = ({ text, fontSize, fontWeight, color, level = 'h2', className = '' }: HeadingProps) => {
    const {
        connectors: { connect, drag }
    } = useNode();

    const Tag = level;
    return (
        <Tag
            ref={(ref) => {
                if (ref) {
                    connect(drag(ref));
                }
            }}
            className={`${className} ${fontSize ? `text-${fontSize}` : ''} ${fontWeight ? `font-${fontWeight}` : ''} ${color || ''}`}
        >
            {text}
        </Tag>
    );
};

const HeadingSettings = () => {
    const {
        actions: { setProp },
        text,
        fontSize,
        level
    } = useNode((node) => ({
        text: node.data.props.text,
        fontSize: node.data.props.fontSize,
        level: node.data.props.level
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
                    type: 'number',
                    label: 'Font Size',
                    property: 'fontSize',
                    options: {
                        min: 12,
                        max: 48
                    }
                },
                {
                    type: 'select',
                    label: 'Font Weight',
                    property: 'fontWeight',
                    list: [
                        { value: 'normal', label: 'Normal' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'semibold', label: 'Semibold' },
                        { value: 'bold', label: 'Bold' }
                    ]
                },
                {
                    type: 'color',
                    label: 'Color',
                    property: 'color'
                }
            ]}
        />
    );
};

Heading.craft = {
    props: {
        ...TextDefaultProps,
        level: 'h2',
        className: ''
    },
    related: {
        settings: HeadingSettings
    }
};
