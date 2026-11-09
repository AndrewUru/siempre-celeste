import { editPath, isRecording, make, safeLink, voiceGroups, type Song, type Recording } from './catalog';

function trackButton(file: Recording, voice: string) {
  const button = make('button', undefined, 'track');
  Object.assign(button.dataset, {
    track: '', title: file.name, voice, src: safeLink(file.src) || '',
    type: file.type, link: safeLink(file.url) || '', id: file.id,
  });
  button.setAttribute('aria-pressed', 'false');
  const icon = make('span', '▶', 'play');
  icon.setAttribute('aria-hidden', 'true');
  button.append(icon, make('span', file.name));
  return button;
}

function render(main: HTMLElement, song: Song) {
  document.title = song.title + ' · Siempre Celeste';
  main.querySelector('h1')!.textContent = song.title;
  const edit = main.querySelector<HTMLAnchorElement>('[data-edit]')!;
  edit.href = editPath(song.slug);
  edit.hidden = false;
  const stanzas = song.lyrics.trim() ? song.lyrics.trim().split(/\n\s*\n/) : ['Letra pendiente de transcripción.'];
  main.querySelector('[data-verses]')!.replaceChildren(...stanzas.map(verse => make('p', verse)));

  const attachments = song.files.filter(file => !isRecording(file));
  main.querySelector<HTMLElement>('.attachments')!.hidden = attachments.length === 0;
  main.querySelector('[data-attachments]')!.replaceChildren(...attachments.map(file => {
    const link = make('a', file.name);
    const target = safeLink(file.url || file.src);
    if (target) link.href = target;
    link.target = '_blank';
    link.rel = 'noopener';
    const arrow = make('span', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    link.append(arrow);
    return link;
  }));
  const groups = voiceGroups(song.files).map(([voice, files]) => {
    const section = make('section', undefined, 'group');
    section.append(make('h3', voice), ...files.map(file => trackButton(file, voice)));
    return section;
  });
  main.querySelector('[data-groups]')!.replaceChildren(...(groups.length ? groups : [make('p', 'Todavía no hay grabaciones.')]));
  const folder = main.querySelector<HTMLAnchorElement>('[data-folder]')!;
  folder.hidden = !song.folderId;
  if (song.folderId) folder.href = 'https://drive.google.com/drive/folders/' + encodeURIComponent(song.folderId);
  main.querySelector<HTMLElement>('.columns')!.hidden = false;
  main.querySelector<HTMLElement>('[data-status]')!.hidden = true;
}

function initPlayer(main: HTMLElement) {
  const player = main.querySelector<HTMLElement>('.player')!;
  const audio = player.querySelector('audio')!;
  const video = player.querySelector('video')!;
  const frame = player.querySelector('iframe')!;
  const error = player.querySelector<HTMLElement>('[data-play-error]')!;
  const rewind = player.querySelector<HTMLButtonElement>('.rewind')!;
  const external = player.querySelector<HTMLAnchorElement>('#external-player')!;
  let active: HTMLMediaElement | null = null;
  let selected: HTMLButtonElement | null = null;

  function clear() {
    for (const element of [audio, video]) {
      element.onerror = null;
      element.pause();
      element.removeAttribute('src');
      element.load();
      element.hidden = true;
    }
    frame.removeAttribute('src');
    frame.hidden = rewind.hidden = error.hidden = true;
    active = null;
  }
  main.querySelector('[data-groups]')!.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-track]');
    if (!button) return;
    clear();
    selected?.setAttribute('aria-pressed','false');
    selected = button;
    button.setAttribute('aria-pressed','true');
    const {title, voice, src, type, link} = button.dataset;
    const target = safeLink(link);
    const direct = safeLink(src);
    const driveId = target && /^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)(?:[/?#]|$)/.exec(target)?.[1];
    player.querySelector('#current-track')!.textContent = title || '';
    player.querySelector('#current-voice')!.textContent = voice || '';
    external.hidden = !target;
    external.textContent = driveId ? 'Abrir en Drive ↗' : 'Abrir archivo ↗';
    if (target) external.href = target;
    player.hidden = false;
    document.body.classList.add('playing');
    const fallback = () => {
      clear();
      if (driveId) {
        frame.src = 'https://drive.google.com/file/d/' + encodeURIComponent(driveId) + '/preview';
        frame.hidden = false;
      } else error.hidden = false;
    };
    const source = direct || (!driveId && target);
    if (!source) { fallback(); return; }
    active = type === 'video' ? video : audio;
    active.hidden = rewind.hidden = false;
    active.onerror = fallback;
    active.src = source;
    active.play().catch(() => { /* Native controls remain available if autoplay is blocked. */ });
  });
  rewind.addEventListener('click', () => {
    if (active && Number.isFinite(active.currentTime)) active.currentTime = Math.max(0, active.currentTime - 10);
  });
  player.querySelector('.close')!.addEventListener('click', () => {
    clear();
    player.hidden = true;
    document.body.classList.remove('playing');
    selected?.setAttribute('aria-pressed', 'false');
    selected?.focus();
  });
}

export async function initDetail() {
  const main = document.querySelector<HTMLElement>('[data-detail]');
  if (!main || main.dataset.ready) return;
  main.dataset.ready = 'true';
  initPlayer(main);
  const slug = main.dataset.slug || location.pathname.split('/').filter(Boolean)[0];
  const status = main.querySelector<HTMLElement>('[data-status]')!;
  try {
    if (!slug || slug === 'ficha') throw new Error();
    const response = await fetch('/api/songs/' + encodeURIComponent(slug), {cache: 'no-store'});
    if (!response.ok) throw new Error();
    const { song } = await response.json() as { song: Song };
    if (main.isConnected) render(main, song);
  } catch {
    if (!main.dataset.slug) {
      status.hidden = false;
      status.textContent = 'No se ha podido cargar la canción. Vuelve al repertorio para elegir otra.';
    }
  }
}
