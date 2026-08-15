import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEditor } from '@craftjs/core';
import { Check, Copy } from 'lucide-react';

const CopyCode = () => {
	const { node } = useEditor((state) => ({
		node: state.nodes,
		state: state
	}));
	const [codes, setCode] = useState(false);
	const allNodes = Object.entries(node)
		// .filter((v) => v[1].data.props?.id !== 'no-drag')
		.map(([key, value]) => ({
			...value,
			uId: key
		}));
	// console.log('allNodes', allNodes);
	const layoutComponent = ({ className, loop }: { className: string; loop: any[] }) => {
		return `<div className="${className}">${loop
			.map((value) => {
				const item = array.find((v) => v.uId === value);
				if (!item) {
					return '';
				} else {
					return objectToComponentString({
						displayName: item.data.displayName,
						props: item.data.props,
						item: item
					});
				}
			})
			.join('')}
		</div>`;
	};
	const array = allNodes.filter((v) => !(v.data.props?.id === 'no-drag' || v.data.displayName === 'div'));
	const rootNodes = allNodes.find((v) => v.uId === 'ROOT');
	const firstDiv = allNodes.find((v) => v.uId !== 'ROOT' && v.data.props.id === 'no-drag');
	const rootDivIds = rootNodes?.data.nodes.filter((v) => v !== firstDiv?.uId);
	// console.log('rootDivIds->1', array);
	function objectToComponentString(obj: { props: object; displayName: string; item: any }): any {
		const { props, displayName, item } = obj;
		if (displayName == 'FlexLayout') {
			// console.log('FlexLayout->', item);
			return layoutComponent({
				className: 'flex justify-between',
				loop: Object.entries(item.data.linkedNodes)
					.map((v) => v[1])
					.filter((v, i) => i < item.data.props.cols)
			});
		} else if (displayName == 'ColLayout') {
			// console.log('ColLayout->', item);
			return layoutComponent({
				className: 'flex flex-col',
				loop: Object.entries(item.data.linkedNodes)
					.map((v) => v[1])
					.filter((v, i) => i < item.data.props.rows)
			});
		}

		if (displayName == 'FlexContainer' || displayName == 'ColContainer' || displayName == 'GridContainer') {
			// console.log('FlexContainer->', item);
			return `
			<div className="flex">${item.data.nodes
					.map((node: string) => {
						const item = array.find((v) => v.uId === node && v.data.name !== 'div');
						if (!item) {
							// console.log();
							return '';
						} else {
							return objectToComponentString({
								displayName: item.data.displayName,
								props: item.data.props,
								item: item
							});
						}
					})
					.join('')}</div>`;
		}
		if (displayName == 'GridLayout') {
			// console.log('GridLayout->', item);
			return layoutComponent({
				className: `grid grid-cols-${item.data.props.cols} grid-rows-${item.data.props.rows} gap-${item.data.props.gap}`,
				loop: Object.entries(item.data.linkedNodes)
					.map((v) => v[1])
					.filter((v, i) => i < item.data.props.cols * item.data.props.rows)
			});
		}

		const propsString = Object.entries(props)
			.map(([key, value]) => `\n              ${key}={${typeof value === 'string' ? `"${value}"` : value}} `)
			.join('');

		return `
		    <${displayName} ${propsString} \n             />
		`;
	}
	const importNames = array
		.map((v) => v.data.displayName)
		.filter((v) => v !== 'div' && v !== 'FlexContainer' && v !== 'FlexLayout');
	// [...new Set(array.map((v) => v.data.displayName))]
	const code = `import {${importNames.length > 2 ? '\n' : ''} TeamsProvider,${[...new Set(importNames.map((v) => `${importNames.length > 2 ? '\n' : ''} ${v}`))]} } from '@ever-teams/atoms'

	const Teams = () => {
	  return (
		<TeamsProvider>
		${Array.isArray(rootDivIds) && rootDivIds.length !== 0
			? rootDivIds
				.map((id, i) => {
					const item = array.find((v) => v.uId === id);
					// console.log('item' + i + ' :', item);
					if (!item) {
						return '';
					} else {
						// return item;
						return objectToComponentString({
							displayName: item.data.displayName,
							props: item.data.props,
							item: item
						});
					}
				})
				.join('')
			: '{/*  Your components here */}'
		}\n        </TeamsProvider>
	  )
	}
	`;

	return (
		<Dialog>
			<DialogTrigger asChild>
				{/* <pre>hello</pre> */}
				<Button className="dark:bg-slate-800 dark:text-slate-100" variant="outline">
					Copy
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[725px] max-h-[93vh]">
				<DialogHeader>
					<DialogTitle className="flex relative justify-between">
						<span className="text-lg font-bold mt-4">Here is the code:</span>
					</DialogTitle>
				</DialogHeader>
				<div className="border text-sm max-h-[calc(93vh-_140px)] relative overflow-y-auto dark:bg-gray-800">
					<div>
						<Button
							onClick={() => {
								navigator.clipboard.writeText(code);
								setCode(true);

								setTimeout(() => {
									setCode(false);
								}, 2000);
							}}
							variant="outline"
							className="absolute top-2 right-2 dark:text-gray-100"
						>
							{!codes ? <Copy className="h-3 w-3" /> : <Check className="h-3 w-3" />}
						</Button>
					</div>
					<CodeBlock code={code} />
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default CopyCode;

interface ComponentProps {
	displayName: string;
	props: Record<string, string>;
}
export const tokenize = (code: string): string[] => {
	const regex =
		/(\b(?:import|from|const|let|var|return|function)\b|\{|\}|\(|\)|<|>|\/|=>|=|;|,|\.|\b\d+\b|['"`][\s\S]*?['"`]|\/\*[\s\S]*?\*\/|\/\/.*|[a-zA-Z_]\w*)/g;
	return code.split(regex).filter(Boolean);
};

export const getTokenColor = (token: string, prevTokens: string[]): string => {
	if (/^(import|from|const|let|var|return|function)$/.test(token)) return 'text-purple-900';
	if (/^(Teams)$/.test(token)) return 'text-black';
	if (/^[{}\(\)<>=;,\.]$/.test(token)) return 'text-gray-800';
	if (/^['"`][\s\S]*?['"`]$/.test(token)) return 'text-green-800';
	if (/^\d+$/.test(token)) return 'text-orange-900';
	if (/^(\/\/|\/\*)/.test(token)) return 'text-gray-900';
	if (/^[a-zA-Z_]\w*$/.test(token)) return 'text-blue-900';
	// if there is space + text + = like <Text text= now change the color of text
	if (/^['"`][\s\S]*?['"`]$/.test(token)) {
		// Check if the previous non-space tokens indicate a property assignment
		const prevNonSpaceTokens = prevTokens.filter((t) => t.trim() !== '').slice(-2);
		if (prevNonSpaceTokens.length === 2 && prevNonSpaceTokens[1] === '=') {
			return 'text-white'; // Highlight all property values
		}
		return 'text-green-600'; // Default string color
	}
	return 'text-black';
};
const CodeBlock: React.FC<{ code: string }> = ({ code }) => {
	const tokens = tokenize(code);

	return (
		<pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
			<code className="text-sm font-mono">
				{tokens.map((token, index, allTokens) => (
					<span key={index} className={getTokenColor(token, allTokens)}>
						{token}
					</span>
				))}
			</code>
		</pre>
	);
};
