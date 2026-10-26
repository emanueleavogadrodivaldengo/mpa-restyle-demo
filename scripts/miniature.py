# Crea le miniature quadrate 200x200 delle news (per "Le più lette").
# In WordPress non serve: le genera da solo con add_image_size('mini', 200, 200, true).
# Uso: python3 scripts/miniature.py
from pathlib import Path
from PIL import Image

src = Path('src/assets/img/news')
out = src / 'mini'
out.mkdir(exist_ok=True)
for f in sorted(src.glob('*.webp')):
    im = Image.open(f).convert('RGB')
    side = min(im.size)
    left, top = (im.width - side) // 2, (im.height - side) // 2
    im.crop((left, top, left + side, top + side)).resize((200, 200), Image.LANCZOS) \
      .save(out / f.name, 'WEBP', quality=78)
print(f'{len(list(out.glob("*.webp")))} miniature in {out}')
