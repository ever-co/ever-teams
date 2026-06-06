import { cn } from '@ever-teams/toolkit-ui';
import React from 'react';
import { Highlight, themes } from 'prism-react-renderer';

interface CodeBlockProps {
	language: string;
	code: string;
	className?: string;
}

/**
 * A component to display a code block with syntax highlighting.
 *
 * @param language The programming language of the code block.
 * @param code The code block to display.
 * @param className An optional className to pass to the outermost div.
 *
 * @example
 * <CodeBlock language="typescript" code="const foo: string = 'bar';" />
 */

export const CodeBlock = ({ language, code, className }: CodeBlockProps) => (
	<div className={cn('rounded-lg overflow-hidden', className)}>
		<Highlight theme={themes.vsDark} code={code} language={language}>
			{({ className, style, tokens, getLineProps, getTokenProps }) => (
				<pre className={'p-4 rounded-lg' + ' ' + className} style={style}>
					{tokens.map((line, i) => (
						<div key={i} {...getLineProps({ line })}>
							{line.map((token, key) => (
								<span key={key} {...getTokenProps({ token })} />
							))}
						</div>
					))}
				</pre>
			)}
		</Highlight>
	</div>
);
