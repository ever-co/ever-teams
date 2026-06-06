import { ComponentConfig } from "../../../types";

export const basicDateRangerConfig: ComponentConfig = {
  type: 'basic-daterange',
  label: 'Date Range',
  category: 'Date',
  content: '<div data-gjs-type="basic-daterange"></div>',
  image: '/img/daterange.png',
  defaults: {
    tagName: 'div',
    attributes: {
      'data-component': 'BasicDateRanger',
      'data-readonly': 'false',
      'data-variant': 'default',
      'data-size': 'default',
      'data-format': 'DD/MM/YYYY'
    },
    draggable: '*',
    droppable: false,
    // traits
  },
  mapping: {
    importPath: '@ever-teams/atoms',
    componentName: 'BasicDateRanger',
    category: 'DATE',
    inputs: {
      name: 'InputBasicDateRanger',
      importPath: '@ever-teams/atoms'
    }
  }
};
