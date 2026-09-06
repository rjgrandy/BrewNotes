import { test, expect, Page } from '@playwright/test';
import { cropBounds } from '../src/utils/photo';
import { filterDrinks } from '../src/utils/history';

const beans = [
  { id: 'bean-a', name: 'Morning Ritual', roaster: 'Onyx Coffee Lab', origin: 'Colombia', tasting_notes: 'Chocolate, almond, caramel', rating: 5, archived: false },
  { id: 'bean-b', name: 'Ethiopia Worka', roaster: 'Sey Coffee', origin: 'Ethiopia', tasting_notes: 'Bergamot, peach, jasmine', rating: 4, archived: false },
  { id: 'bean-c', name: 'After Hours', roaster: 'Counter Culture', origin: 'Peru', tasting_notes: 'Cocoa, sweet citrus', decaf: true, rating: 4, archived: true },
].map(b => ({ decaf: false, recipes: [], photos: [], created_at: '2026-09-01T08:00:00', updated_at: '2026-09-05T08:00:00', ...b }));
const drinks = [
  { id: 'brew-1', bean_id: 'bean-a', drink_type: 'Espresso', overall_rating: 5, created_at: '2026-09-06T14:30:00', notes: 'Sweet chocolate finish. Keep this recipe.', grind_setting: 3, would_make_again: true },
  { id: 'brew-2', bean_id: 'bean-b', drink_type: 'Espresso', overall_rating: 4, created_at: '2026-09-05T14:30:00', notes: 'Bright and juicy.', grind_setting: 4 },
  { id: 'brew-3', bean_id: 'bean-a', drink_type: 'Cortado', overall_rating: 4, created_at: '2026-09-04T14:30:00', notes: 'Lovely with oat milk.', milk_volume_ml: 40, grind_setting: 4 },
  { id: 'brew-4', bean_id: 'bean-c', drink_type: 'Espresso', overall_rating: 3, created_at: '2026-09-03T14:30:00', notes: 'Evening cup.', grind_setting: 5 },
].map(d => ({ temperature_level: 'MEDIUM', body_level: 'MEDIUM', order: 'COFFEE_FIRST', coffee_volume_ml: 40, milk_volume_ml: 0, strength_level: 'HIGH', sweetness: 3, bitterness: 3, acidity: 3, body_mouthfeel: 3, balance: 3, would_make_again: false, dialed_in: false, made_by: 'Ryan', rated_by: 'Ryan', ...d }));

async function mockJournal(page: Page) {
  await page.route('**/uploads/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=', 'base64') }));
  const state = { beans: structuredClone(beans) as any[], drinks: structuredClone(drinks) as any[], uploads: [] as Buffer[] };
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url()), path = url.pathname;
    const json = (value: unknown, status = 200) => route.fulfill({ status, json: value });
    if (path.endsWith('/analytics')) return json({ rating_vs_grind: [], rating_vs_coffee_volume: [], rating_by_temperature: [], rating_timeline: [], radar: [] });
    if (path.endsWith('/recommended-settings')) return json({ total_considered: 0 });
    if (path === '/api/drinks' && request.method() === 'POST') { const drink = { ...request.postDataJSON(), id: 'brew-new', created_at: '2026-09-06T16:00:00' }; state.drinks.unshift(drink); return json(drink); }
    if (path === '/api/drinks') return json(state.drinks.filter(d => (!url.searchParams.get('bean_id') || d.bean_id === url.searchParams.get('bean_id')) && (!url.searchParams.get('drink_type') || d.drink_type === url.searchParams.get('drink_type'))));
    if (path === '/api/beans' && request.method() === 'POST') { const bean = { ...beans[0], ...request.postDataJSON(), id: 'bean-new' }; state.beans.push(bean); return json(bean); }
    if (path === '/api/beans') return json(state.beans);
    const bean = state.beans.find(b => path.startsWith(`/api/beans/${b.id}`));
    if (bean) {
      if (path.includes('/photos') && request.method() === 'POST') {
        state.uploads.push(request.postDataBuffer()!);
        bean.photos = [{ id: 'photo-1', image_path: '/data/uploads/photo.jpg', thumbnail_path: '/data/uploads/photo.jpg', caption: '', sort_order: 0 }];
        bean.image_path = '/data/uploads/photo.jpg'; bean.thumbnail_path = bean.image_path;
      } else if (request.method() === 'PUT') Object.assign(bean, request.postDataJSON());
      return json(bean);
    }
    const drink = state.drinks.find(d => path.startsWith(`/api/drinks/${d.id}`));
    if (drink) {
      if (path.endsWith('/photo')) { state.uploads.push(request.postDataBuffer()!); drink.photo_path = '/data/uploads/photo.jpg'; }
      else if (request.method() === 'PUT') Object.assign(drink, request.postDataJSON());
      return json(drink);
    }
    return json({ detail: 'Not found' }, 404);
  });
  return state;
}

test('bean history filters and sorts, then links to the drink and bean comparison', async ({ page }) => {
  await mockJournal(page);
  await page.goto('/beans/bean-a');
  await expect(page.getByRole('heading', { name: 'Brewed with Morning Ritual' })).toBeVisible();
  await expect(page.locator('.drink-card')).toHaveCount(2);
  await page.getByLabel('Sort drinks').selectOption('oldest');
  await expect(page.locator('.drink-card').first()).toContainText('Cortado');
  await page.getByLabel('Filter drink type').selectOption('Espresso');
  await expect(page.locator('.drink-card')).toHaveCount(1);
  await page.reload();
  await expect(page.getByLabel('Sort drinks')).toHaveValue('oldest');
  await page.getByRole('link', { name: 'Espresso', exact: true }).click();
  await page.getByRole('link', { name: 'Compare beans for Espresso' }).click();
  await expect(page.getByRole('heading', { name: 'Beans you’ve used' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'After Hours', exact: true })).toBeVisible();
  await page.getByLabel('Sort beans used').selectOption('name');
  await expect(page.locator('article').first()).toContainText('After Hours');
});

