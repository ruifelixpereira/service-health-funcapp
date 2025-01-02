import { app, InvocationContext, output } from "@azure/functions";

import { DefaultLogger, SystemLogger } from '../common/logger';
import { EmailError, Email429Error } from "../common/apperror";
import { EmailNotification } from "../common/interfaces";
import { QueueManager } from "../controllers/queue.manager";
import { KeyVaultManager } from "../controllers/keyvault.manager";
import { sendMail } from "../controllers/email";


const notificationBlobOutput = output.storageBlob({
    path: 'health-notifications-history/n-{DateTime}-{rand-guid}.html',
    connection: 'AzureWebJobsStorage'
});

const failedEmailQueueOutput = output.storageQueue({
    queueName: 'failed-email',
    connection: 'AzureWebJobsStorage'
});

export async function retryEmails(queueItem: EmailNotification, context: InvocationContext): Promise<void> {
    //context.log('Storage queue retry-email function processed work item:', queueItem);

    SystemLogger.setLogger(new DefaultLogger(true));

    try {
            // Get keys from keyvault
            const kvManager = new KeyVaultManager();
            const emailEndpoint = await kvManager.readSecret("servicehealth-email-endpoint");

            // Send mail
            const email = await sendMail(emailEndpoint, queueItem);

            // 3. Store notification in archive
            context.extraOutputs.set(notificationBlobOutput, queueItem);

    } catch (err) {

        // Check id error is related to Tags, ServiceNow or other
        if (err instanceof Email429Error) {
            // Look at the retry-after and define visibilityTimeout for the message
            const retryAfter = err.retryInfo.retryAfter;
            const queueManager = new QueueManager(process.env.AzureWebJobsStorage || "", 'retry-email');
            await queueManager.sendMessage(JSON.stringify(queueItem), retryAfter);
        }
        else if (err instanceof EmailError) {
            context.extraOutputs.set(failedEmailQueueOutput, err.message);
        }
        else {
            context.error(err);
            // This rethrown exception will only fail the individual invocation, instead of crashing the whole process
            throw err;
        }
    }
}

app.storageQueue('retryEmails', {
    queueName: 'retry-email',
    connection: 'AzureWebJobsStorage',
    extraOutputs: [
        notificationBlobOutput, 
        failedEmailQueueOutput
    ],
    handler: retryEmails
});
