const $ = id => document.getElementById(id);
const login = $('login');
const feedback = $('feedback');
const newsForm = $('news-form');
const tickerForm = $('ticker-form');
const videoForm = $('video-form');
const screenForm = $('screen-form');
const userForm = $('user-form');
const field = (form, name) => form.elements.namedItem(name);
const value = (form, name) => field(form, name).value;
const set = (form, name, text) => { field(form, name).value = text ?? ''; };
const displayDate = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
const format = date => date ? displayDate.format(new Date(date)) : '';
const permissionLabels = {
  'news.create': 'إضافة', 'news.update': 'تعديل', 'news.archive': 'أرشفة واسترجاع', 'news.delete': 'حذف نهائي',
};
let news = [], screens = [], schedules = [], headlines = [], users = [];
let currentNews = null, currentVideo = null, currentUser = null, sessionUser = null;
let busy = false;

function message(text = '', error = false) {
  feedback.hidden = !text;
  feedback.textContent = text;
  feedback.classList.toggle('error', error);
}

function signedIn(yes) {
  login.hidden = yes;
  $('dashboard').hidden = !yes;
  $('session-actions').hidden = !yes;
  if (!yes) sessionUser = null;
}

const isAdmin = () => sessionUser?.role === 'admin';
const allowed = permission => isAdmin() || Boolean(sessionUser?.permissions.includes(permission));
const canReadNews = () => Object.keys(permissionLabels).some(allowed);

async function request(path, method = 'GET', data) {
  const headers = new Headers();
  if (method !== 'GET') {
    const cookie = document.cookie.split('; ').find(part => part.startsWith('union_csrf='));
    if (cookie) headers.set('X-CSRF-Token', cookie.slice('union_csrf='.length));
  }
  let body = data;
  if (data && !(data instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(data);
  }
  const result = await fetch('/api/' + path, { method, headers, body, cache: 'no-store' });
  if (result.status === 204) return null;
  const content = await result.json().catch(() => ({}));
  if (!result.ok) {
    if (result.status === 401) signedIn(false);
    const messages = Object.values(content.errors || {}).flat();
    const specific = messages.find(text => /[\u0600-\u06ff]/u.test(text));
    const detail = specific || content.message;
    throw new Error(typeof detail === 'string' && /[\u0600-\u06ff]/u.test(detail)
      ? detail : 'الطلب ماكملش. راجع البيانات وحاول تاني.');
  }
  return content;
}

async function run(button, action, success) {
  if (busy) return;
  busy = true;
  if (button) button.disabled = true;
  message();
  try {
    await action();
    if (success) message(success);
  } catch (error) {
    message(error instanceof TypeError ? 'الاتصال بالخادم اتقطع. جرّب تاني.' : error.message, true);
  } finally {
    busy = false;
    if (button) button.disabled = false;
  }
}

function submit(form, action, success) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    void run(event.submitter, action, success);
  });
}