test('brew again copies settings and saving resets notes and ratings', async ({ page }) => {
  const state = await mockJournal(page);
  await page.goto('/?repeat=brew-1');
  await expect(page.getByText('Copied from your brew')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Coffee bean', exact: true })).toHaveValue('bean-a');
  await expect(page.getByRole('textbox', { name: 'Tasting notes', exact: true })).toHaveValue('');
  await expect(page.getByRole('radio', { name: 'Set Overall rating to 3 stars', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('textbox', { name: 'Tasting notes', exact: true }).fill('New cup notes');
  await page.getByRole('button', { name: 'Log this cup' }).click();
  await expect(page.getByRole('heading', { name: 'Espresso logged' })).toBeVisible();
  expect(state.drinks[0].grind_setting).toBe(3);
  expect(state.drinks[0].notes).toBe('New cup notes');
  await expect(page.getByRole('textbox', { name: 'Tasting notes', exact: true })).toHaveValue('');
});

test('empty collection and failed history requests have useful recovery', async ({ page }) => {
  await mockJournal(page);
  await page.route('**/api/drinks*', route => route.fulfill({ status: 500, json: { detail: 'Unable to load your journal.' } }));
  await page.goto('/drinks?view=history');
  await expect(page.getByRole('alert')).toContainText('Unable to load your journal.');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.route('**/api/beans?*', route => route.fulfill({ json: [] }));
  await page.goto('/beans');
  await expect(page.getByRole('button', { name: 'Add your first bean' })).toBeVisible();
});

test('photo editing previews crop and rotation, cancels without uploading, and saves', async ({ page }) => {
  const state = await mockJournal(page);
  await page.goto('/beans/bean-a');
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 120; c.height = 80; const ctx = c.getContext('2d')!; ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 60, 80); ctx.fillStyle = 'blue'; ctx.fillRect(60, 0, 60, 80); return c.toDataURL().split(',')[1]; });
  const file = { name: 'camera.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') };
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles(file);
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Rotate right', exact: true }).click();
  const pixel = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => [...canvas.getContext('2d')!.getImageData(10, 10, 1, 1).data]);
  expect(pixel.slice(0, 3)).toEqual([255, 0, 0]);
  await page.getByLabel('Crop shape').selectOption('1');
  await expect(page.getByRole('button', { name: 'Save photo', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(state.uploads).toHaveLength(0);
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles(file);
  await page.getByLabel('Crop shape').selectOption('1');
  await page.getByRole('button', { name: 'Save photo', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.uploads).toHaveLength(1);
  expect(state.uploads[0].includes(Buffer.from('image/jpeg'))).toBeTruthy();
  await page.getByRole('button', { name: 'Open photo 1 of Morning Ritual', exact: true }).click();
  await page.getByRole('button', { name: 'Edit photo', exact: true }).click();
  await expect(page.getByRole('dialog', { includeHidden: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Rotate left', exact: true }).click();
  await page.getByRole('button', { name: 'Save photo', exact: true }).click();
  await expect(page.getByRole('dialog', { includeHidden: true })).toHaveCount(1);
  await expect.poll(() => state.uploads.length).toBe(2);
  expect(state.beans[0].photos).toHaveLength(1);
});

test('photo saves preserve unsaved drink notes', async ({ page }) => {
  await mockJournal(page);
  await page.goto('/drinks/brew-1');
  await page.getByRole('textbox', { name: 'Notes', exact: true }).fill('Do not lose this draft');
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 60; c.height = 60; return c.toDataURL().split(',')[1]; });
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles({ name: 'cup.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.getByRole('button', { name: 'Save photo', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Notes', exact: true })).toHaveValue('Do not lose this draft');
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeEnabled();
});

test('journal pages fit the viewport in both themes', async ({ page }, testInfo) => {
  await mockJournal(page);
  for (const path of ['/', '/beans', '/drinks', '/beans/bean-a', '/drinks/type/Espresso', '/drinks/brew-1', '/analytics']) {
    await page.goto(path);
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.getByText('Loading your journal…')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (path === '/' || path === '/drinks/type/Espresso') await page.screenshot({ path: testInfo.outputPath(path === '/' ? 'brew.png' : 'comparison.png'), fullPage: true });
  }
  await page.getByRole('button', { name: 'Switch to dark theme' }).filter({ visible: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({ path: testInfo.outputPath('dark-insights.png'), fullPage: true });
});

test('crop geometry remains within the image and history sorting is stable', () => {
  for (const aspect of [0.75, 1, 4 / 3, 16 / 9]) for (const zoom of [1, 2, 4]) for (const position of [0, 0.5, 1]) {
    const crop = cropBounds(1200, 800, aspect, zoom, position, position);
    expect(crop.x).toBeGreaterThanOrEqual(0); expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(1200.0001); expect(crop.y + crop.height).toBeLessThanOrEqual(800.0001);
    expect(crop.width / crop.height).toBeCloseTo(aspect);
  }
  const filtered = filterDrinks(drinks, beans, { bean: 'bean-a', type: '', query: '', rating: '', sort: 'oldest', favorite: false });
  expect(filtered.map(d => d.id)).toEqual(['brew-3', 'brew-1']);
  expect(drinks[0].id).toBe('brew-1');
});
