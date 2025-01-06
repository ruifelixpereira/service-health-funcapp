import { app, InvocationContext, output } from "@azure/functions";

import { DefaultLogger, SystemLogger } from '../common/logger';
import { ServiceHealthImpact, HtmlNotification, EmailNotification } from "../common/interfaces";
import { EmailError, Email429Error } from "../common/apperror";

import { QueueManager } from "../controllers/queue.manager";
import { sendMail, getEmailConfigFromEnvironment } from "../controllers/email";
import { getNotificationEmailOperRecipients } from "../controllers/customEmailRecipients";
import { formatReport } from "../controllers/reports";


const reportBlobOutput = output.storageBlob({
    path: 'health-report-history/r-{DateTime}-{rand-guid}.html',
    connection: 'AzureWebJobsStorage'
});

const failedEmailQueueOutput = output.storageQueue({
    queueName: 'failed-email',
    connection: 'AzureWebJobsStorage'
});


export async function sendReport(blob: Buffer, context: InvocationContext): Promise<void> {

    SystemLogger.setLogger(new DefaultLogger(true));

    let report: HtmlNotification;
    let mailNotification: EmailNotification;
    try {
        // Parse blob to JSON
        const healthEvents: Array<ServiceHealthImpact> = JSON.parse(blob.toString('utf-8'));

        // Format notification
        report = formatReport(healthEvents);

        //
        // Send notification mail to Application owners
        //
        const senders = process.env.NOTIFICATION_SENDERS.split(',');
        if (senders.indexOf("email") > -1) {

            // Get email keys from keyvault
            const emailConfig = await getEmailConfigFromEnvironment();

            //  Prepare list of recipients for operations
            const emailRecipients = await getNotificationEmailOperRecipients([emailConfig.testOnlyRecipient]);

            if (emailRecipients.length > 0) {
                // Send mail
                mailNotification = {
                    senderAddress: emailConfig.senderAddress,
                    recipients: emailRecipients,
                    subject: "Azure Service Health report",
                    notification: report
                }
                await sendMail(emailConfig.endpoint, mailNotification);
            }
        }

        // Store notification in archive
        context.extraOutputs.set(reportBlobOutput, report.bodyHtml);

    } catch (err) {

        if (err instanceof SyntaxError && err.message === "Unexpected end of JSON input") {
            // Ignore because it's caused by the function to fire when the blob is created and stiil not yet completely uploaded.
            return;
        }
        else if (err instanceof Email429Error) {
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

app.storageBlob('sendReport', {
    path: 'health-reports/{name}',
    connection: 'AzureWebJobsStorage',
    extraOutputs: [
        reportBlobOutput,
        failedEmailQueueOutput
    ],
    handler: sendReport,
});
