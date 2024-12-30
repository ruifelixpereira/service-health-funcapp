
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
    eventType: string;
    eventSubType: string;
    description: string;
    summary: string;
    status: string;
    impactStartTime: string;
    impactMitigationTime: string;
    max_lastUpdateTime: string;
    platformInitiated: string;
}

export interface ImpactedResource {
    resourceId: string;
    name: string;
    type: string;
    resourceGroup: string;
    subscriptionId: string;
    trackingId: string;
    status: string;
    tags?: string;
}

export interface ImpactedSubscription {
    id: string;
    name: string;
    trackingId: string;
}

export interface ServiceHealthImpact {
    issue: ServiceHealthIssue;
    resources: Array<ImpactedResource>;
    subscriptions: Array<ImpactedSubscription>;
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
