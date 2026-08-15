import { useEditor, useNode } from '@craftjs/core';
import React from 'react';
import { Toggle } from '@/components/ui/toggle';
import { ActiveBorder } from '../../active-border';
import { EditBar } from '../../editbar';
import { ConfigItem } from '../../../types';

export const ToggleDrag = ({
    text,
    variant,
    size,
    pressed,
    width,
    height,
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
        minWidth: width + 'px',
        height: height + 'px',
        margin: props.margin + 'px',
        padding: props.padding + 'px'
    };

    // Add custom styles if provided
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
                <Toggle
                    variant={variant}
                    size={size}
                    pressed={pressed}
                    style={customStyle}
                    {...props}
                >
                    {text}
                </Toggle>
            </ActiveBorder>
        </div>
    );
};

export const ToggleSettings = () => {
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
            label: 'Text',
            property: 'text'
        },
        {
            type: 'switch',
            label: 'Pressed',
            property: 'pressed'
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
                min: 30,
                max: 100
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
            type: 'select',
            label: 'Variant',
            property: 'variant',
            list: [
                { value: 'default', label: 'Default' },
                { value: 'outline', label: 'Outline' }
            ]
        },
        {
            type: 'select',
            label: 'Size',
            property: 'size',
            list: [
                { value: 'sm', label: 'Small' },
                { value: 'default', label: 'Default' },
                { value: 'lg', label: 'Large' }
            ]
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

export const ToggleDefaultProps = {
    text: 'Toggle',
    variant: 'default',
    size: 'default',
    pressed: false,
    width: 100,
    height: 40,
    padding: 0,
    margin: 0,
    textColor: '',
    backgroundColor: '',
    borderRadius: 6
};

ToggleDrag.craft = {
    props: ToggleDefaultProps,
    related: {
        settings: ToggleSettings
    }
};
