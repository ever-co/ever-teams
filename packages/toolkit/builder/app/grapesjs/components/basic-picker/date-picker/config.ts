import { ComponentConfig, ComponentTrait } from '../../../types';

const traits: ComponentTrait[] = [
  {
    type: 'checkbox',
    label: 'Show Icon',
    name: 'icon',
    changeProp: 1,
    default: true
  },
  {
    type: 'text',
    label: 'Placeholder',
    name: 'placeholder',
    changeProp: 1,
    default: 'Pick a date'
  }
];

export const basicDatePickerConfig: ComponentConfig = {
  type: 'basic-datepicker',
  label: 'Date Picker',
  category: 'Date',
  content: '<div data-gjs-type="basic-datepicker"></div>',
  image: '/img /datepicker.png',
  defaults: {
    tagName: 'div',
    attributes: {
      'data-component': 'BasicDatePicker',
      'data-readonly': 'false',
      'data-variant': 'default',
      'data-size': 'default',
      'data-format': 'DD/MM/YYYY'
    },
    draggable: '*',
    droppable: false,
    traits
  },
  mapping: {
    importPath: '@ever-teams/atoms',
    componentName: 'BasicDatePicker',
    category: 'DATE',
    inputs: {
      name: 'InputBasicDatePicker',
      importPath: '@ever-teams/atoms'
    }
  }
};
