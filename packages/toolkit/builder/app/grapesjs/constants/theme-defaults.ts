export const DEFAULT_THEME_CONFIG = {
    colors: {
      primary: {
        light: '#FF1CF7',
        dark: '#BD00B8'
      },
      secondary: {
        light: '#00F0FF',
        dark: '#009EAD'
      },
      background: {
        light: '#FFFFFF',
        dark: '#1A1A1A'
      },
      text: {
        light: '#1E1E1E',
        dark: '#F8F8F2'
      },
      border: {
        light: '#E5E7EB',
        dark: '#2D2D2D'
      }
    },
    spacing: {
      padding: '20px',
      borderRadius: '6px'
    },
    typography: {
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: '14px',
      lineHeight: '1.6'
    },
    editor: {
      canvas: {
        background: '#FFFFFF',
        checkerboard: true
      },
      sidebar: {
        width: '280px'
      }
    }
  }
  
  export const THEME_CLASSES = {
    editor: 'gjs-editor',
    canvas: 'gjs-canvas',
    preview: 'gjs-preview',
    styles: {
      oneBackground: 'gjs-one-bg',
      twoColor: 'gjs-two-color',
      threeBackground: 'gjs-three-bg',
      fourColor: 'gjs-four-color'
    }
  }
