import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGIONS!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_IDS!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEYS!,
  },
});

export const dynamo = DynamoDBDocumentClient.from(client);