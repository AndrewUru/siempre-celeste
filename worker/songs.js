import seed from '../src/data/songs.json';

export const seedSongs = new Map(seed.map(song => [song.slug, song]));
const voices = new Set(['Sobreprimos', 'Primos', 'Primos lisos', 'Primos altos', 'Segundos', 'Bajos', 'Coro completo', 'Contracanto']);
const reserved = new Set(['api', 'audio', 'editar', 'ficha', 'guia', 'signin-with-chatgpt', 'signout-with-chatgpt', 'callback']);

export class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function invalid(message) {
  throw new RequestError(400, message);
}

function text(value, maximum, label, required = true) {
  if (typeof value !== 'string' || value.length > maximum || (required && !value.trim())) {
    invalid('Revisa el campo «' + label + '».');
  }
  return value;
}

function driveFileId(value) {
  let url;
  try { url = new URL(value); } catch { return null; }
  if (url.origin !== 'https://drive.google.com' || url.username || url.password) return null;
  if (url.pathname === '/open') return url.searchParams.get('id');
  return url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/(?:view|preview|edit)?)?\/?$/)?.[1];
}

function validateFile(file, originals) {
  if (!file || typeof file !== 'object') invalid('Grabación no válida.');
  const id = text(file.id, 160, 'archivo');
  if (!/^[\w-]+$/.test(id) || driveFileId(text(file.url, 2048, 'enlace')) !== id) {
    invalid('Usa el enlace de un archivo de Google Drive.');
  }
  const original = originals.get(id);
  const type = file.type;
  if (!['audio', 'video'].includes(type) && (!original || type !== original.type)) {
    invalid('Formato de archivo no válido.');
  }
  const name = text(file.name, 200, 'nombre de la grabación').trim();
  const voice = file.voice || null;
  if (voice !== null && !voices.has(voice)) invalid('Cuerda desconocida.');
  if (file.src != null && file.src !== original?.src) invalid('La pista local no corresponde a este archivo.');
  const result = { id, name, type, voice, url: file.url };
  if (original?.src) result.src = original.src;
  return result;
}

export function validateSong(input, fixedSlug) {
  if (!input || typeof input !== 'object') invalid('Faltan los datos de la canción.');
  const title = text(input.title, 160, 'título').trim();
  const proposed = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100).replace(/-$/, '');
  const slug = fixedSlug || (reserved.has(proposed) ? proposed + '-cancion' : proposed);
  if (!slug) invalid('El título debe contener letras o números.');
  if (input.slug && input.slug !== slug) invalid('La dirección de la canción no puede cambiar.');
  const seedSong = seedSongs.get(slug);
  const originals = new Map(seedSong?.files.map(file => [file.id, file]) || []);
  if (!Array.isArray(input.files) || input.files.length > 250) invalid('Lista de grabaciones no válida.');
  const files = input.files.map(file => validateFile(file, originals));
  if (new Set(files.map(file => file.id)).size !== files.length) invalid('Hay grabaciones repetidas.');
  const song = { slug, title, folderId: seedSong?.folderId || '', lyrics: text(input.lyrics, 80000, 'letra', false), files };
  if (seedSong?.lyricsSource) song.lyricsSource = seedSong.lyricsSource;
  return song;
}
