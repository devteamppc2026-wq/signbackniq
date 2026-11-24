import { createHash } from 'node:crypto';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { decodeHTML } from 'entities';
import { PetroleumArticle } from './models.js';

const MAX_FEED_BYTES = 2 * 1024 * 1024;
export { MAX_FEED_BYTES };
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  processEntities: false,
  isArray: (name) => name === 'item',
});

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function plainText(value: unknown): string {
  // Output is plain text only. Never pass publisher HTML through to the browser.
  return decodeHTML(
    text(value)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArabic(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

export function isPetroleumNews(title: string, summary = ''): boolean {
  const content = normalizeArabic(title + ' ' + summary);
  const terms = [
    'بترول',
    'نفط',
    'بتروكيماو',
    'بتروكيماي',
    'غاز طبيعي',
    'الغاز الطبيعي',
    'غاز مسال',
    'الغاز المسال',
    'غاز البترول',
    'حقول الغاز',
    'حقل غاز',
    'انتاج الغاز',
    'استخراج الغاز',
    'تصدير الغاز',
    'اكتشاف غاز',
    'اكتشافات الغاز',
    'تكرير',
    'مصفاه',
    'مصافي',
    'برميل خام',
    'خام برنت',
    'خام غرب تكساس',
    'اوبك',
    'هيدروكربون',
    'زيت خام',
    'الزيت الخام',
  ];
  // "طاقة", "غاز", and "وقود" alone are deliberately too broad.
  return terms.some((term) => content.includes(normalizeArabic(term)));
}

function approvedUrl(value: unknown, image = false): string | null {
  try {
    const url = new URL(text(value));
    const allowed = image
      ? ['img.youm7.com', 'www.youm7.com', 'youm7.com']
      : ['www.youm7.com', 'youm7.com'];
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      !allowed.includes(url.hostname) ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    if (!image && !/^\/story\//i.test(url.pathname)) return null;
    url.protocol = 'https:';
    url.hash = '';
    if (!image) url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}

export function parsePetroleumRss(xml: string): PetroleumArticle[] {
  if (Buffer.byteLength(xml, 'utf8') > MAX_FEED_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error('Unsafe RSS document');
  if (XMLValidator.validate(xml) !== true) throw new Error('Malformed RSS document');
  const parsed = parser.parse(xml);
  const channel = parsed?.rss?.channel;
  if (!channel || typeof channel !== 'object') throw new Error('Expected RSS channel');
  const items = channel.item || [];
  const articles: PetroleumArticle[] = [];
  for (const item of items.slice(0, 250)) {
    if (!item || typeof item !== 'object') continue;
    const title = plainText(item.title).slice(0, 220);
    const description = text(item.description).split(/المصدر\s*[:：]/)[0] || '';
    const summary = plainText(description);
    const url = approvedUrl(item.link);
    if (!title || !url || !isPetroleumNews(title, summary)) continue;
    const enclosure = Array.isArray(item.enclosure) ? item.enclosure[0] : item.enclosure;
    const media = item['media:content'] || item['media:thumbnail'];
    const originalImage = approvedUrl(enclosure?.['@_url'] || media?.['@_url'], true);
    const image = originalImage ? new URL(originalImage) : null;
    // The publisher uses /xlarge/ in article Open Graph metadata, versus /large/ in RSS.
    if (image?.hostname === 'img.youm7.com' && image.pathname.startsWith('/large/')) {
      image.pathname = image.pathname.replace('/large/', '/xlarge/');
    }
    const preferredImage = image?.toString() || null;
    articles.push({
      id: createHash('sha256').update(url).digest('hex').slice(0, 24),
      title,
      body: summary.length > 220 ? summary.slice(0, 217) + '…' : summary,
      source: 'اليوم السابع',
      url,
      imageUrl: preferredImage,
      imageFallbackUrl: preferredImage !== originalImage ? originalImage : null,
      // Youm7 supplies a localized Cairo date, not an RFC/ISO timestamp.
      publishedAt: plainText(item.pubDate).slice(0, 100),
    });
  }
  return articles;
}

export function publicationOrder(label: string): number {
  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'ابريل',
    'مايو',
    'يونيو',
    'يوليو',
    'اغسطس',
    'سبتمبر',
    'اكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  const normalized = normalizeArabic(label).replace(/[٠-٩]/g, (digit) =>
    String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)),
  );
  const match = normalized.match(/(\d{1,2})\s+(\S+)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*([صم])/);
  if (!match) return 0;
  const month = months.indexOf(match[2]!);
  if (month < 0) return 0;
  const hour = (Number(match[4]) % 12) + (match[6] === 'م' ? 12 : 0);
  // Used only for sorting dates in the same publisher timezone.
  return Date.UTC(Number(match[3]), month, Number(match[1]), hour, Number(match[5]));
}
