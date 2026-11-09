import { RequestError, seedSongs, validateSong } from './songs.js';

function json(value, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function readSong(db, slug) {
  const row = await db.prepare('SELECT content, revision FROM songs WHERE slug = ?').bind(slug).first();
  if (row) return { song: JSON.parse(row.content), revision: row.revision };
  const seed = seedSongs.get(slug);
  if (seed) return { song: seed, revision: 0 };
  throw new RequestError(404, 'Esta canción no existe.');
}

async function readInput(request) {
  if (!request.headers.get('oai-authenticated-user-id')?.trim()) {
    throw new RequestError(401, 'Inicia sesión para editar el cancionero.');
  }
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    throw new RequestError(403, 'El guardado debe hacerse desde el cancionero.');
  }
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type') || '')) {
    throw new RequestError(415, 'El contenido debe enviarse como JSON.');
  }
  // Stream the body so the limit also applies to chunked requests.
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, 'Faltan los datos de la canción.');
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 512000) {
      await reader.cancel();
      throw new RequestError(413, 'La canción supera el tamaño máximo.');
    }
    body += decoder.decode(value, { stream: true });
  }
  try {
    const result = JSON.parse(body + decoder.decode());
    if (result && typeof result === 'object') return result;
  } catch {}
  throw new RequestError(400, 'No se han podido leer los datos de la canción.');
}

async function writeSong(request, db, slug) {
  const input = await readInput(request);
  const song = validateSong(input.song, slug);
  const create = !slug;
  let changed;
  if (create) {
    if (seedSongs.has(song.slug)) throw new RequestError(409, 'Ya existe una canción con ese título.');
    changed = await db.prepare('INSERT INTO songs (slug, content, revision) VALUES (?, ?, 1) ON CONFLICT(slug) DO NOTHING')
      .bind(song.slug, JSON.stringify(song)).run();
  } else {
    if (!Number.isSafeInteger(input.revision) || input.revision < 0) throw new RequestError(400, 'Falta la revisión de la canción.');
    await readSong(db, slug);
    if (input.revision === 0 && seedSongs.has(slug)) {
      changed = await db.prepare('INSERT INTO songs (slug, content, revision) VALUES (?, ?, 1) ON CONFLICT(slug) DO NOTHING')
        .bind(slug, JSON.stringify(song)).run();
    } else {
      changed = await db.prepare('UPDATE songs SET content = ?, revision = revision + 1 WHERE slug = ? AND revision = ?')
        .bind(JSON.stringify(song), slug, input.revision).run();
    }
  }
  if (!changed.meta.changes) throw new RequestError(409, create ? 'Ya existe una canción con ese título.' : 'Otra persona ha guardado cambios.');
  return json({ slug: song.slug, revision: create ? 1 : input.revision + 1 }, create ? 201 : 200);
}

async function api(request, db, pathname) {
  const route = /^\/api\/songs(?:\/([a-z0-9]+(?:-[a-z0-9]+)*))?\/?$/.exec(pathname);
  if (!route) throw new RequestError(404, 'La dirección no existe.');
  if (!db) throw new RequestError(503, 'La base de datos no está disponible.');
  const slug = route[1];
  if (request.method === 'GET') {
    if (slug) return json(await readSong(db, slug));
    const { results } = await db.prepare('SELECT content FROM songs ORDER BY rowid').all();
    const catalog = new Map(seedSongs);
    for (const row of results) {
      const song = JSON.parse(row.content);
      catalog.set(song.slug, song);
    }
    return json([...catalog.values()]);
  }
  if ((slug && request.method === 'PUT') || (!slug && request.method === 'POST')) {
    return writeSong(request, db, slug);
  }
  throw new RequestError(405, 'Método no admitido.');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await api(request, env.DB, url.pathname);
      const response = await env.ASSETS.fetch(request);
      const slug = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(url.pathname)?.[1];
      if (response.status !== 404 || !slug || !['GET','HEAD'].includes(request.method)) return response;
      await readSong(env.DB, slug);
      const shell = await env.ASSETS.fetch(new Request(new URL('/ficha/', url), request));
      const headers = new Headers(shell.headers);
      headers.set('Cache-Control', 'no-store');
      return new Response(shell.body, { status: shell.status, headers });
    } catch (error) {
      if (error instanceof RequestError) return json({ error: error.message }, error.status);
      console.error('Cancionero:', error.message);
      return json({ error: 'No se pudo acceder al cancionero. Inténtalo de nuevo.' }, 503);
    }
  },
};
