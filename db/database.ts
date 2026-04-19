/**
 * expo-sqlite bootstrapping. The DB is opened via SQLiteProvider at
 * `app/_layout.tsx` using {@link initDatabase} as onInit.
 *
 * This module is intentionally free of any non-Expo native module imports so
 * the root layout can load cleanly under the Expo Go client (which does not
 * bundle custom native modules like llama.rn or react-native-fs). Persistent
 * state for the app lives entirely in SQLite; pre-SQLite JSON artifacts, if
 * any existed, are left alone on disk (they are unreferenced and harmless).
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { MIGRATIONS, SCHEMA_SQL, SCHEMA_VERSION } from './schema';

export const DATABASE_NAME = 'diseasex.db';

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  const current = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const version = current?.user_version ?? 0;

  if (version === 0) {
    await db.execAsync(SCHEMA_SQL);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    return;
  }

  // Replay any missing migration blocks, in order.
  for (let v = version + 1; v <= SCHEMA_VERSION; v++) {
    const sql = MIGRATIONS[v];
    if (sql) await db.execAsync(sql);
  }
  if (version < SCHEMA_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
}

/**
 * Wipe all user-owned rows so the app returns to the welcome flow. Schema
 * and pragmas are preserved; only data is removed.
 */
export async function wipeAllData(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM assessment_photo;
      DELETE FROM assessment;
      DELETE FROM escalation;
      DELETE FROM chat_message;
      DELETE FROM smear;
      DELETE FROM patient;
    `);
  });
}
