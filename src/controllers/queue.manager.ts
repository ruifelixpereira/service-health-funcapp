// Storage queues
import { QueueServiceClient } from "@azure/storage-queue"

import { StorageQueueError, _getString } from "../common/apperror";


export class QueueManager {

    private queueServiceClient: QueueServiceClient;
    private queueName: string;

    constructor(storageConnectionString: string, queue: string) {
        this.queueServiceClient = QueueServiceClient.fromConnectionString(storageConnectionString);
        this.queueName = queue;
    }

    public async sendMessage(message: string, visibilityTimeout?: number): Promise<void> {

        try {
            const queueClient = await this.queueServiceClient.getQueueClient(this.queueName);

            // Ensure the queue is created
            await queueClient.create();

            const msg = Buffer.from(message, 'utf8').toString('base64');

            // Message visibility timeout
            if (visibilityTimeout) {
                const dequeueSettings = {
                    visibilityTimeout: visibilityTimeout
                };
                await queueClient.sendMessage(msg, dequeueSettings);
            }
            else {
                await queueClient.sendMessage(msg);
            }
        } catch (error) {
            const message = `Unable to send message to queue '${this.queueName}' with error: ${_getString(error)}`;
            throw new StorageQueueError(message);
        }

    }

}