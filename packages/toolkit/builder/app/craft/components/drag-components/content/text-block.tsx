import React from 'react';
import { useNode } from '@craftjs/core';
import { EditBar } from '../../editbar';

// Define an interface for the component's props
interface TextBlockProps {
    title: string;
    content: string[];
}

export const TextBlock = ({ title, content }: TextBlockProps) => {
    const {
        connectors: { connect, drag }
    } = useNode();

    return (
        <div
            ref={(domNode) => {
                if (domNode) {
                    connect(drag(domNode));
                }
            }}
            className="prose dark:prose-invert"
        >
            <h3>{title}</h3>
            {content.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
            ))}
        </div>
    );
};

const TextBlockSettings = () => {
    const {
        actions: { setProp },
        title,
        content
    } = useNode((node) => ({
        title: node.data.props.title,
        content: node.data.props.content
    }));

    return (
        <EditBar
            config={[
                {
                    type: 'text',
                    label: 'Title',
                    property: 'title'
                },
                {
                    type: 'textarea',
                    label: 'Content',
                    property: 'content'
                }
            ]}
        />
    );
};

TextBlock.craft = {
    props: {
        title: 'Default Title',
        content: ['Default paragraph text']
    },
    related: {
        settings: TextBlockSettings
    }
};
