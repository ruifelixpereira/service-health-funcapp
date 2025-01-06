# Customizations

## Configure how to collect email notifications recipients addresses

You can edit the file `src/controllers/customEmailRecipients.ts` and implement the function `getNotificationEmailRecipients`. This is the default implementation:

```typescript
export async function getNotificationEmailRecipients(healthEvent: ServiceHealthImpact, additionalRecipients: string[]): Promise<string[]> {

    // TODO: To be customized according to the specific org context
    // Prepare list of recipients: e.g., get application owners e-mails from tags
    // For now let's just send to a test recipient that comes in the additionalRecipients parameter.
    //const emailRecipients = [emailConfig.testOnlyRecipient];
    return additionalRecipients;
}
```

## Configure notification senders

Currently there are 4 types of notification senders supported: `email`, `itsm`, `devops` and `other`. Only the `email` sender is implemented.


### Implement ITSM sender

Edit file `src/functions/sendNotificationsItsm.ts` and implement the function `sendNotificationsItsm`. This is the default implementation:

```typescript
//
// TODO: To be customized if needed
//
export async function sendNotificationsItsm(queueItem: ServiceHealthImpact, context: InvocationContext): Promise<void> {
    //context.log('Storage queue notifications function processed work item:', queueItem);

    SystemLogger.setLogger(new DefaultLogger(true));

    try {
        context.log('Sending ITSM notification is not implemented.');

    } catch (err) {

        context.error(err);
        // This rethrown exception will only fail the individual invocation, instead of crashing the whole process
        throw err;
    }
}
```

You need to add the key `itsm` to the comma-separated list value of the environment variable `NOTIFICATION_SENDERS`. For example, if you want to send notifications to ITSM and email, you should set the environment variable `NOTIFICATION_SENDERS` to `itsm,email`.


### Implement DevOps sender

Edit file `src/functions/sendNotificationsDevops.ts` and implement the function `sendNotificationsDevops`. This is the default implementation:

```typescript
//
// TODO: To be customized if needed
//
export async function sendNotificationsDevops(queueItem: ServiceHealthImpact, context: InvocationContext): Promise<void> {
    //context.log('Storage queue notifications function processed work item:', queueItem);

    SystemLogger.setLogger(new DefaultLogger(true));

    try {
        context.log('Sending DevOps notification is not implemented.');

    } catch (err) {

        context.error(err);
        // This rethrown exception will only fail the individual invocation, instead of crashing the whole process
        throw err;
    }
}
```

You need to add the key `devops` to the comma-separated list value of the environment variable `NOTIFICATION_SENDERS`. For example, if you want to send notifications to DevOps and email, you should set the environment variable `NOTIFICATION_SENDERS` to `devops,email`.


### Implement Other sender

Edit file `src/functions/sendNotificationsOther.ts` and implement the function `sendNotificationsOther`. This is the default implementation:

```typescript
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
```

You need to add the key `other` to the comma-separated list value of the environment variable `NOTIFICATION_SENDERS`. For example, if you want to send notifications to DevOps and email, you should set the environment variable `NOTIFICATION_SENDERS` to `other,email`.
