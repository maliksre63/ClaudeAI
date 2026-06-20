"""
Generates Stockly app icons:
  - public/icon.png  (512x512, for Electron/electron-builder)
  - public/favicon.png (64x64)
  - dist-electron/win-unpacked/stockly.ico (Windows ICO)
"""
from PIL import Image, ImageDraw
import math, os, struct, zlib

def draw_stockly(size=512):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d   = ImageDraw.Draw(img)
    r   = size

    # Rounded background — deep bordeaux
    radius = int(r * 0.22)
    bg_color = (45, 6, 16, 255)       # #2d0610
    card_color = (61, 10, 20, 255)    # #3d0a14

    # Draw rounded rect background
    for y in range(r):
        for x in range(r):
            if (x < radius and y < radius):
                dx, dy = x - radius, y - radius
                if dx*dx + dy*dy > radius*radius: continue
            elif (x >= r - radius and y < radius):
                dx, dy = x - (r - radius - 1), y - radius
                if dx*dx + dy*dy > radius*radius: continue
            elif (x < radius and y >= r - radius):
                dx, dy = x - radius, y - (r - radius - 1)
                if dx*dx + dy*dy > radius*radius: continue
            elif (x >= r - radius and y >= r - radius):
                dx, dy = x - (r - radius - 1), y - (r - radius - 1)
                if dx*dx + dy*dy > radius*radius: continue
            img.putpixel((x, y), card_color)

    # Chart line points (relative to size)
    def pt(rx, ry):
        return (int(rx * size), int(ry * size))

    pts = [
        pt(0.13, 0.72),
        pt(0.30, 0.52),
        pt(0.46, 0.62),
        pt(0.62, 0.34),
        pt(0.82, 0.20),
    ]

    lw = max(2, int(size * 0.025))

    # Shadow / glow layer (wider, semi-transparent)
    shadow_color = (184, 168, 156, 60)
    d.line(pts, fill=shadow_color, width=lw + int(size * 0.028), joint='curve')

    # Main crème line
    line_color = (221, 208, 198, 255)  # #ddd0c6
    d.line(pts, fill=line_color, width=lw, joint='curve')

    # Dot at last point (live indicator)
    dot_r = int(size * 0.048)
    cx, cy = pts[-1]
    # Halo
    halo_color = (221, 208, 198, 50)
    d.ellipse([cx - dot_r*2, cy - dot_r*2, cx + dot_r*2, cy + dot_r*2], fill=halo_color)
    # Dot
    d.ellipse([cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r], fill=line_color)

    return img


def save_ico(img_512, path):
    """Save a Windows ICO with 256, 128, 64, 48, 32, 16 sizes."""
    sizes = [256, 128, 64, 48, 32, 16]
    images = [(s, img_512.resize((s, s), Image.LANCZOS)) for s in sizes]

    import io as _io
    png_datas = []
    for s, im in images:
        buf = _io.BytesIO()
        im.save(buf, 'PNG')
        png_datas.append(buf.getvalue())

    n = len(sizes)
    header = struct.pack('<HHH', 0, 1, n)  # ICONDIR
    offset = 6 + n * 16
    entries = b''
    for i, (s, _) in enumerate(images):
        w = s if s < 256 else 0
        h = s if s < 256 else 0
        size_bytes = len(png_datas[i])
        entries += struct.pack('<BBBBHHII', w, h, 0, 0, 1, 32, size_bytes, offset)
        offset += size_bytes

    with open(path, 'wb') as f:
        f.write(header + entries)
        for data in png_datas:
            f.write(data)


if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'public')
    os.makedirs(out_dir, exist_ok=True)

    icon = draw_stockly(512)
    png_path = os.path.join(out_dir, 'icon.png')
    icon.save(png_path, 'PNG')
    print(f'[ok] {png_path}')

    # Small favicon
    fav = icon.resize((64, 64), Image.LANCZOS)
    fav_path = os.path.join(out_dir, 'favicon.png')
    fav.save(fav_path, 'PNG')
    print(f'[ok] {fav_path}')

    # Windows ICO
    ico_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'public')
    ico_path = os.path.join(ico_dir, 'icon.ico')
    save_ico(icon, ico_path)
    print(f'[ok] {ico_path}')

    print('Icons fertig.')
