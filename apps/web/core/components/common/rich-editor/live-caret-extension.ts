import { Extension } from '@tiptap/core';
import { yCursorPlugin } from '@tiptap/y-tiptap';
import type { Awareness } from 'y-protocols/awareness';

/** A co-editor as the awareness carries them (`user`): the name and the six-digit hex color of their caret. */
interface CaretUser {
	name?: string;
	color?: string;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * A co-editor's caret: a thin bar in their color with their name above it. Built with inline styles (the editor's
 * stylesheet is a CSS module) and only text content, so a name can never become markup.
 */
function caretOf(user: CaretUser): HTMLElement {
	const color = user.color && HEX_COLOR.test(user.color) ? user.color : '#64748b';
	const caret = document.createElement('span');
	caret.className = 'docs-live-caret';
	caret.setAttribute('aria-hidden', 'true');
	caret.style.cssText = `position:relative;margin-left:-1px;margin-right:-1px;border-left:2px solid ${color};word-break:normal;pointer-events:none;`;
	const label = document.createElement('span');
	label.textContent = user.name || '…';
	label.style.cssText = `position:absolute;bottom:100%;left:-2px;padding:1px 6px;border-radius:4px 4px 4px 0;background:${color};color:#fff;font-size:11px;font-weight:500;line-height:1.4;white-space:nowrap;user-select:none;`;
	caret.append('⁠', label, '⁠');
	return caret;
}

function selectionOf(user: CaretUser) {
	const color = user.color && HEX_COLOR.test(user.color) ? user.color : '#64748b';
	return { style: `background-color: ${color}33`, class: 'docs-live-selection' };
}

/**
 * The carets and selections of the co-editors of a live page (`@tiptap/y-tiptap`'s cursor plugin on the session's
 * awareness), and this editor's own caret published to them. Used with `Collaboration`, which binds the same
 * document.
 */
export const LiveCaret = Extension.create<{ awareness: Awareness | null }>({
	name: 'liveCaret',

	addOptions() {
		return { awareness: null };
	},

	addProseMirrorPlugins() {
		const awareness = this.options.awareness;
		if (!awareness) return [];
		return [yCursorPlugin(awareness, { cursorBuilder: caretOf, selectionBuilder: selectionOf })];
	}
});
