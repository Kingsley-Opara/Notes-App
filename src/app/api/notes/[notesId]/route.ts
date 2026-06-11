import { NextRequest, NextResponse } from 'next/server';
import { GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '@/app/lib/dynamodb';
import { verifyCloudflareToken } from '@/app/lib/cloudflare-auth';

const TABLE = process.env.DYNAMODB_NOTES_TABLE!;

async function getUser(req: NextRequest) {
  const token = req.cookies.get('CF_Authorization')?.value;
  if (!token) return null;
  return await verifyCloudflareToken(token);
}

// ── GET /api/notes/[noteId] — fetch one note ──────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { noteId: string } }
) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { noteId: params.noteId },
      })
    );

    if (!result.Item) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Make sure the note belongs to this user
    if (result.Item.userEmail !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ note: result.Item });

  } catch (error) {
    console.error('🔴 GET note error:', error);
    return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
  }
}

// ── PUT /api/notes/[noteId] — update a note ───────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: { noteId: string } }
) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First check the note exists and belongs to this user
    const existing = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { noteId: params.noteId },
      })
    );

    if (!existing.Item) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (existing.Item.userEmail !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, content } = body;

    const updatedNote = {
      ...existing.Item,
      title: title ?? existing.Item.title,
      content: content ?? existing.Item.content,
      updatedAt: new Date().toISOString(),
    };

    await dynamo.send(
      new PutCommand({
        TableName: TABLE,
        Item: updatedNote,
      })
    );

    console.log('✅ Note updated:', params.noteId);
    return NextResponse.json({ note: updatedNote });

  } catch (error) {
    console.error('🔴 PUT note error:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

// ── DELETE /api/notes/[noteId] — delete a note ────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: { noteId: string } }
) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First check the note belongs to this user
    const existing = await dynamo.send(
      new GetCommand({
        TableName: TABLE,
        Key: { noteId: params.noteId },
      })
    );

    if (!existing.Item) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    if (existing.Item.userEmail !== user.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await dynamo.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { noteId: params.noteId },
      })
    );

    console.log('✅ Note deleted:', params.noteId);
    return NextResponse.json({ message: 'Note deleted successfully' });

  } catch (error) {
    console.error('🔴 DELETE note error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}