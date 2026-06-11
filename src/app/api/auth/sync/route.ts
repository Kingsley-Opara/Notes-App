export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '@/app/lib/dynamodb';
import { verifyCloudflareToken } from '@/app/lib/cloudflare-auth';

const TABLE = process.env.DYNAMODB_TABLE_NAME!;

export async function POST(req: NextRequest) {
  // Get the Cloudflare JWT from the cookie
  const token = req.cookies.get('CF_Authorization')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the token and extract user info
  const user = await verifyCloudflareToken(token);

  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  try {
    // Check if user already exists in DynamoDB
    const existing = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { email: user.email },
      })
    );

    if (!existing.Item) {
      // ✅ New user — save them to DynamoDB (this is the signup moment)
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

      return NextResponse.json({
        status: 'created',
        message: 'New user registered',
        email: user.email,
      });
    }

    // Returning user — just update lastLogin
    await dynamo.send(
      new PutCommand({
        TableName: TABLE,
        Item: {
          ...existing.Item,
          lastLogin: new Date().toISOString(),
        },
      })
    );

    return NextResponse.json({
      status: 'existing',
      message: 'User logged in',
      email: user.email,
    });

  } catch (error) {
    console.error('DynamoDB error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

