from PIL import Image
import numpy as np

CANVAS = 1024
SAFE_ZONE = int(CANVAS * 0.66)      # ~683
TARGET = int(SAFE_ZONE * 0.90)      # ~615 (extra margin)

def crop_to_visible(im, alpha_thresh=5):
    arr = np.array(im)
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > alpha_thresh)
    if len(xs) == 0:
        raise ValueError("Image is fully transparent.")
    bbox = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    return im.crop(bbox)

def fit_center(src_path, out_path):
    im = Image.open(src_path).convert("RGBA")
    im = crop_to_visible(im)

    w, h = im.size
    scale = TARGET / max(w, h)
    new_size = (int(round(w * scale)), int(round(h * scale)))
    im = im.resize(new_size, Image.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    x = (CANVAS - new_size[0]) // 2
    y = (CANVAS - new_size[1]) // 2
    canvas.alpha_composite(im, (x, y))
    canvas.save(out_path)
    print(f"Saved: {out_path}  (logo={new_size}, safe={SAFE_ZONE}, target={TARGET})")

fit_center("assets/icon.png", "assets/adaptive-icon.png")
fit_center("assets/icon_white.png", "assets/adaptive-icon-white.png")
