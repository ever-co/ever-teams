export type EditorEventType =
  | 'load'
  | 'component:add'
  | 'component:remove'
  | 'component:update'
  | 'style:update'
  | 'canvas:update'
  | 'block:add'
  | 'block:remove';

export interface EditorEvent {
  type: EditorEventType;
  target?: any;
  detail?: any;
  timestamp: number;
}

export interface ComponentEvent extends EditorEvent {
  component: any;
  componentId: string;
  changes?: Record<string, any>;
}

export type EventCallback = (event: EditorEvent) => void;

export interface EventEmitter {
  on: (event: EditorEventType, callback: EventCallback) => void;
  off: (event: EditorEventType, callback: EventCallback) => void;
  emit: (event: EditorEventType, data?: any) => void;
}
