'use client';

import { useEffect } from 'react';
import hotkeys, { HotkeysEvent } from 'hotkeys-js';

export const useHotkeys = (key: string, callback: (e?: KeyboardEvent, h?: HotkeysEvent) => void) => {
	useEffect(() => {
		hotkeys(key, (event, handler) => {
			event.preventDefault();
			callback(event, handler);
		});

		return () => {
			hotkeys.unbind(key);
		};
	}, [key, callback]);
};

export const HostKeys = {
	START_STOP_TIMER: 'ctrl+option+],ctrl+alt+],ctrl+option+[,ctrl+alt+[',
	ASSIGN_TASK: 'shift+a,a',
	SHORTCUT_LIST: 'shift+h,h',
	CREATE_TASK: 'shift+c,c'
};

export const HostKeysMapping = [
	{
		heading: 'HELP',
		keySequence: [
			{
				label:'TO_OPEN_SHORTCUT_LIST',
				sequence: {
					MAC: ['H'],
					OTHER: ['H']
				}
			}
		]
	},
	{
		heading: 'TIMER',
		keySequence: [
			{
				label: 'START_TIMER',
				sequence: {
					MAC: ['Ctrl(⌃)', 'Opt(⌥)', ']'],
					OTHER: ['Ctrl', 'Alt', ']']
				}
			},
			{
				label: 'STOP_TIMER',
				sequence: {
					MAC: ['Ctrl(⌃)', 'Opt(⌥)', '['],
					OTHER: ['Ctrl', 'Alt', '[']
				}
			}
		]
	},
	{
		heading: 'TASK',
		keySequence: [
			{
				label: 'ASSIGN_TASK',
				sequence: {
					MAC: ['A'],
					OTHER: ['A']
				}
			},
			{
				label: 'CREATE_TASK',
				sequence: {
					MAC: ['C'],
					OTHER: ['C']
				}
			}
		]
	}
];
