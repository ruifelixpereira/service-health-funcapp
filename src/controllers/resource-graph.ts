// Azure authentication library
import { DefaultAzureCredential } from "@azure/identity";

// Resource Graph
import { ResourceGraphClient } from "@azure/arm-resourcegraph";

import { ServiceHealthIssue, ImpactedResource, ImpactedSubscription } from "../common/interfaces";


// All active service issue events (TODO)
/*
ServiceHealthResources
| where type =~ 'Microsoft.ResourceHealth/events'
| extend eventType = properties.EventType, eventSubType = properties.EventSubType, status = properties.Status, description = properties.Title, trackingId = properties.TrackingId, summary = properties.Summary, priority = properties.Priority, impactStartTime = properties.ImpactStartTime, impactMitigationTime = properties.ImpactMitigationTime
| where eventType == 'ServiceIssue' and status == 'Active'
*/

// All active planned maintenance and health advisory events
export async function getActiveHealthAdvisoryEvents(credential: DefaultAzureCredential): Promise<Array<ServiceHealthIssue>> {

    const clientGraph = new ResourceGraphClient(credential);

    const result = await clientGraph.resources(
        {
            query: `ServiceHealthResources
            | where type =~ 'Microsoft.ResourceHealth/events'
            | extend eventType = properties.EventType, eventSubType = properties.EventSubType, status = properties.Status, description = properties.Title, trackingId = properties.TrackingId, summary = properties.Summary, priority = properties.Priority, impactStartTime = todatetime(tolong(properties.ImpactStartTime)), impactMitigationTime = todatetime(tolong(properties.ImpactMitigationTime)), lastUpdateTime = todatetime(tolong(properties.LastUpdateTime)), platformInitiated = properties.PlatformInitiated
            | where eventType in ('HealthAdvisory', 'PlannedMaintenance') and impactMitigationTime > now()
            | summarize max(lastUpdateTime) by tostring(trackingId), tostring(eventType), tostring(eventSubType), tostring(description), tostring(summary), tostring(status), impactStartTime, impactMitigationTime, tostring(platformInitiated)`
        },
        { resultFormat: "table" }
    );

    return result.data;
};


// Confirmed impacted resources
export async function getHealthAdvisoryImpactedResources(credential: DefaultAzureCredential, issues:string): Promise<Array<ImpactedResource>> {

    const clientGraph = new ResourceGraphClient(credential);

    const result = await clientGraph.resources(
        {
            query: `ServiceHealthResources
            | where type == "microsoft.resourcehealth/events/impactedresources"
            | extend trackingId = split(split(id, "/events/", 1)[0], "/impactedResources", 0)[0]
            | where trackingId in (${issues})
            | extend p = parse_json(properties)
            | project subscriptionId, trackingId, tostring(tags), name=p.resourceName, resourceGroup=p.resourceGroup, type=p.targetResourceType, resourceId=p.targetResourceId, status=p.status`
        },
        { resultFormat: "table" }
    );

    return result.data;
};


// All active planned maintenance events
export async function getActivePlannedMaintenanceEvents(credential: DefaultAzureCredential): Promise<Array<ServiceHealthIssue>> {

    const clientGraph = new ResourceGraphClient(credential);

    const result = await clientGraph.resources(
        {
            query: `ServiceHealthResources
            | where type =~ 'Microsoft.ResourceHealth/events'
            | extend eventType = properties.EventType, status = properties.Status, description = properties.Title, trackingId = properties.TrackingId, summary = properties.Summary, priority = properties.Priority, impactStartTime = todatetime(tolong(properties.ImpactStartTime)), impactMitigationTime = todatetime(tolong(properties.ImpactMitigationTime)), lastUpdateTime = todatetime(tolong(properties.LastUpdateTime)), platformInitiated = properties.PlatformInitiated
            | where eventType == 'PlannedMaintenance' and impactMitigationTime > now()
            | project trackingId, description, summary, status, impactStartTime, impactMitigationTime, lastUpdateTime, platformInitiated`
        },
        { resultFormat: "table" }
    );

    return result.data;
};



// Get impacted resources for a specific planned maintenance event
export async function getPlannedMaintenanceImpactedResources(credential: DefaultAzureCredential, issues:string): Promise<Array<ImpactedResource>> {

    const clientGraph = new ResourceGraphClient(credential);

    const result = await clientGraph.resources(
        {
            query: `resources
            | project resource = tolower(id), name, tags, type, resourceGroup, subscriptionId
            | join kind=inner (
                maintenanceresources
                | where type == "microsoft.maintenance/updates"
                | extend p = parse_json(properties)
                | mvexpand d = p.value
                | where d has 'notificationId' and d.notificationId in (${issues})
                | project resource = tolower(name), status = d.status, trackingId = d.notificationId
            ) on resource
            | project resourceId = resource, name, type, status, trackingId, resourceGroup, subscriptionId, tostring(tags)`
        },
        { resultFormat: "table" }
    );

    return result.data;
};

// Get impacted subscriptions
export async function getImpactedSubscriptions(credential: DefaultAzureCredential, issues:string): Promise<Array<ImpactedSubscription>> {

    const clientGraph = new ResourceGraphClient(credential);

    const result = await clientGraph.resources(
        {
            query: `ServiceHealthResources
            | where type =~ 'Microsoft.ResourceHealth/events'
            | extend trackingId = properties.TrackingId
            | where trackingId in (${issues})
            | join kind=inner (
                resourcecontainers
                | where type == 'microsoft.resources/subscriptions'
                | project subscriptionId, subscriptionName = name)
                on subscriptionId
            | project trackingId, id = subscriptionId, name = subscriptionName`
        },
        { resultFormat: "table" }
    );

    return result.data;
};
