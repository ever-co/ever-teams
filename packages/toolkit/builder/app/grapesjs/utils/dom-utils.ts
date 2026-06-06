export const createContainer = (id: string): HTMLElement => {
    const container = document.createElement('div');
    container.id = id;
    return container;
  };
  
  export const escapeName = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  };
  
  export const validateElement = (el: HTMLElement | null, componentId: string): HTMLElement => {
    if (!el) {
      throw new Error(`Element not found for component ${componentId}`);
    }
    return el;
  };
  
  export const clearChildNodes = (element: HTMLElement): void => {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  };
