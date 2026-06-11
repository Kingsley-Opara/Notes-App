import { NextRequest, NextResponse } from 'next/server';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '@/app/lib/dynamodb';
import { verifyCloudflareToken } from '@/app/lib/cloudflare-auth';

const TABLE = process.env.DYNAMODB_TABLE_NAME!;

export async function POST(req: NextRequest) {
  console.log('🔵 Sync route called');

  // 1. Read the Cloudflare cookie directly from the request
  const token = req.cookies.get('CF_Authorization')?.value;

  if (!token) {
    console.log('🔴 No CF_Authorization cookie found');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Verify the JWT
  const user = await verifyCloudflareToken(token);

  if (!user) {
    console.log('🔴 Token verification failed');
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  console.log('🟢 Token verified for:', user.email);

  try {
    // 3. Check if user exists in DynamoDB
    const existing = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { email: user.email },
      })
    );

    if (!existing.Item) {
      // 4a. New user — save to DynamoDB
      await dynamo.send(
        new PutCommand({
          TableName: TABLE,
          Item: {
            email: user.email,
            userId: user.sub,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            provider: 'cloudflare-access',
          },
        })
      );

      console.log('✅ New user saved:', user.email);
      return NextResponse.json({
        status: 'created',
        email: user.email,
      });
    }

    // 4b. Returning user — update lastLogin
    await dynamo.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          ...existing.Item,
          lastLogin: new Date().toISOString(),
        },
      })
    );

    console.log('✅ Returning user updated:', user.email);
    return NextResponse.json({
      status: 'existing',
      email: user.email,
    });

  } catch (error) {
    console.error('🔴 DynamoDB error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}