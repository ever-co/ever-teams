import { ComponentConfig } from "../../types";

export const cardConfig: ComponentConfig = {
  type: 'basic-card',
  label: 'Basic Card',
  category: 'Card',
  content: '<div data-gjs-type="basic-card"></div>',
  defaults: {
    tagName: 'div',
    attributes: { 'data-component': 'BasicCard' },
    draggable: '*',
    droppable: true,
    traits: [
      {
        type: 'text',
        label: 'Title',
        name: 'title',
        changeProp: 1
      },
      {
        type: 'text',
        label: 'Subtitle',
        name: 'subtitle',
        changeProp: 1
      },
      {
        type: 'text',
        label: 'Icon',
        name: 'icon',
        changeProp: 1
      }
    ]
  },
  mapping: {
		importPath: '@ever-teams/atoms',
		componentName: 'BasicCard',
		category: 'CARD',
		inputs: {
			name: 'InputBasicCard',
			importPath: '@ever-teams/atoms'
		}
	}
};
