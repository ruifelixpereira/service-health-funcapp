import { app, InvocationContext, Timer, output } from "@azure/functions";

// Azure authentication library
import { DefaultAzureCredential } from "@azure/identity";

import { ServiceHealthImpact } from "../common/interfaces";
import { getActiveHealthAdvisoryEvents, getHealthAdvisoryImpactedResources, getPlannedMaintenanceImpactedResources, getImpactedSubscriptions } from "../controllers/resource-graph";


const notificationsQueueOutput = output.storageQueue({
    queueName: 'notifications',
    connection: 'AzureWebJobsStorage'
});

const reportBlobOutput = output.storageBlob({
    path: 'health-reports/r-{DateTime}-{rand-guid}.json',
    connection: 'AzureWebJobsStorage'
});


export async function getHealthEvents(myTimer: Timer, context: InvocationContext): Promise<void> {

    context.log('Timer function getHealthEvents trigger request.');

    try {
        // Azure SDK clients accept the credential as a parameter
        const credential = new DefaultAzureCredential();

        // Get health events
        const healthEvents = await getActiveHealthAdvisoryEvents(credential);

        // Get tracking IDs for planned maintenance events
        const pmTrackingIds = healthEvents.filter(event => event.eventType === 'PlannedMaintenance').reduce((acc, event) => acc + `"${event.trackingId}",`, "");

        // Get impacted resources for planned maintenance events
        let maintenanceImpactedResources = []
        if (pmTrackingIds.length > 0) {
            maintenanceImpactedResources = await getPlannedMaintenanceImpactedResources(credential, pmTrackingIds.substring(0, pmTrackingIds.length - 1));
        }

        // Get tracking IDs for health advisory events
        const heTrackingIds = healthEvents.filter(event => event.eventType === 'HealthAdvisory').reduce((acc, event) => acc + `"${event.trackingId}",`, "");

        // Get impacted resources for health advisory events
        let healthImpactedResources = [];
        if (heTrackingIds.length > 0) {
            healthImpactedResources = await getHealthAdvisoryImpactedResources(credential, heTrackingIds.substring(0, heTrackingIds.length - 1));
        }

        // Map impacted resources to health events
        let impactedResources: ServiceHealthImpact[] = [];
        healthEvents.forEach(event => {

            if (event.eventType === 'HealthAdvisory') {
                const resources = healthImpactedResources.filter(resource => resource.trackingId === event.trackingId);

                const impacted: ServiceHealthImpact = {
                    issue: event,
                    resources: resources,
                    subscriptions: []
                };

                impactedResources.push(impacted);
            }
            else if (event.eventType === 'PlannedMaintenance') {
                const resources = maintenanceImpactedResources.filter(resource => resource.trackingId === event.trackingId);

                const impacted: ServiceHealthImpact = {
                    issue: event,
                    resources: resources,
                    subscriptions: []
                };

                impactedResources.push(impacted);
            }
        });

        // Complement impacted subscriptions when there are no impacted resources

        // Get tracking IDs for health events without resources
        const nrTrackingIds = impactedResources.filter(event => event.resources.length == 0).reduce((acc, event) => acc + `"${event.issue.trackingId}",`, "");

        // Get impacted subscriptions for health events
        let impactedSubscriptions = [];
        if (nrTrackingIds.length > 0) {
            impactedSubscriptions = await getImpactedSubscriptions(credential, nrTrackingIds.substring(0, nrTrackingIds.length - 1));
        }

        // Map impacted subscriptions to health events
        impactedResources.forEach(event => {
            const subscriptions = impactedSubscriptions.filter(subscription => subscription.trackingId === event.issue.trackingId);
            event.subscriptions = subscriptions;
        });

        if (impactedResources.length > 0) {
            // Trigger notifications for impacted resources using Storage Queue
            context.extraOutputs.set(notificationsQueueOutput, impactedResources);

            // Trigger consolidated report with all impacted resources using Storage Blob
            context.extraOutputs.set(reportBlobOutput, impactedResources);
        }

    } catch (err) {
        context.error(err);
        // This rethrown exception will only fail the individual invocation, instead of crashing the whole process
        throw err;
    }
}

app.timer('getHealthEvents', {
    schedule: '0 59 23 * * *', // every day at 23:59
    extraOutputs: [
        notificationsQueueOutput,
        reportBlobOutput
    ],
    handler: getHealthEvents
});
