import { load } from 'cheerio';
import { PetroleumPriceGroup, PriceGroupId } from './models.js';

export const MAX_MINISTRY_BYTES = 2 * 1024 * 1024;
const definitions: { id: PriceGroupId; selector: string; title: string; names: string[] }[] = [
  {
    id: 'gasoline',
    selector: '.Petrollocal',
    title: 'بنزين محلي',
    names: ['بنزين 80', 'بنزين 92', 'بنزين 95'],
  },
  {
    id: 'products',
    selector: '.PetrolProducts',
    title: 'منتجات بترولية',
    names: ['كيروسين', 'سولار', 'بوتاجاز'],
  },
  {
    id: 'crude',
    selector: '.Petrolgloball',
    title: 'خام عالمي',
    names: ['خام برنت', 'خام غرب تكساس', 'خام أوبك'],
  },
];

function clean(value: string): string {
  return value
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function digits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/٫/g, '.')
    .replace(/٬/g, ',');
}
function amount(raw: string): number {
  const value = digits(clean(raw)).replace(/^\$\s*|\s*\$$/g, '');
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,4})?$/.test(value))
    throw new Error('Invalid ministry price');
  const parsed = Number(value.replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000_000)
    throw new Error('Invalid ministry price');
  return parsed;
}
function sourceDate(raw: string): string {
  const match = digits(clean(raw)).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) throw new Error('Invalid ministry publication date');
  const day = Number(match[1]),
    month = Number(match[2]),
    year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 2000 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new Error('Invalid ministry publication date');
  return date.toISOString().slice(0, 10);
}

export function parseMinistryPrices(html: string): PetroleumPriceGroup[] {
  if (Buffer.byteLength(html, 'utf8') > MAX_MINISTRY_BYTES)
    throw new Error('Ministry page exceeds size limit');
  const $ = load(html);
  return definitions.map((definition) => {
    const section = $('.PetrolPrice').find(definition.selector).first().closest('.post-row');
    if (!section.length) throw new Error('Ministry price section missing');
    const seen = new Set<string>();
    const items = section
      .find('table tbody tr')
      .toArray()
      .map((row) => {
        const cells = $(row).find('td');
        if (cells.length !== 4) throw new Error('Ministry price columns changed');
        const name = clean(cells.eq(1).text());
        const index = definition.names.indexOf(name);
        if (index < 0 || seen.has(name)) throw new Error('Unexpected ministry price item');
        seen.add(name);
        const rawPrice = clean(cells.eq(2).text());
        const lastCell = clean(cells.eq(3).text());
        const isCrude = definition.id === 'crude';
        const normalizedUnit = lastCell.replace(/[أإآ]/g, 'ا').replace(/\s*\/\s*/g, '/');
        if (!isCrude && !['جنيه/لتر', 'جنيه/اسطوانة'].includes(normalizedUnit))
          throw new Error('Unknown ministry price unit');
        if (isCrude && !rawPrice.includes('$')) throw new Error('Unknown ministry price currency');
        return {
          id: definition.id + '-' + index,
          name,
          value: amount(rawPrice),
          currency: isCrude ? ('USD' as const) : ('EGP' as const),
          unit: isCrude ? 'دولار/برميل' : lastCell,
          sourceDate: isCrude ? sourceDate(lastCell) : null,
        };
      });
    if (items.length !== definition.names.length) throw new Error('Incomplete ministry prices');
    items.sort((a, b) => definition.names.indexOf(a.name) - definition.names.indexOf(b.name));
    return { id: definition.id, title: definition.title, items };
  });
}
