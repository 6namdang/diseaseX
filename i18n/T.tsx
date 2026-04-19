import { Fragment } from 'react';
import { useT } from './LanguageContext';

interface TProps {
  children: string;
}

/**
 * Drop-in wrapper for English source strings. Use inside `<Text>`:
 *
 *   <Text style={styles.title}><T>Field desk</T></Text>
 *
 * Renders the source text immediately, then auto-translates to the active
 * language and swaps the value in.
 */
export function T({ children }: TProps) {
  const text = useT(children);
  return <Fragment>{text}</Fragment>;
}
