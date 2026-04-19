/**
 * expo-sqlite bootstrapping. The DB is opened via SQLiteProvider at
 * `app/_layout.tsx` using {@link initDatabase} as onInit. A migrate-and-wipe
 * one-shot runs on first open to drop any legacy JSON profile/history files
 * left behind by the pre-SQLite RAGService (per user spec: wipe on migrate).
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import RNFS from 'react-native-fs';
import { MIGRATIONS, SCHEMA_SQL, SCHEMA_VERSION } from './schema';

const LEGACY_FILES = [
  `${RNFS.DocumentDirectoryPath}/user_profile.json`,
  `${RNFS.DocumentDirectoryPath}/chat_history.json`,
];

export const DATABASE_NAME = 'diseasex.db';

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  const current = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  );
  const version = current?.user_version ?? 0;

  if (version === 0) {
    await db.execAsync(SCHEMA_SQL);
    await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    await wipeLegacyFiles();
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

async function wipeLegacyFiles(): Promise<void> {
  await Promise.all(
    LEGACY_FILES.map(async (p) => {
      try {
        if (await RNFS.exists(p)) await RNFS.unlink(p);
      } catch {
        // best-effort cleanup only
      }
    }),
  );
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
