import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { ServiceHealthImpact, HtmlNotification } from "../common/interfaces";


export function formatNotification(impactedResources: ServiceHealthImpact): HtmlNotification {


    const recipients = ""; //filteredTechLeads.map((lead) => lead?.email);

    // Prepare data
    const data = {
        plannedMaintenanceSummary: impactedResources.issue.description,
        lastUpdate: impactedResources.issue.lastUpdateTime,
        startTime: impactedResources.issue.impactStartTime,
        endTime: impactedResources.issue.impactMitigationTime,
        trackingId: impactedResources.issue.trackingId,
        summary: impactedResources.issue.summary,
        impactedResources: impactedResources.resources,
        generationDate: impactedResources.issue.lastUpdateTime,
        portalLink: "https://portal.azure.com/#view/Microsoft_Azure_Health/AzureHealthBrowseBlade/~/plannedMaintenance"
    }

    const bodyText = impactedResources.issue.description;

    // Load the template
    const template = Handlebars.compile(fs.readFileSync(path.resolve(__dirname, "../templates/notification.hbs"), "utf8"));
    const bodyHtml = template(data);

    const notification: HtmlNotification = {
        bodyHtml: bodyHtml,
        bodyText: bodyText
    }

    return notification;
};
