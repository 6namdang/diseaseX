/**
 * expo-sqlite bootstrapping. The DB is opened via SQLiteProvider at
 * `app/_layout.tsx` using {@link initDatabase} as onInit. A migrate-and-wipe
 * one-shot runs on first open to drop any legacy JSON profile/history files
 * left behind by the pre-SQLite RAGService (per user spec: wipe on migrate).
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import RNFS from 'react-native-fs';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema';

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

  // Future migrations append here: if (version < 2) { ... }
  if (version < SCHEMA_VERSION) {
    // Single schema version today — just bump.
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
