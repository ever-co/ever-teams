export enum GrapesJSErrorType {
    INITIALIZATION = 'INITIALIZATION',
    COMPONENT_REGISTRATION = 'COMPONENT_REGISTRATION',
    COMPONENT_REMOVAL = 'COMPONENT_REMOVAL',
    THEME_ERROR = 'THEME_ERROR',
    RENDERING = 'RENDERING',
    EXPORT_ERROR = 'EXPORT_ERROR',
    STYLE_ERROR = 'STYLE_ERROR',
    INVALID_CONFIG = 'INVALID_CONFIG',
    UNKNOWN = 'UNKNOWN'
  }
  
  export const ERROR_MESSAGES = {
    [GrapesJSErrorType.INITIALIZATION]: 'Failed to initialize editor',
    [GrapesJSErrorType.COMPONENT_REGISTRATION]: 'Failed to register component',
    [GrapesJSErrorType.COMPONENT_REMOVAL]: 'Failed to remove component',
    [GrapesJSErrorType.THEME_ERROR]: 'Theme configuration error',
    [GrapesJSErrorType.RENDERING]: 'Component render error',
    [GrapesJSErrorType.EXPORT_ERROR]: 'Export operation failed',
    [GrapesJSErrorType.STYLE_ERROR]: 'Style application error',
    [GrapesJSErrorType.INVALID_CONFIG]: 'Invalid configuration provided',
    [GrapesJSErrorType.UNKNOWN]: 'Unknown error occurred'
  }
