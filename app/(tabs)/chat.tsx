/**
 * Chat tab route. Thin shim that picks the right implementation based on
 * where the app is running:
 *
 *   • Expo Go (StoreClient execution environment) — no custom native modules
 *     are linked, so the on-device RAG stack (llama.rn + react-native-fs)
 *     would fail to load. We render {@link ../../components/chat/ChatStub}
 *     instead, which explains the limitation without crashing the app.
 *
 *   • Dev build / production / bare workflow — the custom native modules are
 *     linked, so we render the full chat experience at
 *     {@link ../../components/chat/ChatFull}.
 *
 * This is a `require()`-based shim on purpose: `require` is evaluated at
 * runtime, so the branch we don't take is never executed, which means the
 * native modules inside ChatFull's dependency graph are never touched under
 * Expo Go. Metro still bundles both branches (its static analysis sees both
 * `require(...)` calls with literal strings), which is the desired behaviour
 * for a dev build.
 */

import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { ComponentType } from 'react';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const ChatScreen: ComponentType = isExpoGo
  ? (require('../../components/chat/ChatStub').default as ComponentType)
  : (require('../../components/chat/ChatFull').default as ComponentType);

export default ChatScreen;
