import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceHealthImpact, HtmlNotification } from "../common/interfaces";

import { format } from "date-fns/format";

const currentDate: Date = new Date();
const formattedDate: string = format(currentDate, 'dd/MM/yyyy HH:mm');
console.log(formattedDate); // Output: 01/05/2024 06:10


export function formatNotification(impactedResources: ServiceHealthImpact): HtmlNotification {


    const recipients = ""; //filteredTechLeads.map((lead) => lead?.email);

    // Prepare data
    const data = {
        eventSummary: impactedResources.issue.description,
        eventType: impactedResources.issue.eventType,
        lastUpdate: format(impactedResources.issue.max_lastUpdateTime, 'dd/MM/yyyy HH:mm'),
        startTime: format(impactedResources.issue.impactStartTime, 'dd/MM/yyyy HH:mm'),
        endTime: format(impactedResources.issue.impactMitigationTime, 'dd/MM/yyyy HH:mm'),
        trackingId: impactedResources.issue.trackingId,
        summary: impactedResources.issue.summary,
        impactedResources: impactedResources.resources,
        impactedSubscriptions: impactedResources.subscriptions,
        generationDate: format(impactedResources.issue.max_lastUpdateTime, 'dd/MM/yyyy HH:mm'),
        portalLink: (impactedResources.issue.eventType == "PlannedMaintenance") ? "https://portal.azure.com/#view/Microsoft_Azure_Health/AzureHealthBrowseBlade/~/plannedMaintenance" : "https://portal.azure.com/#view/Microsoft_Azure_Health/AzureHealthBrowseBlade/~/otherAnnouncements"
    }

    const bodyText = impactedResources.issue.description;

    // Helper to format tags
    Handlebars.registerHelper('joinTags', function (tags: Array<string>) {
        return tags.join(", ");
    })

    // Load the template
    const template = Handlebars.compile(fs.readFileSync(path.resolve(__dirname, "../templates/notification.hbs"), "utf8"));
    const bodyHtml = template(data);

    const notification: HtmlNotification = {
        bodyHtml: bodyHtml,
        bodyText: bodyText
    }

    return notification;
};
