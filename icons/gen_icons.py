#!/usr/bin/env python3
"""Generate app icons with no third-party deps (pure PNG writer)."""
import struct, zlib, math, os

def draw(size, ss=4):
    W = size * ss
    # colors (r,g,b)
    bg1 = (15, 23, 42)      # #0f172a
    bg2 = (30, 41, 59)      # #1e293b
    green = (34, 197, 94)   # #22c55e
    white = (241, 245, 249)
    px = bytearray(W * W * 4)

    cx = cy = W / 2
    ring_r = W * 0.34
    ring_w = W * 0.085
    tri = W * 0.11  # play-triangle half-size

    def put(x, y, c, a=1.0):
        i = (y * W + x) * 4
        if a >= 1:
            px[i], px[i+1], px[i+2], px[i+3] = c[0], c[1], c[2], 255
        else:
            for k in range(3):
                px[i+k] = int(px[i+k] * (1 - a) + c[k] * a)
            px[i+3] = 255

    for y in range(W):
        for x in range(W):
            # vertical gradient background
            t = y / W
            bg = tuple(int(bg1[k] * (1 - t) + bg2[k] * t) for k in range(3))
            put(x, y, bg)

            dx, dy = x - cx, y - cy
            d = math.hypot(dx, dy)
            # ring (open at bottom-right for a "timer" look): full ring is fine
            edge = 1.2 * ss
            ring_a = 0.0
            if abs(d - ring_r) < ring_w / 2 + edge:
                inner = smooth(ring_w / 2 - abs(d - ring_r), edge)
                ring_a = inner
            if ring_a > 0:
                put(x, y, green, ring_a)

            # play triangle (pointing right)
            # triangle vertices relative to center
            tx = dx + tri * 0.25
            if -tri <= dy <= tri:
                # right edge x-limit narrows toward tips
                frac = 1 - abs(dy) / tri
                if -tri * 0.6 <= tx <= tri * 1.1 * frac:
                    put(x, y, white, 1.0)

    return downsample(px, W, size, ss)

def smooth(v, edge):
    if v <= -edge: return 0.0
    if v >= edge: return 1.0
    return (v + edge) / (2 * edge)

def downsample(px, W, size, ss):
    out = bytearray(size * size * 4)
    for y in range(size):
        for x in range(size):
            r = g = b = a = 0
            for oy in range(ss):
                for ox in range(ss):
                    i = ((y * ss + oy) * W + (x * ss + ox)) * 4
                    r += px[i]; g += px[i+1]; b += px[i+2]; a += px[i+3]
            n = ss * ss
            j = (y * size + x) * 4
            out[j] = r // n; out[j+1] = g // n; out[j+2] = b // n; out[j+3] = a // n
    return out

def write_png(path, size, rgba):
    def chunk(typ, data):
        c = typ + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    raw = bytearray()
    stride = size * 4
    for y in range(size):
        raw.append(0)
        raw.extend(rgba[y*stride:(y+1)*stride])
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)

here = os.path.dirname(os.path.abspath(__file__))
for s in (180, 192, 512):
    write_png(os.path.join(here, f"icon-{s}.png"), s, draw(s))
    print("wrote icon-%d.png" % s)
