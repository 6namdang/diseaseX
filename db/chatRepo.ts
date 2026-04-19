import type { SQLiteDatabase } from 'expo-sqlite';
import type { ChatMessage, ChatMessageRow, ChatRole } from './types';

function rowToMessage(r: ChatMessageRow): ChatMessage {
  return {
    id: r.id,
    createdAt: r.created_at,
    role: r.role,
    content: r.content,
    thinking: r.thinking,
  };
}

export async function insertChatMessage(
  db: SQLiteDatabase,
  role: ChatRole,
  content: string,
  thinking: string | null = null,
): Promise<ChatMessage> {
  const now = Date.now();
  const res = await db.runAsync(
    'INSERT INTO chat_message (created_at, role, content, thinking) VALUES (?, ?, ?, ?)',
    [now, role, content, thinking],
  );
  return {
    id: res.lastInsertRowId,
    createdAt: now,
    role,
    content,
    thinking,
  };
}

export async function listChatMessages(
  db: SQLiteDatabase,
  limit = 100,
): Promise<ChatMessage[]> {
  const rows = await db.getAllAsync<ChatMessageRow>(
    `SELECT * FROM (
      SELECT * FROM chat_message ORDER BY created_at DESC LIMIT ?
     ) ORDER BY created_at ASC`,
    [limit],
  );
  return rows.map(rowToMessage);
}

export async function clearChatHistory(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM chat_message');
}
