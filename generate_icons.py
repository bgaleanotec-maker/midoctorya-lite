"""
generate_icons.py -- Genera iconos PWA y banners promocionales
Ejecutar: python generate_icons.py
"""
import struct
import zlib
import os
import math

DIR = os.path.dirname(os.path.abspath(__file__))
ICONS_DIR = os.path.join(DIR, "icons")
IMG_DIR = os.path.join(DIR, "img")

os.makedirs(ICONS_DIR, exist_ok=True)
os.makedirs(IMG_DIR, exist_ok=True)


def create_png(width, height, pixels_func):
    """Create a PNG from a pixel function that returns (r,g,b) for each x,y."""
    raw_rows = []
    for y in range(height):
        row = bytearray()
        row.append(0)  # filter byte
        for x in range(width):
            r, g, b = pixels_func(x, y, width, height)
            row.extend((r, g, b))
        raw_rows.append(bytes(row))

    raw = b''.join(raw_rows)
    compressed = zlib.compress(raw, 9)

    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png


def lerp(a, b, t):
    return int(a + (b - a) * t)


def gradient_bg(x, y, w, h):
    """Dark navy-to-indigo gradient."""
    t = y / h
    t2 = x / w
    r = lerp(15, 67, t * 0.7 + t2 * 0.3)
    g = lerp(23, 56, t * 0.7 + t2 * 0.3)
    b = lerp(42, 202, t * 0.7 + t2 * 0.3)
    return (r, g, b)


def icon_pixels(x, y, w, h):
    """App icon: gradient bg + white cross + rounded corners."""
    cx, cy = w // 2, h // 2
    margin = int(w * 0.08)
    corner_r = int(w * 0.22)

    # Check rounded rectangle
    in_rect = margin <= x < w - margin and margin <= y < h - margin
    if in_rect:
        dx = min(x - margin, w - margin - 1 - x)
        dy = min(y - margin, h - margin - 1 - y)
        if dx < corner_r and dy < corner_r:
            dist = math.sqrt((corner_r - dx)**2 + (corner_r - dy)**2)
            if dist > corner_r:
                return (245, 245, 245)  # outside rounded corner

    if not in_rect:
        return (245, 245, 245)

    # Gradient background
    t = (y - margin) / (h - 2 * margin)
    t2 = (x - margin) / (w - 2 * margin)
    bg_r = lerp(99, 79, t * 0.6 + t2 * 0.4)
    bg_g = lerp(102, 70, t * 0.6 + t2 * 0.4)
    bg_b = lerp(241, 229, t * 0.6 + t2 * 0.4)

    # White medical cross / heart shape
    # Simple heart using math
    hx = (x - cx) / (w * 0.2)
    hy = (y - cy + w * 0.03) / (h * 0.2)
    heart = (hx**2 + hy**2 - 1)**3 - hx**2 * hy**3
    if heart <= 0:
        return (255, 255, 255)

    return (bg_r, bg_g, bg_b)


def banner_pixels(x, y, w, h):
    """Promotional banner: gradient bg with subtle pattern."""
    # Base gradient
    t = y / h
    t2 = x / w
    r = lerp(15, 49, t)
    g = lerp(23, 46, t)
    b = lerp(42, 130, t * 0.5 + t2 * 0.5)

    # Subtle dot pattern
    if (x % 24 < 2) and (y % 24 < 2):
        r = min(255, r + 15)
        g = min(255, g + 15)
        b = min(255, b + 20)

    # Decorative circle top-right
    dx = x - int(w * 0.85)
    dy = y - int(h * 0.2)
    dist = math.sqrt(dx*dx + dy*dy)
    radius = w * 0.25
    if dist < radius:
        alpha = 0.08
        r = min(255, int(r + (99 - r) * alpha))
        g = min(255, int(g + (102 - g) * alpha))
        b = min(255, int(b + (241 - b) * alpha))

    # Decorative circle bottom-left
    dx2 = x - int(w * 0.1)
    dy2 = y - int(h * 0.85)
    dist2 = math.sqrt(dx2*dx2 + dy2*dy2)
    if dist2 < radius * 0.7:
        alpha = 0.06
        r = min(255, int(r + (139 - r) * alpha))
        g = min(255, int(g + (92 - g) * alpha))
        b = min(255, int(b + (246 - b) * alpha))

    return (r, g, b)


def splash_pixels(x, y, w, h):
    """Splash screen background."""
    t = y / h
    t2 = x / w
    r = lerp(15, 30, t)
    g = lerp(23, 29, t)
    b = lerp(42, 75, t * 0.7 + t2 * 0.3)

    # Central glow
    cx, cy = w // 2, h // 2
    dx = (x - cx) / w
    dy = (y - cy) / h
    dist = math.sqrt(dx*dx + dy*dy)
    if dist < 0.3:
        glow = (0.3 - dist) / 0.3
        r = min(255, int(r + 40 * glow))
        g = min(255, int(g + 40 * glow))
        b = min(255, int(b + 80 * glow))

    return (r, g, b)


def main():
    # App Icons
    for size in [192, 512]:
        data = create_png(size, size, icon_pixels)
        path = os.path.join(ICONS_DIR, f"icon-{size}.png")
        with open(path, 'wb') as f:
            f.write(data)
        print(f"  OK icon-{size}.png ({len(data):,} bytes)")

    # Promotional Banner (1200x630 - social media standard)
    data = create_png(1200, 630, banner_pixels)
    path = os.path.join(IMG_DIR, "banner-promo.png")
    with open(path, 'wb') as f:
        f.write(data)
    print(f"  OK banner-promo.png ({len(data):,} bytes)")

    # Splash Screen Background (750x1334 - iPhone 6/7/8 size)
    data = create_png(750, 1334, splash_pixels)
    path = os.path.join(IMG_DIR, "splash-bg.png")
    with open(path, 'wb') as f:
        f.write(data)
    print(f"  OK splash-bg.png ({len(data):,} bytes)")

    # Store Banner (1024x500 - Play Store feature graphic size)
    data = create_png(1024, 500, banner_pixels)
    path = os.path.join(IMG_DIR, "banner-store.png")
    with open(path, 'wb') as f:
        f.write(data)
    print(f"  OK banner-store.png ({len(data):,} bytes)")

    # Square Social (1080x1080 - Instagram)
    data = create_png(1080, 1080, icon_pixels)
    path = os.path.join(IMG_DIR, "social-square.png")
    with open(path, 'wb') as f:
        f.write(data)
    print(f"  OK social-square.png ({len(data):,} bytes)")

    print("\n  Todos los assets generados!")


if __name__ == "__main__":
    main()
