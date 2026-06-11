export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '@/app/lib/dynamodb';
import { verifyCloudflareToken } from '@/app/lib/cloudflare-auth';
import { randomUUID } from 'crypto';

const TABLE = process.env.DYNAMODB_NOTES_TABLE!;

// ── Helper: get verified user from request ─────────────────────
async function getUser(req: NextRequest) {
  const token = req.cookies.get('CF_Authorization')?.value;
  if (!token) return null;
  return await verifyCloudflareToken(token);
}

// ── GET /api/notes — fetch all notes for logged in user ────────
export async function GET(req: NextRequest) {
  const user = await getUser(req);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await dynamo.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'userEmail-index',       // GSI we created
        KeyConditionExpression: 'userEmail = :email',
        ExpressionAttributeValues: {
          ':email': user.email,
        },
        ScanIndexForward: false,            // newest first
      })
    );

    return NextResponse.json({
      notes: result.Items ?? [],
    });

  } catch (error) {
    console.error('🔴 GET notes error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// ── POST /api/notes — create a new note ───────────────────────
export async function POST(req: NextRequest) {
  const user = await getUser(req);

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const newNote = {
      usersnoteId: randomUUID(),               // unique ID for this note
      userEmail: user.email,              // links note to user
      title,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dynamo.send(
      new PutCommand({
        TableName: TABLE,
        Item: newNote,
      })
    );

    console.log('✅ Note created for:', user.email);
    return NextResponse.json({ note: newNote }, { status: 201 });

  } catch (error) {
    console.error('🔴 POST note error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}