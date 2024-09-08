
import { IDesktopEnvironment } from './intefaces/i-desktop-environment';
import { CommonEnvironmentContent } from './concrete-environment-content/common-environment-content';
import { DesktopServerWebEnvironmentContent } from './concrete-environment-content/desktop-server-web-environment-content';

export class DesktopEnvirontmentContentFactory {
    public static generate(
        desktop: string,
        environtment: Partial<IDesktopEnvironment>
    ) {
        const common = new CommonEnvironmentContent();
        switch (desktop) {
            case 'server-web':
                const desktopServerWeb = new DesktopServerWebEnvironmentContent();
                return `
                    ${common.generate(environtment)}
                    ${desktopServerWeb.generate(environtment)}
                `;
            default:
                return `
                    ${common.generate(environtment)}
                `;
        }
    }
}
