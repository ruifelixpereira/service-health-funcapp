import { app, InvocationContext } from "@azure/functions";

import { DefaultLogger, SystemLogger } from '../common/logger';
import { ServiceHealthImpact } from "../common/interfaces";
import { _getString } from "../common/apperror";


//
// TODO: To be customized if needed
//
export async function sendNotificationsOther(queueItem: ServiceHealthImpact, context: InvocationContext): Promise<void> {
    //context.log('Storage queue notifications function processed work item:', queueItem);

    SystemLogger.setLogger(new DefaultLogger(true));

    try {
        context.log('Sending Other notification is not implemented.');

    } catch (err) {

        context.error(err);
        // This rethrown exception will only fail the individual invocation, instead of crashing the whole process
        throw err;
    }
}

app.storageQueue('sendNotificationsOther', {
    queueName: 'notifications-other',
    connection: 'AzureWebJobsStorage',
    extraOutputs: [
    ],
    handler: sendNotificationsOther
});
