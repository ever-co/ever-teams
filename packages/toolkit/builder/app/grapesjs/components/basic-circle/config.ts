import { ComponentConfig } from "../../types";

export const progressCircleConfig: ComponentConfig = {
  type: 'basic-progress-circle',
  label: 'Progress Circle',
  category: 'Progress',
  content: '<div data-gjs-type="basic-progress-circle"></div>',
  image: '/img/progress.png',
  defaults: {
    tagName: 'div',
    attributes: { 
      'data-basic-progress-circle': 'BasicProgressCircle',
      'data-stroke-width': '10',
      'data-duration': '500',
      'style': 'width: 100px;'
    },
    draggable: '*',
    droppable: true,
    traits: [
      {
        type: 'number',
        label: 'Stroke Width',
        name: 'strokeWidth',
        default: 10,
        changeProp: 1
      },
      {
        type: 'number',
        label: 'Animation Duration',
        name: 'duration',
        default: 500,
        changeProp: 1
      }
    ]
  },
  mapping: {
    importPath: '@ever-teams/atoms',
    componentName: 'BasicProgressCircle',
    category: 'PROGRESS',
    inputs: {
      name: 'InputBasicProgressCircle',
      importPath: '@ever-teams/atoms'
    }
  }
}; 
