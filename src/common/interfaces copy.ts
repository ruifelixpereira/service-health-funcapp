
export interface CostInsightsRequest {
    subscriptionId: string;
    timeFrom: string;
    timeTo: string;
}


/*
Example:
  { "average": 304.85,
    "change": -150.15,
    "changePercent": -49.25,
    "status": "existing",
    "id": "/subscriptions/c9ef8f8a-e305-4fee-a85d-f3dfebf832f1/resourceGroups/mdugc-prd-mrgn-databricks-mdugc-03",
    "percentOfTotal": 0.575 }
*/
export interface ResourceGroupCostInsights {
    average: number;
    change: number;
    changePercent: number;
    id: string;
    percentOfTotal: number;
}

export interface CostInsightsAnomaly {
    eventDate: string;
    periodStart: string;
    periodEnd: string;
    timeDetected: string;
    insights: ResourceGroupCostInsights;
}

export interface ResourceGroupTags {
    id: string;
    name: string;
    app: string;
    alias: string;
    bu: string;
    state: string;
    owner: string;
}

export interface CmdbApplicationDetails {
    name: string;
    acronym: string;
    techLeadId: string;
    backupTechLeadId?: string;
};

export interface CmdbTechLeadDetails {
    name: string;
    email: string;
    userName: string;
};

export interface CmdbApplicationTechLeads {
    name: string;
    acronym: string;
    techLead: CmdbTechLeadDetails;
    backupTechLead?: CmdbTechLeadDetails;
};

export interface EmailNotification {
    app: string,
    recipients: string[];
    subject: string;
    bodyHtml: string;
    bodyText: string;
};

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

export interface SnowOptions {
    url: string;
    user: string;
    pwd: string;
}

export interface AzureClientCredentials {
    tenantId: string;
    clientId: string;
    clientSecret: string;
}