import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import * as ts from 'typescript';

const APP = resolve(__dirname, '..');

// Screens for developers only, and files that hold no screen text
const SKIPPED_FILES = [
	/\.test\.tsx?$/,
	/^i18n\//,
	/^devtools\//,
	/^services\/reactotron\//,
	/\/demo-[^/]*$/,
	/^screens\/demo-/,
	/svgs?\//
];

// Texts that are no message: [file, text, why]
const ALLOWED: [string, string, string][] = [
	['components/button.tsx', 'Helvetica Neue', 'a font name'],
	['theme/typography.ts', 'Helvetica Neue', 'a font name'],
	[
		'screens/authenticated/members-settings-screen/components/change-role-modal.tsx',
		'Member',
		'a role name the API compares'
	],
	['config/config.base.ts', '© 2022-Present, by . All rights reserved.', 'branding the deployment sets'],
	[
		'screens/authenticated/team-screen/components/invite-card-item.tsx',
		'Working on UI Design & making prototype for user testing tomorrow',
		'a stand-in task on the invitation card, no message: it goes when the card stops showing it'
	]
];

const VISIBLE_PROPS = new Set([
	'placeholder',
	'title',
	'label',
	'accessibilityLabel',
	'accessibilityHint',
	'message',
	'description',
	'text',
	'subtitle',
	'heading',
	'buttonText',
	'confirmText',
	'cancelText',
	'headerTitle',
	'tabBarLabel',
	'value'
]);
const VISIBLE_PROPERTY = /(message|description|title|error|label|placeholder|text|hint|^email|^name)$/i;
const SHOWING_CALL = /(^|\.)(alert|showMessage|show)$/;

interface WrittenText {
	file: string;
	line: number;
	text: string;
}

function hasWords(text: string): boolean {
	return /[A-Za-z]{2,}/.test(text);
}

function isMessageKey(text: string): boolean {
	return /^[\w-]+(\.[\w-]+)+$/.test(text);
}

function isCode(text: string): boolean {
	const constant = /^[A-Z0-9_]+$/.test(text);
	const kebab = /^[a-z]+(-[a-z]+)*$/.test(text);
	return constant || kebab;
}

function readsAsEnglish(text: string): boolean {
	const trimmed = text.trim();
	return hasWords(trimmed) && !isMessageKey(trimmed);
}

function readsAsSentence(text: string): boolean {
	const trimmed = text.trim();
	return readsAsEnglish(trimmed) && !isCode(trimmed);
}

/** The literal texts an expression can show: a string, the fixed parts of a template, either side of a choice. */
function textsIn(node: ts.Node | undefined): string[] {
	if (node === undefined) {
		return [];
	}
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
		return [node.text];
	}
	if (ts.isTemplateExpression(node)) {
		const parts = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
		return [parts.join(' ')];
	}
	if (ts.isConditionalExpression(node)) {
		return [...textsIn(node.whenTrue), ...textsIn(node.whenFalse)];
	}
	if (ts.isJsxExpression(node) || ts.isParenthesizedExpression(node)) {
		return textsIn(node.expression);
	}
	return [];
}

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			return sourceFiles(path);
		}
		if (/\.tsx?$/.test(name)) {
			return [path];
		}
		return [];
	});
}

function isBetweenTags(node: ts.JsxExpression): boolean {
	return ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent);
}

function fileOf(path: string): string {
	return relative(APP, path).replace(/\\/g, '/');
}

function writtenTextsOf(path: string): WrittenText[] {
	const file = fileOf(path);
	const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
	const texts: WrittenText[] = [];
	const add = (node: ts.Node, text: string) => {
		const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
		texts.push({ file, line, text: text.trim().replace(/\s+/g, ' ') });
	};
	const addEach = (node: ts.Node, candidates: string[], reads: (text: string) => boolean) => {
		for (const text of candidates.filter(reads)) {
			add(node, text);
		}
	};
	const visit = (node: ts.Node) => {
		if (ts.isJsxText(node) && hasWords(node.text)) {
			add(node, node.text);
		}
		if (ts.isJsxExpression(node) && isBetweenTags(node)) {
			addEach(node, textsIn(node), readsAsEnglish);
		}
		if (ts.isJsxAttribute(node) && VISIBLE_PROPS.has(node.name.getText(source))) {
			addEach(node, textsIn(node.initializer), readsAsEnglish);
		}
		if (ts.isCallExpression(node) && SHOWING_CALL.test(node.expression.getText(source))) {
			for (const argument of node.arguments) {
				addEach(argument, textsIn(argument), readsAsEnglish);
			}
		}
		if (ts.isPropertyAssignment(node) && VISIBLE_PROPERTY.test(node.name.getText(source))) {
			addEach(node, textsIn(node.initializer), readsAsSentence);
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return texts;
}

function isAllowed(text: WrittenText): boolean {
	return ALLOWED.some(([file, allowed]) => file === text.file && allowed === text.text);
}

function isSkipped(path: string): boolean {
	const file = fileOf(path);
	return SKIPPED_FILES.some((pattern) => pattern.test(file));
}

describe('the texts a person reads', () => {
	it('come from the messages, never written in English in the code', () => {
		const written = sourceFiles(APP)
			.filter((path) => !isSkipped(path))
			.flatMap(writtenTextsOf)
			.filter((text) => !isAllowed(text))
			.map(({ file, line, text }) => `${file}:${line} ${text}`);

		expect(written).toEqual([]);
	});
});
