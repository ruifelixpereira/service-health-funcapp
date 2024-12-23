
export interface Resource {
    id: string;
    name: string;
    type: string;
    location: string;
    resourceGroup: string;
    subscriptionId: string;
    tags?: Array<string>;
    rgTags?: Array<string>;
}

export interface ServiceHealthIssue {
    trackingId: string;
    description: string;
    summary: string;
    status: string;
    impactStartTime: string;
    impactMitigationTime: string;
    lastUpdateTime: string;
    platformInitiated: string;
}

export interface ImpactedResource {
    resource: string;
    status: string;
    tags?: Array<string>;
}

export interface ServiceHealthImpact {
    issue: ServiceHealthIssue;
    resources: Array<ImpactedResource>;
}

export interface MailInterface {
    from?: string;
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject: string;
    text?: string;
    html: string;
}

export interface MailServiceOptions {
    host: string;
    port: string;
    user: string;
    pwd: string;
    emailSenderAddress: string;
}

export interface HtmlNotification {
    bodyHtml: string;
    bodyText: string;
};

export interface EmailNotification {
    app: string,
    recipients: string[];
    subject: string;
    notification: HtmlNotification;
};
