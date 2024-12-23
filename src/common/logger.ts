//import chalk from'chalk';

export { DefaultLogger, SystemLogger, ILogger };

interface ILogger {
    info: (message: string) => string;
    warn: (message: string) => string;
    error: (message: any) => any;
    debug: (message: string) => string;
}

class SystemLogger {
    private static logger: ILogger | undefined = undefined;

    static setLogger(logger: ILogger | undefined): void {
        SystemLogger.logger = logger;
    }

    static info(message: string): string {
        SystemLogger.logger?.info(message);
        return message;
    }

    static warn(message: string): string {
        SystemLogger.logger?.warn(message);
        return message;
    }

    static error(message: string): string {
        SystemLogger.logger?.error(message);
        return message;
    }

    static debug(message: string): string {
        SystemLogger.logger?.debug(message);
        return message;
    }
}

const logPrefix = 'LanguageWorkerConsoleLog';

export function systemLog(message?: any, ...optionalParams: any[]) {
    console.log(logPrefix + removeNewLines(message), ...optionalParams);
}

export function systemWarn(message?: any, ...optionalParams: any[]) {
    console.warn(logPrefix + '[warn] ' + removeNewLines(message), ...optionalParams);
}

export function systemError(message?: any, ...optionalParams: any[]) {
    console.error(logPrefix + '[error] ' + removeNewLines(message), ...optionalParams);
}

function removeNewLines(message?: any): string {
    if (message && typeof message === 'string') {
        message = message.replace(/(\r\n|\n|\r)/gm, ' ');
    }
    return message;
}

class DefaultLogger {
    private debugEnabled: boolean;

    constructor(debugEnabled: boolean) {
        this.debugEnabled = debugEnabled;
    }

    info(message: string): string {
        //console.log(chalk.blue(`[${new Date().toLocaleString()}][INFO]`), typeof message ==='string'?chalk.blueBright(message):message);
        console.log(`[${new Date().toLocaleString()}][INFO] ${message}`);
        return message;
    }
    warn(message: string): string {
        //console.log(chalk.yellow(`[${new Date().toLocaleString()}][WARN]`), typeof message ==='string'?chalk.yellowBright(message):message);
        console.log(`[${new Date().toLocaleString()}][WARN] ${message}`);
        return message;
    }
    error(message: string): any {
        //console.log(chalk.red(`[${new Date().toLocaleString()}][ERROR]`), typeof message ==='string'?chalk.redBright(message):message);
        console.log(`[${new Date().toLocaleString()}][ERROR] ${message}`);
        return message;
    }
    debug(message: string): any {
        if (this.debugEnabled) {
            //console.log(chalk.blue(`[${new Date().toLocaleString()}][DEBUG]`), typeof message ==='string'?chalk.blueBright(message):message);
            console.log(`[${new Date().toLocaleString()}][DEBUG] ${message}`);
        }
        return message;
    }
};
