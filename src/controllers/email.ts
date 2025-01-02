import { DefaultAzureCredential } from "@azure/identity";
import { EmailClient, EmailClientOptions } from "@azure/communication-email";
import { EmailError, Email429Error, _getString } from "../common/apperror";
import { EmailNotification } from "../common/interfaces";

//const connectionString = process.env["COMMUNICATION_SERVICES_CONNECTION_STRING"] || "";



const catch429Policy = {
    name: "catch429Policy",
    async sendRequest(request, next) {
        const response = await next(request);
        if (response.status === 429) {
            throw new Email429Error("Error 429 sending mail", {
                message: response.bodyAsText,
                status: response.status,
                retryAfter: parseInt(response.headers.get("retry-after"), 10)
            });
        }
        return response;
    }
};

export async function sendMail(endpoint: string, notification: EmailNotification): Promise<String> {

    return sendHtmlMail(endpoint, notification.senderAddress, notification.recipients, notification.subject, notification.notification.bodyHtml);
}

export async function sendHtmlMail(endpoint: string, senderAddress: string, to: string[], subject: string, body: string): Promise<String> {

    // Create the Email Client
    const clientOptions: EmailClientOptions = {
        additionalPolicies: [
            {
                policy: catch429Policy,
                position: "perRetry"
            }
        ]
    }
    
    //const emailClient: EmailClient = new EmailClient(connectionString, clientOptions);
    const credential = new DefaultAzureCredential();
    const emailClient = new EmailClient(endpoint, credential);

    // Prepare recipients
    let listOfRecipients = [];
    to.forEach( (element, index) => {
        const newRecipient = {
            address: element,
            displayName: `Service Health receiver ${index + 1}`
        };
        listOfRecipients.push(newRecipient);
    });

    // Create the Email Message to be sent
    const message = {
        senderAddress: senderAddress,
        content: {
            subject: subject,
            //plainText: body
            html: body
        },
        recipients: {
            to: listOfRecipients
        }
    };

    try {
        // Send the email message
        const poller = await emailClient.beginSend(message);
        const response = await poller.pollUntilDone();

        // Get the OperationId so that it can be used for tracking the message for troubleshooting
        return (response.id);

    } catch (e) {

        if (e instanceof Email429Error) {
            throw e;
        }
        else {
            const message = `Unable to send email to '${to}' with error: ${_getString(e)}`;
            throw new EmailError(message);
        }
    }
}