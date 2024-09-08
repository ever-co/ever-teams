import { DesktopEnvirontmentContentFactory } from './desktop-environtment-content-factory';
import { Argv } from 'yargs';
import * as path from 'path';
import * as fs from 'fs';
import { env } from '../env';
import { IDesktopEnvironment } from './intefaces/i-desktop-environment';


export class DesktopEnvironmentManager {
    private static _instance: DesktopEnvironmentManager;
    private readonly desktop: string;
    private readonly fileDir: string;
    private readonly fileName: string;
    private readonly isProd: boolean;

    private constructor() {
        this.desktop = String(env.DESKTOP);
        this.fileDir = path.join(__dirname, '..', '..', 'environments');
        this.fileName = 'desktop-environment.ts';
        this.isProd = env.NODE_ENV === 'production';
    }


    private static get instance(): DesktopEnvironmentManager {
        if (!this._instance) {
            this._instance = new DesktopEnvironmentManager();
        }
        return this._instance;
    }

    public static get environment(): any {
        if (
            fs.existsSync(
                path.join(this.instance.fileDir, this.instance.fileName)
            )
        ) {
            return require(path.join(
                this.instance.fileDir,
                this.instance.fileName
            )).environment;
        }
        return null;
    }

    public static update(): void {
        const environment: IDesktopEnvironment = Object.assign(
            {},
            this.environment
        );
        const filePath = path.join(
            this.instance.fileDir,
            this.instance.fileName.concat('.ts')
        );

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            fs.writeFileSync(
                filePath,
                this.instance.content(environment, this.instance.isProd)
            );
            return;
        }
        console.log(`WARNING: File ${filePath} does not exist`);
    }

    public static generate(): void {
        const files = ['desktop-environment.ts', 'desktop-environment.prod.ts'];
        const environment: Partial<IDesktopEnvironment> = Object.assign({}, env);

        for (const file of files) {
            const isProd = file === 'desktop-environment.prod.ts';
            const filePath = path.join(this.instance.fileDir, file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            fs.writeFileSync(
                filePath,
                this.instance.content(environment, isProd)
            );

            `✔ Generated desktop ${isProd} environment file: ${filePath}`
        }
    }


    private content(variable: Partial<IDesktopEnvironment>, isProd: boolean): string {
        return `
            export const environment = {
                production: ${isProd},
                ${DesktopEnvirontmentContentFactory.generate(
            this.desktop,
            variable
        )}
            };
        `;
    }
}

DesktopEnvironmentManager.update();
