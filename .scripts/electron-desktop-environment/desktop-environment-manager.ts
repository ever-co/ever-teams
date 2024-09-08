import { DesktopEnvirontmentContentFactory } from './desktop-environtment-content-factory';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import * as path from 'path';
import * as fs from 'fs';
import { env } from '../env';
import { IDesktopEnvironment } from './intefaces/i-desktop-environment';

const argv: any = yargs(hideBin(process.argv)).argv;


export class DesktopEnvironmentManager {
    private static _instance: DesktopEnvironmentManager;
    private readonly desktop: string;
    private readonly fileDir: string;
    private readonly fileName: string;
    private readonly isProd: boolean;

    private constructor() {
        console.log(argv);
        this.desktop = String(argv.desktop);
        this.isProd = argv.environment === 'prod';
        this.fileName = 'config';
        this.fileDir = path.join('apps', this.desktop, 'src', 'configs');
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
                path.join(
                    this.instance.fileDir,
                    this.instance.fileName.concat(`.ts`)
                )
            )
        ) {
            return require(path.join(
                '..',
                '..',
                this.instance.fileDir,
                this.instance.fileName
            )).config;
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
        const files = ['config.ts'];
        const environment: Partial<IDesktopEnvironment> = Object.assign({}, env);

        for (const file of files) {
            const isProd = file === 'config.ts';
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
            export const config = {
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