function localInput(date) {
  if (!date) return '';
  const time = new Date(date);
  return new Date(time.getTime() - time.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function instant(input) { return input ? new Date(input).toISOString() : null; }
function dates(form) {
  const startsAt = instant(value(form, 'startsAt'));
  const endsAt = instant(value(form, 'endsAt'));
  if (startsAt && endsAt && startsAt >= endsAt) throw new Error('اختار نهاية بعد وقت البداية.');
  return { startsAt, endsAt };
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function action(text, callback) {
  const button = element('button', text, 'secondary');
  button.type = 'button';
  button.addEventListener('click', () => callback(button));
  return button;
}

function list(id, entries, render, empty) {
  $(id).replaceChildren(...(entries.length ? entries.map(render) : [element('li', empty, 'meta')]));
}

function renderNews() {
  const archived = $('show-archive').checked;
  list('news-list', news.filter(item => Boolean(item.archivedAt) === archived), item => {
    const row = element('li');
    const active = !item.startsAt || Date.parse(item.startsAt) <= Date.now();
    const ended = item.endsAt && Date.parse(item.endsAt) <= Date.now();
    const status = archived ? 'في الأرشيف' : item.status === 'draft' ? 'مسودة' : ended ? 'انتهى العرض' : active ? 'منشور' : 'مجدول';
    const slots = [status, item.slideSeconds ? item.slideSeconds + ' ثانية' : 'مدة الشاشة', format(item.startsAt), format(item.endsAt)].filter(Boolean);
    const controls = element('div', '', 'actions');
    if (allowed('news.update')) controls.append(action('تعديل', () => editNews(item)));
    if (allowed('news.archive')) controls.append(action(archived ? 'استرجاع' : 'أرشفة', button => run(button, async () => {
      await request('admin/news/' + item.id + (archived ? '/restore' : '/archive'), 'POST');
      await loadNews();
    }, archived ? 'الخبر رجع من الأرشيف.' : 'الخبر اتنقل للأرشيف.')));
    if (allowed('news.delete')) controls.append(action('حذف نهائي', button => {
      if (!window.confirm('متأكد إنك عايز تحذف الخبر نهائي؟')) return;
      return run(button, async () => {
        await request('admin/news/' + item.id, 'DELETE');
        if (currentNews?.id === item.id) editNews(null);
        await loadNews();
      }, 'الخبر اتحذف.');
    }));
    row.append(element('strong', item.title), element('p', slots.join(' · '), 'meta'));
    if (controls.childElementCount) row.append(controls);
    return row;
  }, archived ? 'الأرشيف فاضي.' : 'مفيش أخبار لسه.');
  if (isAdmin()) renderTicker();
}

function photoControls() {
  const attachment = currentNews?.imageUrl || currentNews?.videoUrl;
  $('photo-actions').hidden = !attachment;
  $('photo-link').href = attachment || '#';
}

function editNews(item) {
  currentNews = item ? { ...item } : null;
  newsForm.reset();
  if (item) {
    for (const name of ['title', 'body', 'slideSeconds', 'status']) set(newsForm, name, item[name]);
    for (const name of ['startsAt', 'endsAt']) set(newsForm, name, localInput(item[name]));
  }
  $('news-heading').textContent = item ? 'تعديل خبر' : 'إضافة خبر';
  $('reset-news').hidden = !item;
  newsForm.hidden = item ? !allowed('news.update') : !allowed('news.create');
  $('news').classList.toggle('single-column', newsForm.hidden);
  photoControls();
  if (item) field(newsForm, 'title').focus();
}

async function upload(form, kind, maxMiB) {
  const input = field(form, 'file');
  const file = input.files[0];
  if (!file) return null;
  if (file.size > maxMiB * 1024 * 1024) throw new Error('الملف أكبر من الحجم المسموح.');
  message('جارٍ رفع الملف…');
  const data = new FormData();
  data.append(kind, file);
  const { url } = await request('admin/uploads' + (kind === 'video' ? '/video' : ''), 'POST', data);
  input.value = '';
  return url;
}

async function loadNews() {
  news = await request('admin/news');
  renderNews();
}

submit(newsForm, async () => {
  if (!allowed(currentNews?.id ? 'news.update' : 'news.create')) throw new Error('حسابك ملوش صلاحية للعملية دي.');
  const window = dates(newsForm);
  const uploaded = await upload(newsForm, 'image', 5);
  if (uploaded) {
    currentNews = { ...currentNews, imageUrl: uploaded, videoUrl: null };
    photoControls();
  }
  const json = {
    title: value(newsForm, 'title'), body: value(newsForm, 'body'),
    slideSeconds: Number(value(newsForm, 'slideSeconds')) || null,
    status: value(newsForm, 'status'), imageUrl: currentNews?.imageUrl ?? null,
    videoUrl: currentNews?.videoUrl ?? null, source: currentNews?.source, category: currentNews?.category,
    ...window,
  };
  await request('admin/news' + (currentNews?.id ? '/' + currentNews.id : ''), currentNews?.id ? 'PUT' : 'POST', json);
  editNews(null);
  await loadNews();
}, 'الخبر اتحفظ.');

$('show-archive').addEventListener('change', renderNews);
$('reset-news').addEventListener('click', () => editNews(null));
$('remove-photo').addEventListener('click', () => {
  if (currentNews) Object.assign(currentNews, { imageUrl: null, videoUrl: null });
  field(newsForm, 'file').value = '';
  photoControls();
});

function renderTicker() {
  $('ticker-headlines').hidden = value(tickerForm, 'mode') !== 'headlines';
  const choices = news.filter(item => item.category === 'union' && item.status === 'published' && !item.archivedAt && !headlines.includes(item.id));
  $('ticker-choice').replaceChildren(...choices.map(item => new Option(item.title, item.id)));
  $('add-headline').disabled = !choices.length || headlines.length >= 8;
  list('headline-list', headlines, (id, index) => {
    const row = element('li');
    const item = news.find(story => story.id === id);
    const text = item?.title || 'عنوان مش متاح';
    const controls = element('div', '', 'actions');
    const move = direction => {
      const next = index + direction;
      [headlines[index], headlines[next]] = [headlines[next], headlines[index]];
      renderTicker();
    };
    if (index > 0) controls.append(action('لأعلى ↑', () => move(-1)));
    if (index < headlines.length - 1) controls.append(action('لأسفل ↓', () => move(1)));
    controls.append(action('إزالة', () => { headlines.splice(index, 1); renderTicker(); }));
    row.append(element('strong', (index + 1) + '. ' + text), controls);
    return row;
  }, 'اختار العناوين بالترتيب اللي يعجبك.');
}

field(tickerForm, 'mode').addEventListener('change', renderTicker);
$('add-headline').addEventListener('click', () => {
  const selected = Number($('ticker-choice').value);
  if (selected && !headlines.includes(selected) && headlines.length < 8) headlines.push(selected);
  renderTicker();
});
submit(tickerForm, async () => {
  const newsIds = value(tickerForm, 'mode') === 'headlines' ? headlines : null;
  if (newsIds && !newsIds.length) throw new Error('اختار عنوان واحد على الأقل.');
  await request('admin/ticker', 'PUT', { text: value(tickerForm, 'text'), newsIds });
}, 'الشريط الأحمر اتحفظ.');

function renderScreens() {
  const selected = value(videoForm, 'screenId');
  field(videoForm, 'screenId').replaceChildren(new Option('اختار شاشة', ''),
    ...screens.map(screen => new Option(screen.name, screen.id)));
  set(videoForm, 'screenId', selected);
  list('screen-list', screens, screen => {
    const row = element('li');
    const link = element('a', 'فتح شاشة العرض ↗');
    link.href = '/screen/' + encodeURIComponent(screen.key);
    link.target = '_blank';
    link.rel = 'noopener';
    row.append(element('strong', screen.name), element('p', screen.key, 'meta'), link);
    return row;
  }, 'مفيش شاشات مسجلة.');
}

function renderVideoTarget() {
  const choose = value(videoForm, 'target') === 'screen';
  $('target-screen').hidden = !choose;
  field(videoForm, 'screenId').required = choose;
}
function videoControls() {
  const url = currentVideo?.videoUrl;
  $('video-link').href = url || '#';
  $('video-link').hidden = !url;
  field(videoForm, 'file').required = !url;
}

function editVideo(item) {
  currentVideo = item ? { ...item } : null;
  videoForm.reset();
  if (item) {
    for (const name of ['title', 'target', 'screenId']) set(videoForm, name, item[name]);
    for (const name of ['startsAt', 'endsAt']) set(videoForm, name, localInput(item[name]));
  }
  $('video-heading').textContent = item ? 'تعديل جدولة' : 'جدولة فيديو';
  $('reset-video').hidden = !item;
  renderVideoTarget();
  videoControls();
  if (item) field(videoForm, 'title').focus();
}

function renderSchedules() {
  list('video-list', schedules, slot => {
    const row = element('li');
    const time = Date.now();
    const status = slot.cancelledAt ? 'اتلغت' : Date.parse(slot.endsAt) <= time ? 'انتهت' :
      slot.target === 'unassigned' ? 'في انتظار اختيار الشاشة' : Date.parse(slot.startsAt) > time ? 'مجدول' : 'داخل وقت التشغيل';
    const destination = slot.target === 'all' ? 'كل الشاشات' : screens.find(screen => screen.id === slot.screenId)?.name;
    row.append(element('strong', slot.title), element('p', [status, destination, format(slot.startsAt), format(slot.endsAt)].filter(Boolean).join(' · '), 'meta'));
    if (!slot.cancelledAt) {
      const controls = element('div', '', 'actions');
      controls.append(action('تعديل', () => editVideo(slot)), action('إلغاء الجدولة', button => run(button, async () => {
        await request('admin/video-schedules/' + slot.id, 'DELETE');
        if (currentVideo?.id === slot.id) editVideo(null);
        await loadSchedules();
      }, 'الجدولة اتلغت.')));
      row.append(controls);
    }
    return row;
  }, 'مفيش فيديوهات مجدولة.');
}

async function loadSchedules() {
  schedules = await request('admin/video-schedules');
  renderSchedules();
}

field(videoForm, 'target').addEventListener('change', renderVideoTarget);
$('reset-video').addEventListener('click', () => editVideo(null));
submit(videoForm, async () => {
  const window = dates(videoForm);
  const uploaded = await upload(videoForm, 'video', 25);
  if (uploaded) {
    currentVideo = { ...currentVideo, videoUrl: uploaded };
    videoControls();
  }
  const target = value(videoForm, 'target');
  const json = { title: value(videoForm, 'title'), videoUrl: currentVideo?.videoUrl, target,
    screenId: target === 'screen' ? Number(value(videoForm, 'screenId')) : null, ...window };
  await request('admin/video-schedules' + (currentVideo?.id ? '/' + currentVideo.id : ''), currentVideo?.id ? 'PUT' : 'POST', json);
  editVideo(null);
  await loadSchedules();
}, 'جدولة الفيديو اتحفظت.');

submit(screenForm, async () => {
  await request('admin/screens', 'POST', { name: value(screenForm, 'name'), key: value(screenForm, 'key') });
  screenForm.reset();
  screens = await request('admin/screens');
  renderScreens();
}, 'الشاشة اتضافت.');

const permissionChecks = [...userForm.querySelectorAll('input[name=permission]')];

function editUser(user) {
  currentUser = user;
  userForm.reset();
  const editing = Boolean(user);
  $('user-heading').textContent = editing ? 'تعديل الصلاحيات' : 'إضافة مستخدم';
  $('user-credentials').hidden = editing;
  $('user-credentials').disabled = editing;
  $('editing-account').hidden = !editing;
  $('editing-account').textContent = user?.email || '';
  $('save-user').textContent = editing ? 'حفظ الصلاحيات' : 'إضافة المستخدم';
  $('reset-user').hidden = !editing;
  for (const field of permissionChecks) field.checked = Boolean(user?.permissions.includes(field.value));
  if (editing) permissionChecks[0].focus();
}

function renderUsers() {
  list('user-list', users, user => {
    const row = element('li');
    const email = element('bdi', user.email);
    email.dir = 'ltr';
    const permissions = user.role === 'admin' ? 'مدير النظام' :
      user.permissions.map(permission => permissionLabels[permission]).join(' · ') || 'من غير صلاحيات';
    row.append(email, element('p', permissions, 'meta'));
    if (user.role === 'editor') {
      row.append(action('تعديل الصلاحيات', () => editUser(user)));
    }
    return row;
  }, 'مفيش حسابات لسه.');
}

async function loadUsers() {
  users = await request('admin/users');
  renderUsers();
}

submit(userForm, async () => {
  const permissions = permissionChecks.filter(field => field.checked).map(field => field.value);
  if (currentUser) {
    await request('admin/users/' + currentUser.id + '/permissions', 'PUT', { permissions });
  } else {
    const password = value(userForm, 'password');
    if (new TextEncoder().encode(password).length > 72) throw new Error('كلمة المرور طويلة زيادة.');
    try {
      await request('admin/users', 'POST', { email: value(userForm, 'email'), password, permissions });
    } finally {
      set(userForm, 'password', '');
    }
  }
  await loadUsers();
  editUser(null);
}, 'بيانات المستخدم اتحفظت.');
$('reset-user').addEventListener('click', () => editUser(null));

const tabs = [...document.querySelectorAll('[data-tab]')];

function selectTab(name) {
  for (const tab of tabs) {
    const active = !tab.hidden && tab.dataset.tab === name;
    tab.setAttribute('aria-pressed', String(active));
    $(tab.dataset.tab).hidden = !active;
  }
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectTab(tab.dataset.tab));
}

async function openDashboard(identity) {
  sessionUser = identity;
  for (const tab of tabs) tab.hidden = tab.dataset.tab === 'news' ? !canReadNews() : !isAdmin();
  $('no-access').hidden = canReadNews();
  $('show-archive').checked = false;
  editNews(null);
  if (isAdmin()) {
    const [ticker, devices, slots] = await Promise.all([
      request('admin/ticker'), request('admin/screens'), request('admin/video-schedules'),
    ]);
    headlines = ticker.newsIds || [];
    screens = devices;
    schedules = slots;
    set(tickerForm, 'mode', ticker.newsIds ? 'headlines' : 'text');
    set(tickerForm, 'text', ticker.text);
    renderScreens();
    renderSchedules();
    await Promise.all([loadUsers(), loadNews()]);
  } else if (canReadNews()) {
    await loadNews();
  }
  selectTab(canReadNews() ? 'news' : null);
  signedIn(true);
}

submit(login, async () => {
  try {
    await request('auth/login', 'POST', { email: value(login, 'email'), password: value(login, 'password') });
    await openDashboard(await request('auth/me'));
  } finally {
    set(login, 'password', '');
  }
});

$('logout').addEventListener('click', event => run(event.currentTarget, async () => {
  await request('auth/logout', 'POST');
  editNews(null);
  editVideo(null);
  editUser(null);
  signedIn(false);
}, 'تم تسجيل الخروج.'));

fetch('/api/auth/me', { cache: 'no-store' })
  .then(response => { if (response.ok) return run(null, async () => openDashboard(await response.json())); })
  .catch(() => message('تعذّر الاتصال بالخادم.', true));
