import { useEditor, useNode } from '@craftjs/core';
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { ActiveBorder } from '../../active-border';
import { EditBar } from '../../editbar';
import { ConfigItem } from '../../../types';

export const TextareaDrag = ({
    placeholder,
    width,
    height,
    rows,
    fontSize,
    textColor,
    backgroundColor,
    borderRadius,
    ...props
}: any) => {
    const {
        id,
        connectors: { connect, drag }
    } = useNode();

    const { hoveredNodeId } = useEditor((state) => ({
        hoveredNodeId: state.events
    }));
    const hoveredId = hoveredNodeId ? Array.from(hoveredNodeId.hovered)[0] : null;

    // Custom styling
    const customStyle: React.CSSProperties = {
        width: width + 'px',
        minHeight: height + 'px',
        margin: props.margin + 'px',
        padding: props.padding + 'px'
    };

    // Add custom styles if provided
    if (fontSize) customStyle.fontSize = fontSize + 'px';
    if (textColor) customStyle.color = textColor;
    if (backgroundColor) customStyle.backgroundColor = backgroundColor;
    if (borderRadius) customStyle.borderRadius = borderRadius + 'px';

    return (
        <div
            ref={(ref) => {
                if (ref instanceof HTMLElement) {
                    connect(drag(ref));
                }
            }}
            draggable={false}
            style={{ width: width + 'px' }}
        >
            <ActiveBorder active={id === hoveredId} id={id}>
                <Textarea
                    placeholder={placeholder}
                    rows={rows}
                    style={customStyle}
                    {...props}
                />
            </ActiveBorder>
        </div>
    );
};

export const TextareaSettings = () => {
    const {
        actions: { setProp },
        props
    } = useNode((node) => ({
        props: node.data.props
    }));

    // Basic settings
    const basicSettings: ConfigItem[] = [
        {
            type: 'text',
            label: 'Placeholder',
            property: 'placeholder'
        },
        {
            type: 'number',
            property: 'width',
            label: 'Width',
            options: {
                min: 0,
                max: 1000
            }
        },
        {
            type: 'number',
            property: 'height',
            label: 'Height',
            options: {
                min: 80,
                max: 1000
            }
        },
        {
            type: 'number',
            property: 'rows',
            label: 'Rows',
            options: {
                min: 2,
                max: 20
            }
        }
    ];

    // Style settings
    const styleSettings: ConfigItem[] = [
        {
            type: 'divider',
            property: '',
            label: 'Style Settings'
        },
        {
            type: 'number',
            property: 'fontSize',
            label: 'Font Size',
            options: {
                min: 10,
                max: 32
            }
        },
        {
            type: 'color',
            label: 'Text Color',
            property: 'textColor'
        },
        {
            type: 'color',
            label: 'Background Color',
            property: 'backgroundColor'
        },
        {
            type: 'number',
            label: 'Border Radius',
            property: 'borderRadius',
            options: {
                min: 0,
                max: 50
            }
        },
        {
            type: 'number',
            label: 'Padding',
            property: 'padding',
            options: {
                min: 0,
                max: 50
            }
        },
        {
            type: 'number',
            label: 'Margin',
            property: 'margin',
            options: {
                min: 0,
                max: 100
            }
        }
    ];

    return (
        <div>
            <EditBar config={basicSettings} />
            <EditBar config={styleSettings} />
        </div>
    );
};

export const TextareaDefaultProps = {
    placeholder: 'Enter text here...',
    width: 300,
    height: 120,
    rows: 4,
    fontSize: 14,
    padding: 8,
    margin: 0,
    textColor: '',
    backgroundColor: '',
    borderRadius: 6
};

TextareaDrag.craft = {
    props: TextareaDefaultProps,
    related: {
        settings: TextareaSettings
    }
};
