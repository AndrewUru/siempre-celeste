import { mkdir, readFile, writeFile } from 'node:fs/promises';

const songs = JSON.parse(await readFile('src/data/songs.json', 'utf8'));
const directory = 'dist/client/data';
await mkdir(directory, { recursive: true });
await writeFile(directory + '/songs.json', JSON.stringify(songs));
for (const song of songs) {
  await writeFile(directory + '/' + song.slug + '.json', JSON.stringify({ song, revision: 0 }));
}
