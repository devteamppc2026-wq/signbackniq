const $ = id => document.getElementById(id);
const key = location.pathname.split('/').filter(Boolean).at(-1);
const video = $('screen-video');
const storyVideo = $('story-video');
const image = $('story-image');
const ticker = $('tv-ticker');
const tickerText = $('tv-ticker-text');
const tickerTrack = $('tv-ticker-track');
const [tickerPrimary, tickerRepeat] = tickerTrack.children;
const tickerPixelsPerSecond = 48;
const headlineSeparator = '\u2003\u2002•\u2002\u2003';
const clock = new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', hour: 'numeric', minute: '2-digit' });
let feed, serverOffset = 0, currentStoryId = null, currentVideoId = null;
let slideUntil = 0, position = 0, failedVideoUrl = '';

function sizeTicker() {
  const width = tickerText.getBoundingClientRect().width;
  if (!width) return;
  const count = Math.max(1, Math.ceil(ticker.clientWidth / width));
  const copy = () => {
    const item = document.createElement('span');
    item.className = 'tv-ticker-item';
    item.textContent = tickerText.textContent;
    item.setAttribute('aria-hidden', 'true');
    return item;
  };
  tickerPrimary.replaceChildren(tickerText, ...Array.from({ length: count - 1 }, copy));
  tickerRepeat.replaceChildren(...Array.from({ length: count }, copy));
  const seconds = Math.max(5, (count * width) / tickerPixelsPerSecond);
  tickerTrack.style.setProperty('--ticker-duration', seconds + 's');
}
const tickerObserver = new ResizeObserver(sizeTicker);
tickerObserver.observe(ticker);
tickerObserver.observe(tickerText);

function setVideo(element, url) {
  if (element.getAttribute('src') === url) return;
  element.pause();
  if (url) {
    element.src = url;
    element.muted = true;
    void element.play().catch(() => {});
  } else {
    element.removeAttribute('src');
    element.load();
  }
}

function render() {
  const at = Date.now() + serverOffset;
  $('clock').textContent = clock.format(at);
  if (!feed) return;

  $('screen-name').textContent = feed.screen.name;
  const tickerMessage = (feed.settings.ticker?.trim() || '')
    .replace(/\s*(?:•|[\r\n])\s*/gu, headlineSeparator);
  ticker.hidden = !tickerMessage;
  if (tickerText.textContent !== tickerMessage) {
    tickerText.textContent = tickerMessage;
    sizeTicker();
  }
  const slot = feed.activeVideo;
  const playingSlot = slot && Date.parse(slot.startsAt) <= at && Date.parse(slot.endsAt) > at &&
    slot.videoUrl !== failedVideoUrl;
  if (playingSlot) {
    $('story').hidden = true;
    $('screen-status').hidden = true;
    video.hidden = false;
    if (currentVideoId !== slot.id) {
      currentVideoId = slot.id;
      if (video.readyState > 0) video.currentTime = 0;
    }
    setVideo(storyVideo, null);
    setVideo(video, slot.videoUrl);
    return;
  }
  if (currentVideoId !== null) {
    currentVideoId = null;
    currentStoryId = null;
  }
  const stories = feed.news.filter(item => item.category === 'union' &&
    (!item.startsAt || Date.parse(item.startsAt) <= at) && (!item.endsAt || Date.parse(item.endsAt) > at));
  const current = stories.findIndex(item => item.id === currentStoryId);
  if (current < 0 || at >= slideUntil) {
    position = current < 0 ? position % Math.max(1, stories.length) : (current + 1) % stories.length;
    const next = stories[position];
    currentStoryId = next?.id ?? null;
    slideUntil = at + (next?.slideSeconds ?? feed.settings.slideSeconds) * 1000;
  } else {
    position = current;
  }
  const story = stories[position];
  video.hidden = true;
  setVideo(video, null);
  const storyVideoUrl = story?.videoUrl && story.videoUrl !== failedVideoUrl ? story.videoUrl : null;
  storyVideo.hidden = !storyVideoUrl;
  setVideo(storyVideo, storyVideoUrl);
  $('story').hidden = !story;
  $('screen-status').hidden = !!story;
  if (story) {
    $('story-title').textContent = story.title;
    $('story-body').textContent = story.body;
    $('story-body').hidden = !story.body;
    if (!storyVideoUrl && story.imageUrl && image.getAttribute('src') !== story.imageUrl) {
      image.hidden = false;
      image.src = story.imageUrl;
    } else if (!story.imageUrl) {
      image.hidden = true;
      image.removeAttribute('src');
    }
  } else {
    $('screen-status').textContent = 'مفيش أخبار معروضة دلوقتي.';
  }
}

for (const element of [video, storyVideo]) {
  element.addEventListener('error', () => {
    failedVideoUrl = element.getAttribute('src') || '';
    setTimeout(() => { failedVideoUrl = ''; }, 60_000);
    render();
  });
}
image.addEventListener('error', () => { image.hidden = true; });

async function refresh() {
  try {
    const response = await fetch('/api/screens/' + encodeURIComponent(key) + '/feed', {
      cache: 'no-store', signal: AbortSignal.timeout(5000),
    });
    if (response.status === 404) {
      feed = undefined;
      $('story').hidden = video.hidden = ticker.hidden = true;
      setVideo(video, null);
      setVideo(storyVideo, null);
      $('screen-status').hidden = false;
      $('screen-status').textContent = 'الشاشة دي مش مسجلة.';
    } else if (response.ok) {
      feed = await response.json();
      serverOffset = Date.parse(feed.serverTime) - Date.now();
      render();
    } else if (!feed) {
      $('screen-status').textContent = 'تعذّر تحميل الشاشة. بنحاول تاني…';
    }
  } catch {
    if (!feed) $('screen-status').textContent = 'تعذّر الاتصال بالخادم. بنحاول تاني…';
  } finally {
    setTimeout(refresh, 3000);
  }
}

render();
setInterval(render, 250);
void refresh();
