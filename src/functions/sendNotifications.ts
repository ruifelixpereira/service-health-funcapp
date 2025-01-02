import { app, InvocationContext, output } from "@azure/functions";

import { DefaultLogger, SystemLogger } from '../common/logger';
import { ServiceHealthImpact, HtmlNotification, EmailNotification } from "../common/interfaces";
import { KeyVaultManager } from "../controllers/keyvault.manager";
import { formatNotification } from "../controllers/notifications";
import { sendMail } from "../controllers/email";
import { EmailError, Email429Error, _getString } from "../common/apperror";
import { QueueManager } from "../controllers/queue.manager";

const notificationBlobOutput = output.storageBlob({
    path: 'health-notifications-history/n-{DateTime}-{rand-guid}.html',
    connection: 'AzureWebJobsStorage'
});

const failedEmailQueueOutput = output.storageQueue({
    queueName: 'failed-email',
    connection: 'AzureWebJobsStorage'
});


export async function sendNotifications(queueItem: ServiceHealthImpact, context: InvocationContext): Promise<void> {
    //context.log('Storage queue notifications function processed work item:', queueItem);

    SystemLogger.setLogger(new DefaultLogger(true));

    let notification: HtmlNotification;
    let mailNotification: EmailNotification;
    try {
        // Format notification
        notification = formatNotification(queueItem);

        //
        // Send notification mail to Application owners
        //
        if (process.env.OUTPUT_SEND_MAIL === "true") {

            // Get keys from keyvault
            const kvManager = new KeyVaultManager();
            const emailEndpoint = await kvManager.readSecret("servicehealth-email-endpoint"); // "https://<resource-name>.communication.azure.com";
            const emailSenderAddress = await kvManager.readSecret("servicehealth-email-sender-address");
            const emailTestOnlyRecipient = await kvManager.readSecret("servicehealth-email-test-only-recipient");

            // TODO: Prepare list of recipients: get application owners e-mails from tags
            // For now let's just send to a test recipient
            // const emailRecipients = await getAppOwnersEmails(healthEvents);
            const emailRecipients = [emailTestOnlyRecipient];

            // Send mail
            mailNotification = {
                senderAddress: emailSenderAddress,
                recipients: emailRecipients,
                subject: queueItem.issue.summary,
                notification: notification
            }
            await sendMail(emailEndpoint, mailNotification);
        }

        // Store notification in archive
        context.extraOutputs.set(notificationBlobOutput, notification.bodyHtml);

    } catch (err) {

        // Check id error is related to Tags, ServiceNow or other
        if (err instanceof Email429Error) {
            // Look at the retry-after and define visibilityTimeout for the message
            const retryAfter = err.retryInfo.retryAfter;
            const queueManager = new QueueManager(process.env.AzureWebJobsStorage || "", 'retry-email');
            await queueManager.sendMessage(JSON.stringify(mailNotification), retryAfter);
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

app.storageQueue('sendNotifications', {
    queueName: 'notifications',
    connection: 'AzureWebJobsStorage',
    extraOutputs: [
        notificationBlobOutput,
        failedEmailQueueOutput
    ],
    handler: sendNotifications
});
