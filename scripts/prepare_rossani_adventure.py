import os
import sys
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
from rembg import remove

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_ASSETS = os.path.join(ROOT_DIR, 'assets')
DEST_GAME = os.path.join(ROOT_DIR, 'games', 'parco-rossani', 'game')

CHAR_DIR_BIAGIO = os.path.join(DEST_GAME, 'assets', 'characters', 'biagio')
CHAR_DIR_BEPPO = os.path.join(DEST_GAME, 'assets', 'characters', 'beppo')
BG_DIR = os.path.join(DEST_GAME, 'assets', 'backgrounds')
AUDIO_DIR = os.path.join(DEST_GAME, 'assets', 'audio')

os.makedirs(CHAR_DIR_BIAGIO, exist_ok=True)
os.makedirs(CHAR_DIR_BEPPO, exist_ok=True)
os.makedirs(BG_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

print("🚀 Step 1: Processing Backgrounds (Parco Rossani)...")
bg_path = os.path.join(SRC_ASSETS, 'parco rossani.jpg')
if os.path.exists(bg_path):
    bg_orig = Image.open(bg_path).convert('RGB')
    target_w, target_h = 1280, 720
    
    # Aspect fill & crop
    src_w, src_h = bg_orig.size
    scale = max(target_w / src_w, target_h / src_h)
    new_w, new_h = int(src_w * scale), int(src_h * scale)
    bg_scaled = bg_orig.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    bg_day = bg_scaled.crop((left, top, left + target_w, top + target_h))
    
    # Save standard crisp background
    bg_day.save(os.path.join(BG_DIR, 'parco_rossani.jpg'), quality=92)
    print("  -> Saved parco_rossani.jpg (1280x720)")
    
    # Create retro 16-bit arcade pixelated variant
    pixel_factor = 4
    small = bg_day.resize((target_w // pixel_factor, target_h // pixel_factor), Image.Resampling.BILINEAR)
    enhancer = ImageEnhance.Color(small)
    saturated = enhancer.enhance(1.35)
    contrast = ImageEnhance.Contrast(saturated).enhance(1.2)
    bg_retro = contrast.resize((target_w, target_h), Image.Resampling.NEAREST)
    bg_retro.save(os.path.join(BG_DIR, 'parco_rossani_retro.jpg'), quality=92)
    print("  -> Saved parco_rossani_retro.jpg (Pixel-art / 16-bit arcade)")
    
    # Create dusk/synthwave sunset variant
    # Tint towards magenta/cyan dusk
    r, g, b = bg_day.split()
    r = r.point(lambda p: min(255, int(p * 1.15 + 15)))
    g = g.point(lambda p: int(p * 0.75))
    b = b.point(lambda p: min(255, int(p * 1.35 + 20)))
    bg_dusk = Image.merge('RGB', (r, g, b))
    bg_dusk.save(os.path.join(BG_DIR, 'parco_rossani_dusk.jpg'), quality=92)
    print("  -> Saved parco_rossani_dusk.jpg (Dusk/Cyberpunk)")

TARGET_SPRITE_HEIGHT = 800

def process_sprite(src_filename, dest_dir, expression_name, flip_h=False):
    src_file = os.path.join(SRC_ASSETS, src_filename)
    if not os.path.exists(src_file):
        print(f"⚠️ Warning: File not found {src_filename}")
        return
    
    print(f"✂️ Processing {src_filename} -> {expression_name}.png (flip_h={flip_h})...")
    raw_img = Image.open(src_file)
    
    # 1. Background removal via rembg
    nobg = remove(raw_img)
    
    # 2. Bounding box crop
    bbox = nobg.getbbox()
    if bbox:
        # Keep bottom edge anchored so the torso is not floating
        x0, y0, x1, y1 = bbox
        # Crop from top of hair to bottom of image
        cropped = nobg.crop((x0, y0, x1, nobg.height))
    else:
        cropped = nobg
    
    # 3. Flip horizontally if requested (so characters face each other)
    if flip_h:
        cropped = ImageOps.mirror(cropped)
    
    # 4. Standardize height to TARGET_SPRITE_HEIGHT
    aspect = cropped.width / cropped.height
    final_w = int(TARGET_SPRITE_HEIGHT * aspect)
    resized = cropped.resize((final_w, TARGET_SPRITE_HEIGHT), Image.Resampling.LANCZOS)
    
    out_path = os.path.join(dest_dir, f"{expression_name}.png")
    resized.save(out_path, format="PNG", optimize=True)
    print(f"  -> Saved {out_path} ({final_w}x{TARGET_SPRITE_HEIGHT})")

print("\n🚀 Step 2: Processing Biagio Sprites (Facing Right)...")
biagio_manifest = [
    ('biagio.png', 'normal'),
    ('biagio arrabbiato.jpg', 'arrabbiato'),
    ('biagio confuso.jpg', 'confuso'),
    ('biagio triste.jpg', 'triste'),
]

for src_name, expr in biagio_manifest:
    process_sprite(src_name, CHAR_DIR_BIAGIO, expr, flip_h=False)

print("\n🚀 Step 3: Processing Beppo Sprites (Flipped Facing Left towards Biagio)...")
beppo_manifest = [
    ('beppo.png', 'normal'),
    ('beppo arrabbiato.jpg', 'arrabbiato'),
    ('beppo confuso.jpg', 'confuso'),
    ('beppo triste.jpg', 'triste'),
]

for src_name, expr in beppo_manifest:
    process_sprite(src_name, CHAR_DIR_BEPPO, expr, flip_h=True)

print("\n🎉 Asset processing complete!")
