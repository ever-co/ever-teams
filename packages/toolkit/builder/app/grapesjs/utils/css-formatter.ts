import { CSSFormattingResult } from '../types/editor';

export const formatExportCSS = (css: string): string => {
	return css
		.replace(/\*\s*{/g, ':global(*) {')
		.replace(/body\s*{/g, ':global(body) {')
		.replace(/html\s*{/g, ':global(html) {')
		.replace(/button\s*{/g, ':global(button) {')
		.replace(/\[.*?\]/g, (match) => `:global(${match})`)
		.replace(/\.([\w-]+)\s*{/g, (match, className) => {
			if (className.includes('teams-') || className.includes('gjs-')) {
				return match;
			}
			return `:global(.${className}) {`;
		})
		.replace(/:(hover|active|focus|before|after)/g, ':global($1)')
		.replace(/:global\(:global/g, ':global');
};

export const separateGlobalAndModuleStyles = (css: string): CSSFormattingResult => {
	// Filter out box-sizing rule before any processing
	const rules = css
		.split('}')
		.filter((rule) => {
			const trimmedRule = rule.trim();
			return !(trimmedRule.includes('*') && trimmedRule.includes('box-sizing: border-box'));
		})
		.join('}');

	// Then normalize the CSS
	const normalizedCSS = rules
		.replace(/\s+/g, ' ')
		.replace(/\{\s+/g, '{')
		.replace(/\s+\}/g, '}')
		.replace(/;\s+/g, ';')
		.replace(/:\s+/g, ':')
		.replace(/,\s+/g, ',')
		.replace(/buttonhover/g, 'button:hover')
		.replace(/buttonactive/g, 'button:active')
		.replace(/:global\((.*?)\)/g, '$1');

	// Split into rules and filter duplicates
	const rulesArray = normalizedCSS
		.split('}')
		.filter(Boolean)
		.map((rule) => rule.trim())
		.filter((rule, index, self) => {
			if (rule.startsWith('body')) {
				return self.findIndex((r) => r.startsWith('body')) === index;
			}
			return true;
		});

	const globalStyles: string[] = [];
	const moduleStyles: string[] = [];
	let insideMediaQuery = false;
	let mediaQueryContent = '';

	rulesArray.forEach((rule) => {
		if (rule.includes('@media')) {
			insideMediaQuery = true;
			mediaQueryContent = rule + '\n';
			return;
		}

		if (insideMediaQuery) {
			mediaQueryContent += rule + '}\n';
			if (rule.includes('}')) {
				insideMediaQuery = false;
				if (mediaQueryContent.includes('teams-') || mediaQueryContent.includes('gjs-')) {
					moduleStyles.push(mediaQueryContent);
				} else {
					globalStyles.push(mediaQueryContent);
				}
				mediaQueryContent = '';
			}
			return;
		}

		// Handle non-media query rules
		if (rule.includes('teams-') || rule.includes('gjs-')) {
			moduleStyles.push(rule + '}');
		} else {
			globalStyles.push(rule + '}');
		}
	});

	// Return the formatted result
	const result: CSSFormattingResult = {
		globalStyles: globalStyles.join('\n'),
		moduleStyles: moduleStyles.join('\n')
	};

	return result;
};
