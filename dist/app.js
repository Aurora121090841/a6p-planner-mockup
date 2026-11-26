const get = id => document.getElementById(id);
const book = get('book');
const ctx = book.getContext('2d');
const leaf = get('leaf');
const files = get('files');
const drop = get('drop');
const list = get('pages');
const pages = [];
const pageWidth = 622;
const pageHeight = 1000;
const topEdge = 54;
let spread = 0;
let importing = false;
let turning = false;

function rounded(context, x, y, width, height, radius, fill) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
}

function drawPage(context, x, y, image, side) {
  context.save();
  context.beginPath();
  context.roundRect(x, y, pageWidth, pageHeight, side === 0 ? [16, 0, 0, 16] : [0, 16, 16, 0]);
  context.clip();
  context.fillStyle = '#fffdf5';
  context.fillRect(x, y, pageWidth, pageHeight);
  if (image) {
    const scale = Math.min(pageWidth / image.naturalWidth, pageHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, x + (pageWidth - width) / 2, y + (pageHeight - height) / 2, width, height);
  }
  const seam = x + (side === 0 ? pageWidth : 0);
  const shadow = context.createLinearGradient(seam, 0, seam + (side === 0 ? -48 : 48), 0);
  shadow.addColorStop(0, '#31291d40');
  shadow.addColorStop(1, '#31291d00');
  context.fillStyle = shadow;
  context.fillRect(x, y, pageWidth, pageHeight);
  context.restore();
}

function drawBook(base, backingLeft = base) {
  const desk = ctx.createLinearGradient(0, 0, 1320, 1120);
  desk.addColorStop(0, '#e2ded0');
  desk.addColorStop(1, '#b9b6a6');
  ctx.fillStyle = desk;
  ctx.fillRect(0, 0, book.width, book.height);
  ctx.save();
  ctx.shadowColor = '#2a302c60';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 20;
  rounded(ctx, 68, 31, 1304, 1050, 32, '#586b5c');
  ctx.restore();
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = '#a3ab8f';
  ctx.beginPath();
  ctx.roundRect(80, 42, 1280, 1027, 26);
  ctx.stroke();
  ctx.setLineDash([]);
  rounded(ctx, 95, 59, 1250, 1003, 17, '#acaa9c');
  rounded(ctx, 96, 58, 1248, 1000, 17, '#e4dfd0');
  drawPage(ctx, 98, topEdge, pages[backingLeft]?.image, 0);
  drawPage(ctx, 720, topEdge, pages[base + 1]?.image, 1);
  for (const y of [185, 250, 315, 785, 850, 915]) {
    for (const x of [690, 750]) rounded(ctx, x - 9, y - 10, 18, 20, 9, '#665e50');
    const metal = ctx.createLinearGradient(0, y - 7, 0, y + 7);
    metal.addColorStop(0, '#f3f2e6');
    metal.addColorStop(.32, '#a9aca5');
    metal.addColorStop(.62, '#565c56');
    metal.addColorStop(1, '#d7d9cb');
    rounded(ctx, 688, y - 7, 64, 14, 7, metal);
  }
}

function button(text, label, action) {
  const control = document.createElement('button');
  control.textContent = text;
  control.setAttribute('aria-label', label);
  control.addEventListener('click', action);
  return control;
}

