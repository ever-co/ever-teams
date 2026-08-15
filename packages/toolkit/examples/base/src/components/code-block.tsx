'use client';

import { Button } from 'theme-ui';
import { Copy, Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/themes/prism-tomorrow.css';

interface CodeBlockProps {
	code: string;
}

export const CodeBlock = ({ code }: CodeBlockProps) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	useEffect(() => {
		if (typeof window !== 'undefined') {
			Prism.highlightAll();
		}
	}, [code]);

	return (
		<div className="relative">
			<Button variant="outline" onClick={handleCopy} className="absolute right-2 top-2 z-10">
				{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
			</Button>
			<pre className="!bg-slate-950 !p-4 rounded-lg overflow-x-auto">
				<code className="language-tsx text-sm">{code}</code>
			</pre>
		</div>
	);
};
