import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWSS_REGIONS!,
  credentials: {
    accessKeyId: process.env.AWSS_ACCESS_KEY_IDS!,
    secretAccessKey: process.env.AWSS_SECRET_ACCESS_KEYS!,
  },
});

export const dynamo = DynamoDBDocumentClient.from(client);