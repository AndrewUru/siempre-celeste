export interface Recording {
  id: string;
  name: string;
  type: string;
  voice: string | null;
  url: string;
  src?: string;
}
export interface Song {
  slug: string;
  title: string;
  folderId?: string | null;
  lyrics: string;
  files: Recording[];
}

export function safeLink(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, 'https://local.invalid');
    if (url.origin === 'https://local.invalid' && value.startsWith('/')) return url.pathname + url.search;
    if (['https:', 'http:'].includes(url.protocol) && /^https?:\/\//i.test(value)) return url.href;
  } catch { /* Invalid links have no target. */ }
  return undefined;
}

export const songPath = (slug: string) => '/' + encodeURIComponent(slug) + '/';
export const editPath = (slug: string) => '/editar/?' + new URLSearchParams({ cancion: slug }).toString();
export const isRecording = (file: Recording) => file.type === 'audio' || file.type === 'video';
export const versePreview = (song: Song) => song.lyrics.trim().split(/\n/).filter(Boolean).slice(0, 3).join('\n');

export function voiceGroups(files: Recording[]) {
  const unique = new Map<string, Recording>();
  for (const file of files.filter(isRecording)) {
    const key = file.src || file.id;
    const existing = unique.get(key);
    if (!existing || (!existing.voice && file.voice)) unique.set(key, file);
    // The same take can belong to two explicitly assigned voices.
    else if (existing.voice && file.voice && existing.voice !== file.voice) unique.set(key + ':' + file.voice, file);
  }
  const grouped = new Map<string, Recording[]>();
  for (const file of unique.values()) {
    const voice = file.voice || 'Por identificar';
    if (!grouped.has(voice)) grouped.set(voice, []);
    grouped.get(voice)!.push(file);
  }
  const voices = ['Sobreprimos', 'Primos', 'Primos lisos', 'Primos altos', 'Segundos', 'Bajos', 'Coro completo'];
  const rank = (voice: string) => voice === 'Por identificar' ? 99 : voices.includes(voice) ? voices.indexOf(voice) : 90;
  return [...grouped.entries()].sort(([a], [b]) => rank(a) - rank(b));
}

export function make<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function recordingCountLabel(song: Song) {
  const count = voiceGroups(song.files).reduce((total, [, files]) => total + files.length, 0);
  return count + (count === 1 ? ' grabación' : ' grabaciones');
}
