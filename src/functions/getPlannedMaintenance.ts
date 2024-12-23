import { app, InvocationContext, Timer, output } from "@azure/functions";

// Azure authentication library
import { DefaultAzureCredential } from "@azure/identity";

import { getActivePlannedMaintenanceEvents, getPlannedMaintenanceImpactedResources } from "../controllers/resource-graph";


const notificationsQueueOutput = output.storageQueue({
    queueName: 'notifications',
    connection: 'AzureWebJobsStorage'
});


export async function getPlannedMaintenance(myTimer: Timer, context: InvocationContext): Promise<void> {

    context.log('Timer function getPlannedMaintenance trigger request.');

    // Azure SDK clients accept the credential as a parameter
    const credential = new DefaultAzureCredential();

    // Get planned maintence issues
    const plannedMaintenance = await getActivePlannedMaintenanceEvents(credential);

    // Get impacted resources for each issue
    const impactedResources = await getPlannedMaintenanceImpactedResources(credential, plannedMaintenance);

    // Trigger notifications for impacted resources using Storage Queue
    context.extraOutputs.set(notificationsQueueOutput, impactedResources);
}

app.timer('getPlannedMaintenance', {
    schedule: '0 */5 * * * *',
    extraOutputs: [
        notificationsQueueOutput
    ],
    handler: getPlannedMaintenance
});
