import { ComponentConfig, ComponentTrait } from '../../types';
import { Member } from '@ever-teams/toolkit-types';

export const DEFAULT_MEMBERS: Member[] = [
	{ label: 'Kevin Peterson', progress: 30, color: '#34d399' },
	{ label: 'Josh Kenan', progress: 25, color: '#eab308' },
	{ label: 'Arick Bulienine', progress: 75, color: '#eab308' },
	{ label: 'Innocent Akim', progress: 100, color: '#10b981' }
];

const traits: ComponentTrait[] = [
	{
		type: 'select',
		label: 'Size',
		name: 'size',
		changeProp: 1,
		default: 'default',
		options: [
			{ value: 'default', name: 'Default' },
			{ value: 'sm', name: 'Small' },
			{ value: 'lg', name: 'Large' }
		]
	},
	{
		type: 'select',
		label: 'Variant',
		name: 'variant',
		changeProp: 1,
		default: 'default',
		options: [
			{ value: 'default', name: 'Default' },
			{ value: 'bordered', name: 'Bordered' }
		]
	},
	{
		type: 'text',
		label: 'Title',
		name: 'title',
		changeProp: 1,
		default: 'Members Activities'
	},
	{
		type: 'checkbox',
		label: 'Show Progress',
		name: 'showProgress',
		changeProp: 1,
		default: false
	},
	{
		type: 'checkbox',
		label: 'Show Time',
		name: 'showTime',
		changeProp: 1,
		default: false
	},
	{
		type: 'text',
		label: 'Values',
		name: 'values',
		changeProp: 1,
		default: JSON.stringify(DEFAULT_MEMBERS)
	}
];

export const basicMemberConfig: ComponentConfig = {
	type: 'basic-member',
	label: 'Member Card',
	category: 'Other',
	content: '<div data-gjs-type="basic-member"></div>',
	image: '/img/member.png',
	defaults: {
		tagName: 'div',
		attributes: {
			'data-component': 'BasicTeamsMember',
			'data-variant': 'default',
			'data-size': 'default'
		},
		draggable: '*',
		droppable: false,
		traits
	},
	mapping: {
		importPath: '@ever-teams/atoms',
		componentName: 'BasicTeamsMember',
		category: 'OTHER',
		inputs: {
			name: 'InputBasicMember',
			importPath: '@ever-teams/atoms'
		}
	}
};
