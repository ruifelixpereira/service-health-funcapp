import { ServiceHealthImpact } from "../common/interfaces";


export async function getNotificationEmailRecipients(healthEvent: ServiceHealthImpact, additionalRecipients: string[]): Promise<string[]> {

    // TODO: To be customized according to the specific org context
    // Prepare list of recipients: e.g., get application owners e-mails from tags
    // For now let's just send to a test recipient that comes in the additionalRecipients parameter.
    //const emailRecipients = [emailConfig.testOnlyRecipient];
    return additionalRecipients;
}
