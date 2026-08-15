import { TabsProps } from "../../../types";
import Prism from 'prismjs';
import { processComponents } from '@/utils/component-parser';

export const createTabs = ({ tabs, colors, isDark, formatCode }: TabsProps) => {
  const tabsContainer = document.createElement('div');
  tabsContainer.style.cssText = `
    display: flex;
    gap: 4px;
    padding: 4px;
    background: ${isDark ? '#2a2a2a' : '#c6c6c6'};
    border-radius: 6px;
    margin-bottom: 16px;
    flex-shrink: 0;
  `;

  const previewContainer = document.createElement('div');
  previewContainer.style.cssText = `
    flex: 1;
    background: ${isDark ? '#131313' : '#f0f0f0'};
    border-radius: 8px;
    border: 1px solid ${colors.border};
    overflow-y: auto;
    position: relative;
    padding: 16px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 12px;
    line-height: 1.4;
  `;

  const prismTheme = `
    .token.comment { color: #6a9955; }
    .token.string { color: #ce9178; }
    .token.number { color: #b5cea8; }
    .token.keyword { color: #569cd6; }
    .token.function { color: #dcdcaa; }
    .token.property { color: #9cdcfe; }
    .token.operator { color: #d4d4d4; }
    .token.punctuation { color: #d4d4d4; }
    .token.tag { color: #569cd6; }
    .token.attr-name { color: #9cdcfe; }
    .token.attr-value { color: #ce9178; }
    .token.selector { color: #d7ba7d; }
    .token.class-name { color: #4ec9b0; }
  `;

  const formatCodeWithTheme = (code: string, language: string) => {
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.className = `language-${language}`;
    codeEl.textContent = code;

    const style = document.createElement('style');
    style.textContent = prismTheme;
    document.head.appendChild(style);

    pre.style.cssText = `
      margin: 0;
      padding: 20px;
      height: 100%;
      overflow: auto;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 12px;
      line-height: 1.4;
      background: ${isDark ? '#131313' : '#f0f0f0'} !important;
      color: ${isDark ? colors.text : '#1a1a1a'} !important;
      border-radius: 6px;
    `;

    pre.appendChild(codeEl);
    Prism.highlightElement(codeEl);
    return pre;
  };

  tabs.forEach(({ label, code, language }, idx) => {
    const tab = createTab({
      label,
      code,
      language,
      idx,
      colors,
      isDark,
      formatCode: formatCodeWithTheme,
      tabsContainer,
      previewContainer
    });
    tabsContainer.appendChild(tab);
  });

  // Set initial content with formatting
  const initialCode = formatCodeByLanguage(tabs[0].code, tabs[0].language);
  previewContainer.appendChild(formatCodeWithTheme(initialCode, tabs[0].language));

  return { tabsContainer, previewContainer };
};

const formatCodeByLanguage = (code: string, language: string): string => {
  switch (language) {
    case 'html':
      // Process components to React JSX
      code = processComponents(code);
      return code
        .replace(/>\s*</g, '>\n<')  // Add line break between tags
        .replace(/(<[^>]*>)/g, match => match.trim())
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => '  ' + line)
        .join('\n');
    case 'css':
      // Filter out box-sizing rule before any processing
      const rules = code.split('}').filter(rule => {
        const trimmedRule = rule.trim();
        return !(trimmedRule.includes('*') && trimmedRule.includes('box-sizing: border-box'));
      }).join('}');

      // Then normalize the CSS
      const normalizedCSS = rules
        .replace(/\s+/g, ' ')
        .replace(/\{\s+/g, '{')
        .replace(/\s+\}/g, '}')
        .replace(/;\s+/g, ';')
        .replace(/:\s+/g, ':')
        .replace(/,\s+/g, ',')
        .replace(/buttonhover/g, 'button:hover')
        .replace(/buttonactive/g, 'button:active')
        .replace(/:global\((.*?)\)/g, '$1');

      // Split into rules and filter duplicates
      const rulesArray = normalizedCSS
        .split('}')
        .filter(Boolean)
        .map(rule => rule.trim())
        .filter((rule, index, self) => {
          if (rule.startsWith('body')) {
            return self.findIndex(r => r.startsWith('body')) === index;
          }
          return true;
        });

      let formattedCSS = '';
      let insideMediaQuery = false;
      let mediaQueryContent = '';

      rulesArray.forEach(rule => {
        // Handle media queries
        if (rule.includes('@media')) {
          insideMediaQuery = true;
          mediaQueryContent = rule + ' {';
          return;
        }

        if (insideMediaQuery) {
          if (rule.includes('{')) {
            mediaQueryContent += '\n  ' + rule;
          } else if (rule === '}') {
            insideMediaQuery = false;
            formattedCSS += mediaQueryContent + '\n}\n';
            mediaQueryContent = '';
          }
          return;
        }

        // Add closing brace if missing
        if (!rule.includes('{')) {
          rule += ' {';
        }
        if (!rule.endsWith('}')) {
          rule += ' }';
        }

        formattedCSS += rule + '\n';
      });

      return formattedCSS
        .split(';').join(';\n  ')
        .split('{').join(' {\n  ')
        .split('\n}').join('\n}\n')
        .trim();
    case 'javascript':
      return code
        .replace(/{\s*/g, '{\n  ')
        .replace(/;\s*/g, ';\n  ')
        .replace(/}\s*/g, '\n}\n')
        .replace(/,\s*/g, ',\n  ')
        .trim();
    default:
      return code;
  }
};

const createTab = ({
  label,
  code,
  language,
  idx,
  colors,
  isDark,
  formatCode,
  tabsContainer,
  previewContainer
}: any) => {
  const tab = document.createElement('button');
  tab.innerHTML = label;
  tab.dataset.active = idx === 0 ? 'true' : 'false';

  const defaultStyle = `
    padding: 10px 20px;
    border: none;
    color: ${isDark ? '#f0f0f0' : '#463a3c'};
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    border-radius: 4px;
    transition: all 0.2s ease;
  `;

  const activeStyle = `
    background: #1a1a1a;
    color: white;
  `;

  tab.style.cssText = `${defaultStyle}${idx === 0 ? activeStyle : ''}`;

  tab.onmouseover = () => {
    tab.style.background = '#1a1a1a';
    tab.style.color = 'white';
  };

  tab.onmouseout = () => {
    if (tab.dataset.active !== 'true') {
      tab.style.background = isDark ? '#2a2a2a' : '#c6c6c6';
      tab.style.color = isDark ? '#f0f0f0' : '#463a3c';
    } else {
      tab.style.background = '#1a1a1a';
    }
  };

  tab.onclick = () => {
    Array.from(tabsContainer.children).forEach((tabElement: any, i) => {
      tabElement.dataset.active = i === idx ? 'true' : 'false';
      tabElement.style.cssText = i === idx ? defaultStyle + activeStyle : defaultStyle;
    });

    // tab.style.background = '#1a1a1a';

    while (previewContainer.firstChild) {
      previewContainer.removeChild(previewContainer.firstChild);
    }

    const formattedCode = formatCodeByLanguage(code, language);
    previewContainer.appendChild(formatCode(formattedCode, language));
  };

  return tab;
};
