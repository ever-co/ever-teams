import { IContentGenerator } from '../intefaces/i-content-generator';
import { Env } from '../../env';


export class CommonEnvironmentContent implements IContentGenerator {
    public generate(variable: Partial<Env>): string {
        return `
            I18N_FILES_URL: '${variable.I18N_FILES_URL}',
        `
    }
}
