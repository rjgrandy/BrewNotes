import { test, expect, Page } from '@playwright/test';
import { CropHandle, constrainCrop, cropBounds, dragCrop } from '../src/utils/photo';
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


async function cameraFixture(page: Page) {
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 80;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 60, 80);
    ctx.fillStyle = 'blue'; ctx.fillRect(60, 0, 60, 80);
    return canvas.toDataURL().split(',')[1];
  });
  return { name: 'camera.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') };
}

async function setRange(page: Page, label: string, value: number) {
  await page.getByRole('slider', { name: label, exact: true }).evaluate((input: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

test('free crop defaults to full image, resizes and moves, exports the selected pixels, and retries', async ({ page }, testInfo) => {
  const state = await mockJournal(page);
  await page.goto('/beans/bean-a');
  await page.getByLabel('Take photo', { exact: true }).setInputFiles(await cameraFixture(page));
  await expect(page.getByLabel('Crop shape')).toHaveValue('free');
  await expect(page.getByText('Selection · 120 × 80 px')).toBeVisible();
  await setRange(page, 'Crop width', 45);
  await setRange(page, 'Crop height', 25);
  await setRange(page, 'Horizontal position', 70);
  await setRange(page, 'Vertical position', 20);
  await expect(page.getByText('Selection · 45 × 25 px')).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Vertical position', exact: true })).toBeInViewport({ ratio: 1 });
  await page.getByRole('dialog').screenshot({ path: testInfo.outputPath('free-crop.png') });
  await page.route('**/api/beans/bean-a/photos', route => route.fulfill({ status: 500, json: { detail: 'Upload interrupted. Try again.' } }), { times: 1 });
  await page.getByRole('button', { name: 'Save photo', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Upload interrupted');
  await expect(page.getByText('Selection · 45 × 25 px')).toBeVisible();
  await page.getByRole('button', { name: 'Save photo', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state.uploads).toHaveLength(1);
  const multipart = state.uploads[0], start = multipart.indexOf(Buffer.from([255, 216])), end = multipart.lastIndexOf(Buffer.from([255, 217])) + 2;
  expect(start).toBeGreaterThan(0);
  const jpeg = multipart.subarray(start, end).toString('base64');
  const result = await page.evaluate(async base64 => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const image = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
    const pixel = [...ctx.getImageData(10, 10, 1, 1).data];
    image.close();
    return { width: canvas.width, height: canvas.height, pixel };
  }, jpeg);
  expect([result.width, result.height]).toEqual([45, 25]);
  expect(result.pixel[2]).toBeGreaterThan(245);
  expect(result.pixel[0]).toBeLessThan(10);
});

test('free crop pointer handles, keyboard controls, presets, rotation and reset stay consistent', async ({ page, isMobile }) => {
  await mockJournal(page); await page.goto('/beans/bean-a');
  await page.getByLabel('Choose photo', { exact: true }).setInputFiles(await cameraFixture(page));
  const source = page.locator('.crop-source');
  const original = (await source.boundingBox())!;
  const handle = page.getByRole('button', { name: 'Resize crop right', exact: true });
  const edge = (await handle.boundingBox())!;
  if (isMobile) {
    const touch = await page.context().newCDPSession(page);
    const x = edge.x + edge.width / 2, y = edge.y + edge.height / 2;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - original.width / 4, y }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await touch.detach();
  } else {
    await page.mouse.move(edge.x + edge.width / 2, edge.y + edge.height / 2);
    await page.mouse.down();
    await page.mouse.move(edge.x + edge.width / 2 - original.width / 4, edge.y + edge.height / 2, { steps: 5 });
    await page.mouse.up();
  }
  await expect.poll(async () => Number(await page.getByRole('slider', { name: 'Crop width', exact: true }).inputValue())).toBeCloseTo(90, 0);
  await expect(page.getByRole('slider', { name: 'Crop height', exact: true })).toHaveValue('80');
  await page.getByRole('button', { name: 'Resize crop bottom', exact: true }).focus();
  await page.keyboard.press('Shift+ArrowUp');
  await expect(page.getByRole('slider', { name: 'Crop height', exact: true })).toHaveValue('70');
  const selection = (await page.getByTestId('crop-selection').boundingBox())!;
  await page.mouse.move(selection.x + selection.width / 2, selection.y + selection.height / 2);
  await page.mouse.down(); await page.mouse.move(selection.x + selection.width / 2 + original.width, selection.y + selection.height / 2 + original.height); await page.mouse.up();
  // Touch coordinates may be fractional; verify the selected right edge itself.
  await expect.poll(async () => {
    const box = (await page.getByTestId('crop-selection').boundingBox())!;
    const bounds = (await source.boundingBox())!;
    return Math.abs(box.x + box.width - bounds.x - bounds.width);
  }).toBeLessThan(1);
  await expect(page.getByRole('slider', { name: 'Vertical position', exact: true })).toHaveValue('10');
  await page.getByLabel('Crop shape').selectOption('1');
  await setRange(page, 'Zoom', 2);
  await expect(page.getByText('Selection · 40 × 40 px')).toBeVisible();
  await page.getByLabel('Crop shape').selectOption('free');
  await expect(page.getByText('Selection · 40 × 40 px')).toBeVisible();
  await page.getByRole('button', { name: 'Rotate right', exact: true }).click();
  await expect(page.getByLabel('Crop shape')).toHaveValue('free');
  await expect(page.getByText('Selection · 80 × 120 px')).toBeVisible();
  await page.getByLabel('Crop shape').selectOption('0.75');
  await page.getByRole('button', { name: 'Rotate left', exact: true }).click();
  await expect(page.getByLabel('Crop shape')).toHaveValue('0.75');
  await expect(page.getByText('Selection · 60 × 80 px')).toBeVisible();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByLabel('Crop shape')).toHaveValue('free');
  await expect(page.getByText('Selection · 120 × 80 px')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('arbitrary crop geometry clamps all edges without flipping or changing the opposite edge', () => {
  const crop = { x: 20, y: 10, width: 60, height: 50 };
  expect(dragCrop(crop, 'w', 10, 0, 120, 80)).toEqual({ x: 30, y: 10, width: 50, height: 50 });
  expect(dragCrop(crop, 'n', 0, 15, 120, 80)).toEqual({ x: 20, y: 25, width: 60, height: 35 });
  expect(dragCrop(crop, 'se', 20, 10, 120, 80)).toEqual({ x: 20, y: 10, width: 80, height: 60 });
  expect(dragCrop(crop, 'move', 500, -500, 120, 80)).toEqual({ x: 60, y: 0, width: 60, height: 50 });
  expect(constrainCrop({ x: -1, y: 500, width: 500, height: 0 }, 120, 80)).toEqual({ x: 0, y: 79, width: 120, height: 1 });
  for (const handle of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as CropHandle[]) {
    for (const dx of [-500, 500]) for (const dy of [-500, 500]) {
      const result = dragCrop(crop, handle, dx, dy, 120, 80);
      expect(result.width).toBeGreaterThanOrEqual(1); expect(result.height).toBeGreaterThanOrEqual(1);
      expect(result.x).toBeGreaterThanOrEqual(0); expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.x + result.width).toBeLessThanOrEqual(120); expect(result.y + result.height).toBeLessThanOrEqual(80);
    }
  }
});

async function mockPhotoCollection(page: Page) {
  const state = await mockJournal(page);
  const sizes = [[600, 900], [900, 600], [600, 600], [1600, 200], [150, 1200]];
  const names = ['Morning Ritual', 'Ethiopia Worka', 'After Hours', 'Panorama Roast', 'Tall Bag'];
  const swatches = ['#20464b', '#a85b38', '#695b76', '#487368', '#99794b'];
  await page.route('**/uploads/studio-*', route => {
    const match = /studio-(\d+)/.exec(route.request().url())!;
    const i = Number(match[1]), [w, h] = sizes[i];
    // An illustration fixture with explicit image boundaries for visual fitting checks.
    return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 600 900" preserveAspectRatio="none"><defs><linearGradient id="paper"><stop stop-color="#ded4bd"/><stop offset=".45" stop-color="#f1e8d3"/><stop offset="1" stop-color="#c6baa1"/></linearGradient></defs><rect width="600" height="900" fill="#d9d5ca"/><ellipse cx="300" cy="820" rx="205" ry="30" fill="#aaa69c"/><path d="M135 65h330l-14 88 42 632q-192 50-386 0l42-632z" fill="url(#paper)" stroke="#aba28d" stroke-width="3"/><path d="M140 89h320M145 105h309M149 153h301M107 785l54-30h288l44 30" fill="none" stroke="#b0a38a" stroke-width="4"/><rect x="161" y="230" width="288" height="400" fill="${swatches[i]}"/><circle cx="305" cy="310" r="35" fill="none" stroke="#ede3c8" stroke-width="2"/><path d="M281 310h48m-24-24v48" stroke="#ede3c8"/><g fill="#f6ecd9" text-anchor="middle" font-family="Georgia"><text x="305" y="404" font-size="35">STUDIO</text><text x="305" y="447" font-size="35">COFFEE</text><text x="305" y="512" font-size="18">SINGLE ORIGIN</text><text x="305" y="581" font-size="15">ROASTED WITH INTENTION</text></g><rect x="4" y="4" width="592" height="892" fill="none" stroke="#7c817c" stroke-width="5"/></svg>` });
  });
  state.beans = sizes.map((_, i) => ({
    ...beans[i % beans.length], id: i === 0 ? 'bean-a' : i === 1 ? 'bean-b' : `photo-bean-${i}`,
    name: names[i], archived: false, image_path: `/uploads/studio-${i}.svg`,
    thumbnail_path: i === 1 ? '/uploads/broken-thumbnail.jpg' : i === 2 ? undefined : `/uploads/studio-${i}.svg`,
    photos: [{ id: `photo-${i}`, image_path: `/uploads/studio-${i}.svg`, thumbnail_path: `/uploads/studio-${i}.svg` }]
  }));
  state.beans.push({ ...beans[0], id: 'no-photo', name: 'A new discovery', image_path: undefined, thumbnail_path: undefined });
  state.beans.push({ ...beans[0], id: 'broken-photo', name: 'Unavailable photo', image_path: '/uploads/broken.jpg', thumbnail_path: '/uploads/broken-thumbnail.jpg' });
  await page.route('**/uploads/broken*', route => route.fulfill({ status: 404, body: '' }));
  state.drinks[0].photo_path = '/uploads/studio-0.svg';
  state.drinks[0].thumbnail_path = '/uploads/broken-thumbnail.jpg';
  for (const type of ['Coffee', 'Americano', 'Latte', 'Cappuccino', 'Flat White', 'Macchiato']) state.drinks.push({ ...drinks[0], id: type, drink_type: type });
  return state;
}

test('studio photos fit every shape and artwork renders in both themes', async ({ page }, testInfo) => {
  test.slow(); // Fourteen route/theme combinations plus full-page captures.
  await mockPhotoCollection(page);
  for (const theme of ['light', 'dark']) {
    await page.goto('/beans');
    if (theme === 'dark') await page.getByRole('button', { name: 'Switch to dark theme' }).filter({ visible: true }).click();
    await expect(page.locator('.bean-card-photo')).toHaveCount(7);
    for (const frame of await page.locator('.bean-card-photo').all()) await frame.scrollIntoViewIfNeeded();
    await expect(page.locator('.bean-card-photo > img')).toHaveCount(5);
    await expect(page.getByRole('img', { name: 'Unavailable photo — no photo available' })).toBeVisible();
    for (const frame of await page.locator('.bean-card-photo').all()) {
      const size = (await frame.boundingBox())!;
      expect(size.width / size.height).toBeCloseTo(.8, 2);
    }
    for (const img of await page.locator('.photo-frame > img').all()) await expect(img).toHaveCSS('object-fit', 'contain');
    for (const [path, name] of [['/beans', 'beans'], ['/beans/bean-a', 'bean-detail'], ['/drinks', 'artwork'], ['/', 'brew'], ['/drinks/type/Espresso', 'comparison'], ['/drinks/brew-1', 'drink-detail'], ['/analytics', 'insights']]) {
      await page.goto(path);
      await expect(page.getByRole('heading').first()).toBeVisible();
      await expect(page.getByText('Loading your journal…')).toHaveCount(0);
      // Bean metadata can replace a placeholder as a second request completes.
      await expect(async () => {
        for (const frame of await page.locator('.photo-frame').all()) await frame.scrollIntoViewIfNeeded();
      }).toPass({ timeout: 15000 });
      await expect.poll(() => page.evaluate(() => Array.from(document.querySelectorAll('.photo-frame > img')).every(img => (img as HTMLImageElement).complete))).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`${name}-${theme}.png`), fullPage: true });
    }
    await page.goto('/beans/bean-a');
    await page.getByRole('button', { name: 'Open photo 1 of Morning Ritual', exact: true }).click();
    const frame = page.locator('.lightbox-photo');
    await expect(frame).toBeInViewport();
    await expect(frame.locator('img')).toHaveCSS('object-fit', 'contain');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  }
});
