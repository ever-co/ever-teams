import { getAttributeValue } from 'domutils';
import { HtmlToSlateConfig, SlateToDomConfig } from 'slate-serializers';
import { Element } from 'domhandler';

export const configHtmlToSlate: HtmlToSlateConfig = {
	elementStyleMap: {
		align: 'textAlign'
	},

	elementTags: {
		a: (el) => ({
			type: 'link',
			linkType: el && getAttributeValue(el, 'data-link-type'),
			newTab: el && getAttributeValue(el, 'target') === '_blank',
			href: el && getAttributeValue(el, 'href')
		}),
		blockquote: () => ({ type: 'blockquote' }),
		h1: () => ({ type: 'h1' }),
		h2: () => ({ type: 'h2' }),
		h3: () => ({ type: 'h3' }),
		h4: () => ({ type: 'h4' }),
		h5: () => ({ type: 'h5' }),
		h6: () => ({ type: 'h6' }),
		li: () => ({ type: 'li' }),
		ol: () => ({ type: 'ol' }),
		p: () => ({ type: 'p' }),
		ul: () => ({ type: 'ul' }),
		//@ts-ignore
		div: (el) => {
			if (el && el.attribs.class === 'checklist-container') {
				const checkbox = el.firstChild as Element;
				const textNode = el.lastChild as Element;
				return {
					type: 'checklist',
					checked: checkbox && checkbox.attribs.checked === 'true',
					children: [
						//@ts-ignore
						{ text: textNode && textNode.firstChild.data }
					]
				};
			}
			return undefined;
		}
	},
	textTags: {
		code: () => ({ code: true }),
		pre: () => ({ code: true }),
		del: () => ({ strikethrough: true }),
		em: () => ({ italic: true }),
		i: () => ({ italic: true }),
		s: () => ({ strikethrough: true }),
		strong: () => ({ bold: true }),
		u: () => ({ underline: true })
	},
	htmlPreProcessString: (html) => html.replace(/<pre[^>]*>/g, '<code>').replace(/<\/pre>/g, '</code>'),
	filterWhitespaceNodes: true,
	convertBrToLineBreak: true
};

const ELEMENT_NAME_TAG_MAP = {
	p: 'p',
	paragraph: 'p',
	h1: 'h1',
	h2: 'h2',
	h3: 'h3',
	h4: 'h4',
	h5: 'h5',
	h6: 'h6',
	ul: 'ul',
	ol: 'ol',
	li: 'li',
	blockquote: 'blockquote'
};

const MARK_ELEMENT_TAG_MAP = {
	strikethrough: ['s'],
	bold: ['strong'],
	underline: ['u'],
	italic: ['i'],
	code: ['pre', 'code']
};

export const configSlateToHtml: SlateToDomConfig = {
	elementStyleMap: { align: 'textAlign' },
	markMap: MARK_ELEMENT_TAG_MAP,
	elementMap: ELEMENT_NAME_TAG_MAP,
	elementTransforms: {
		link: ({ node, children = [] }) => {
			const attrs: any = {};
			if (node.linkType) {
				attrs['data-link-type'] = node.linkType;
			}
			if (node.newTab) {
				attrs.target = '_blank';
			}
			return new Element(
				'a',
				{
					href: node.href,
					...attrs
				},
				children
			);
		},
		checklist: ({ node, children = [] }) => {
			const containerAttrs = {
				class: 'checklist-container'
			};

			const inputAttrs = {
				type: 'checkbox',
				checked: node.checked ? 'true' : 'false'
			};

			const textNode = new Element('span', {}, children);
			const inputNode = new Element('input', inputAttrs);
			const containerNode = new Element('div', containerAttrs, [inputNode, textNode]);

			return containerNode;
		}
	}
};
