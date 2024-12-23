export class AppError extends Error {
    
    constructor(error: any) {
        const message = error instanceof Error ? error.message : error;
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }

}

export function _getString(data: any) {
    if (!data) {
      return null;
    }

    if (typeof data === 'string') {
      return data;
    }

    if (data.toString !== Object.toString) {
      return data.toString();
    }

    return JSON.stringify(data);
}

export function ensureErrorType(err: unknown): Error {
    if (err instanceof Error) {
        return err;
    } else {
        let message: string;
        if (err === undefined || err === null) {
            message = 'Unknown error';
        } else if (typeof err === 'string') {
            message = err;
        } else if (typeof err === 'object') {
            message = JSON.stringify(err);
        } else {
            message = String(err);
        }
        return new Error(message);
    }
}


export class ResourceGroupTagsError extends AppError {
    
    constructor(error: any) {
        super(error);
        Object.setPrototypeOf(this, ResourceGroupTagsError.prototype);
    }

}

export class ServiceNowError extends AppError {
    
    constructor(error: any) {
        super(error);
        Object.setPrototypeOf(this, ServiceNowError.prototype);
    }

}

export class KeyVaultError extends AppError {
    
    constructor(error: any) {
        super(error);
        Object.setPrototypeOf(this, KeyVaultError.prototype);
    }

}

export class StorageQueueError extends AppError {
    
    constructor(error: any) {
        super(error);
        Object.setPrototypeOf(this, StorageQueueError.prototype);
    }

}

export interface EmailRetryInfo {
    message: string;
    status: number;
    retryAfter: number;
}

export class EmailError extends AppError {
    
    constructor(error: any) {
        super(error);
        Object.setPrototypeOf(this, EmailError.prototype);
    }

}

export class Email429Error extends EmailError {
    
    public retryInfo: EmailRetryInfo;

    constructor(error: any, retryInfo: EmailRetryInfo) {
        super(error);
        this.retryInfo = retryInfo;
        Object.setPrototypeOf(this, Email429Error.prototype);
    }

}