function render() {
  const total = pages.length;
  const last = Math.min(spread + 2, total);
  get('position').textContent = total ? `第 ${spread + 1}${last > spread + 1 ? '–' + last : ''} 页 / 共 ${total} 页` : '等待导入';
  get('count').textContent = total + ' 页';
  get('prev').disabled = !spread || turning;
  get('next').disabled = spread + 2 >= total || turning;
  get('export').disabled = !total || turning;
  list.replaceChildren();
  pages.forEach((page, index) => {
    const row = document.createElement('li');
    const jump = button('', `前往第 ${index + 1} 页 ${page.name}`, () => go(Math.floor(index / 2) * 2));
    jump.className = 'jump';
    jump.title = page.name;
    jump.setAttribute('aria-current', String(index >= spread && index < spread + 2));
    const thumb = document.createElement('img');
    thumb.src = page.url;
    thumb.alt = '';
    thumb.loading = 'lazy';
    const name = document.createElement('span');
    name.textContent = `${index + 1}. ${page.name}`;
    jump.append(thumb, name);
    const up = button('↑', `上移第 ${index + 1} 页`, () => move(index, -1));
    const down = button('↓', `下移第 ${index + 1} 页`, () => move(index, 1));
    const remove = button('×', `移除第 ${index + 1} 页`, () => {
      if (turning) return;
      URL.revokeObjectURL(pages.splice(index, 1)[0].url);
      spread = Math.min(spread, Math.max(0, Math.floor((pages.length - 1) / 2) * 2));
      refresh();
    });
    up.disabled = index === 0;
    down.disabled = index === total - 1;
    row.append(jump, up, down, remove);
    list.append(row);
  });
}

function refresh() {
  drawBook(spread);
  render();
}

function move(index, offset) {
  if (turning) return;
  const destination = index + offset;
  [pages[index], pages[destination]] = [pages[destination], pages[index]];
  spread = Math.floor(destination / 2) * 2;
  refresh();
  list.children[destination].querySelector('.jump').focus();
}

function go(target) {
  if (turning || target === spread || target < 0 || target >= pages.length) return;
  if (Math.abs(target - spread) !== 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    spread = target;
    refresh();
    return;
  }
  const forward = target > spread;
  turning = true;
  const [front, back] = leaf.querySelectorAll('canvas');
  for (const canvas of [front, back]) canvas.getContext('2d').clearRect(0, 0, pageWidth, pageHeight);
  drawPage(front.getContext('2d'), 0, 0, pages[spread + Number(forward)]?.image, Number(forward));
  drawPage(back.getContext('2d'), 0, 0, pages[target + Number(!forward)]?.image, Number(!forward));
  drawBook(forward ? target : spread, forward ? spread : target);
  leaf.className = forward ? 'forward' : 'backward';
  leaf.hidden = false;
  render();
  function finishTurn() {
    clearTimeout(fallback);
    leaf.removeEventListener('animationend', finishTurn);
    leaf.hidden = true;
    leaf.className = '';
    turning = false;
    spread = target;
    refresh();
  }
  const fallback = setTimeout(finishTurn, 450);
  leaf.addEventListener('animationend', finishTurn);
}

async function addImages(selected) {
  if (!selected.length || importing) return;
  importing = true;
  files.disabled = true;
  get('status').textContent = `正在导入 ${selected.length} 张图片…`;
  let failed = 0;
  const first = pages.length;
  const imported = [];
  for (const file of selected) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
      imported.push({ name: file.name, url, image });
    } catch {
      URL.revokeObjectURL(url);
      failed++;
    }
  }
  pages.push(...imported);
  if (first === 0) spread = 0;
  files.disabled = false;
  importing = false;
  get('status').textContent = failed ? `已导入 ${selected.length - failed} 张，${failed} 张无法读取。` : '';
  if (!turning) refresh();
}

files.addEventListener('change', () => {
  const selected = Array.from(files.files);
  files.value = '';
  addImages(selected);
});
drop.addEventListener('dragover', event => {
  event.preventDefault();
  drop.classList.add('active');
});
drop.addEventListener('dragleave', () => drop.classList.remove('active'));
drop.addEventListener('drop', event => {
  event.preventDefault();
  drop.classList.remove('active');
  addImages(Array.from(event.dataTransfer.files));
});
get('prev').addEventListener('click', () => go(spread - 2));
get('next').addEventListener('click', () => go(spread + 2));
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key === 'ArrowLeft') go(spread - 2);
  if (event.key === 'ArrowRight') go(spread + 2);
});
get('export').addEventListener('click', () => {
  const filename = `A6P-第${spread + 1}-${Math.min(spread + 2, pages.length)}页.png`;
  book.toBlob(blob => {
    if (!blob) {
      get('status').textContent = '下载失败，请重试。';
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
});
refresh();
