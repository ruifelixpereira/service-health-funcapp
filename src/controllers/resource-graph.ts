// Azure authentication library
import { DefaultAzureCredential } from "@azure/identity";

// Resource Graph
import { ResourceGraphClient } from "@azure/arm-resourcegraph";

import { ServiceHealthIssue, ServiceHealthImpact } from "../common/interfaces";



// All active Service Health events (1)
/*
ServiceHealthResources
| where type =~ 'Microsoft.ResourceHealth/events'
| extend eventType = properties.EventType, status = properties.Status, description = properties.Title, trackingId = properties.TrackingId, summary = properties.Summary, priority = properties.Priority, impactStartTime = properties.ImpactStartTime, impactMitigationTime = properties.ImpactMitigationTime
| where (eventType in ('HealthAdvisory', 'SecurityAdvisory', 'PlannedMaintenance') and impactMitigationTime > now()) or (eventType == 'ServiceIssue' and status == 'Active')
*/

// All active service issue events (2)
/*
ServiceHealthResources
| where type =~ 'Microsoft.ResourceHealth/events'
| extend eventType = properties.EventType, status = properties.Status, description = properties.Title, trackingId = properties.TrackingId, summary = properties.Summary, priority = properties.Priority, impactStartTime = properties.ImpactStartTime, impactMitigationTime = properties.ImpactMitigationTime
| where eventType == 'ServiceIssue' and status == 'Active'
*/

// Confirmed impacted resources (3)
/*
ServiceHealthResources
| where type == "microsoft.resourcehealth/events/impactedresources"
| extend TrackingId = split(split(id, "/events/", 1)[0], "/impactedResources", 0)[0]
| extend p = parse_json(properties)
| project subscriptionId, TrackingId, resourceName= p.resourceName, resourceGroup=p.resourceGroup, resourceType=p.targetResourceType, details = p, id
*/


// All active planned maintenance events (4)
/*
ServiceHealthResources
| where type =~ 'Microsoft.ResourceHealth/events'
| extend eventType = properties.EventType, status = properties.Status, description = properties.Title, trackingId = properties.TrackingId, summary = properties.Summary, priority = properties.Priority, impactStartTime = properties.ImpactStartTime, impactMitigationTime = todatetime(tolong(properties.ImpactMitigationTime))
| where eventType == 'PlannedMaintenance' and impactMitigationTime > now()
*/
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
/*
resources
| project resource = tolower(id)
| join kind=inner (
	maintenanceresources
	| where type == "microsoft.maintenance/updates"
	| extend p = parse_json(properties)
	| mvexpand d = p.value
	| where d has 'notificationId' and d.notificationId == '8LP4-DW8'
	| project resource = tolower(name), status = d.status
) on resource
|project resource, status
*/
export async function getPlannedMaintenanceImpactedResources(credential: DefaultAzureCredential, issues: Array<ServiceHealthIssue>): Promise<Array<ServiceHealthImpact>> {

    const clientGraph = new ResourceGraphClient(credential);

    const impactedResources = await Promise.all(issues.map(async (issue) => {
        const result = await clientGraph.resources(
            {
                query: `resources
                | project resource = tolower(id), tags
                | join kind=inner (
                    maintenanceresources
                    | where type == "microsoft.maintenance/updates"
                    | extend p = parse_json(properties)
                    | mvexpand d = p.value
                    | where d has 'notificationId' and d.notificationId == '${issue.trackingId}'
                    | project resource = tolower(name), status = d.status
                ) on resource
                | project resource, status, tags`
            },
            { resultFormat: "table" }
        );

        const impacted: ServiceHealthImpact = {
            issue: issue,
            resources: result.data
        };
        
        return impacted;
    }));

    return impactedResources;
};
