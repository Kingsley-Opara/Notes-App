import { NextRequest, NextResponse } from 'next/server';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '@/app/lib/dynamodb';
import { verifyCloudflareToken } from '@/app/lib/cloudflare-auth';

const TABLE = process.env.DYNAMODB_NOTES_TABLE!;

export async function GET(req: NextRequest) {
  const token = req.cookies.get('CF_Authorization')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await verifyCloudflareToken(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.toLowerCase().trim();

  if (!query) {
    return NextResponse.json({ notes: [] });
  }

  try {
    // Fetch all user's notes then filter — DynamoDB doesn't support full text search natively
    const result = await dynamo.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: 'userEmail-index',
        KeyConditionExpression: 'userEmail = :email',
        ExpressionAttributeValues: {
          ':email': user.email,
        },
      })
    );

    const allNotes = result.Items ?? [];

    // Filter by title or content containing the search query
    const filtered = allNotes.filter(note =>
      note.title?.toLowerCase().includes(query) ||
      note.content?.toLowerCase().includes(query)
    );

    return NextResponse.json({ notes: filtered });

  } catch (error) {
    console.error('🔴 Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}