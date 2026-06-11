import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.REGIONS!,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_IDS!,
    secretAccessKey: process.env.SECRET_ACCESS_KEYS!,
  },
});

export const dynamo = DynamoDBDocumentClient.from(client);