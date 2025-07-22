import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

// Explicit credential configuration (SDK v3 format)
const eventBridgeClient = new EventBridgeClient({
  region:'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


export const publishEvent = async (detailType, detail) => {
  try {
    console.log(`📤 Publishing event: ${detailType}`);
    
    const command = new PutEventsCommand({
      Entries: [{
        Source: 'insyd.social',
        DetailType: detailType,
        Detail: JSON.stringify({
          ...detail,
          timestamp: new Date().toISOString(),
          eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }),
        EventBusName: 'insyd-notification-bus'
      }]
    });

    const result = await eventBridgeClient.send(command);
    
    if (result.FailedEntryCount > 0) {
      throw new Error(`EventBridge failed: ${JSON.stringify(result.Entries)}`);
    }

    console.log(`✅ Event published successfully: ${detailType}`);
    return { success: true, messageId: result.Entries[0].EventId };

  } catch (error) {
    console.error(`❌ EventBridge publish failed:`, error);
    return { success: false, error: error.message };
  }
};
