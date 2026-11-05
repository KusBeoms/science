#!/usr/bin/env python3
"""Build four deterministic 512px RGBA detail packs; originals stay local and unchanged.
Run: python3 -m pip install -r client/tools/texture-requirements.txt
     python3 client/tools/build_surface_textures.py
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageOps, ImageStat

CLIENT = Path(__file__).resolve().parents[1]
SOURCE = CLIENT / 'texture' / 'Uncompressed'
DEST = CLIENT / 'public' / 'assets' / 'surfaces'
SIZE = 512
# kind order is shared with render/surface-detail.ts. RGB color/lighting stays in vertex colors.
SETS = [
 ('natural-a', [
  ('lawn', 'Grass005_4K-JPG/Grass005_4K-JPG_Color.jpg'),
  ('forest-grass', 'Grass003_4K-JPG/Grass003_4K-JPG_Color.jpg'),
  ('rough-lawn', 'PX_Grass_Lawn_04_4K/PX_Grass_Lawn_04_albedo.jpg'),
  ('pasture', 'Poliigon_GrassPatchyGround_4585 (1)/8K/Poliigon_GrassPatchyGround_4585_BaseColor.jpg'),
 ]),
 ('natural-b', [
  ('soil', 'Ground103_8K-JPG/Ground103_8K-JPG_Color.jpg'),
  ('dry-earth', 'Ground104_8K-JPG/Ground104_8K-JPG_Color.jpg'),
  ('pebbles', 'dry_river_pebbles_4k.blend/textures/dry_river_pebbles_diff_4k.jpg'),
  ('cliff', 'marble_cliff_03_4k.blend/textures/marble_cliff_03_diff_4k.jpg'),
 ]),
 ('built-a', [
  ('paving', 'PavingStones150_4K-JPG/PavingStones150_4K-JPG_Color.jpg'),
  ('asphalt', 'Road011A_4K-JPG/Road011A_4K-JPG_Color.jpg'),
  ('wood', 'Wood095_8K-JPG/Wood095_8K-JPG_Color.jpg'),
  ('corrugated', 'CorrugatedSteel009_4K-JPG/CorrugatedSteel009_4K-JPG_Color.jpg'),
 ]),
 ('built-b', [
  ('steel', 'Poliigon_MetalSteelBrushed_7174/8K/Poliigon_MetalSteelBrushed_7174_BaseColor.jpg'),
  ('rust', 'Metal055C_4K-JPG/Metal055C_4K-JPG_Color.jpg'),
  ('tile', 'Tiles138_4K-JPG/Tiles138_4K-JPG_Color.jpg'),
  ('fabric', 'Poliigon_BoucleFabricBubbly_7827/8K/Poliigon_BoucleFabricBubbly_7827_BaseColor.jpg'),
 ]),
]


def channel(source: Path, kind: str):
    with Image.open(source) as image:
        original = list(image.size)
        # Road011A includes yellow lane markings; extract an unmarked square of asphalt.
        # All game lane markings remain in the existing geometry, so no duplicate painted lanes.
        crop = None
        if kind == 'asphalt':
            w, h = image.size
            crop = [round(w * .15), round(h * .18), round(w * .35), round(h * .38)]
            image = image.crop(crop)
        image = ImageOps.grayscale(image)
        w, h = image.size
        rw, rh = (SIZE, max(1, round(SIZE * h / w))) if w >= h else (max(1, round(SIZE * w / h)), SIZE)
        small = image.resize((rw, rh), Image.Resampling.LANCZOS)
        image = Image.new('L', (SIZE, SIZE))
        for y in range(0, SIZE, rh):
            for x in range(0, SIZE, rw):
                image.paste(small, (x, y))
        stats = ImageStat.Stat(image)
        mean, deviation = stats.mean[0], stats.stddev[0]
        gain = min(4.0, 30.0 / max(deviation, 1.0))
        image = image.point([max(48, min(208, round(128 + (v - mean) * gain))) for v in range(256)])
    return image, {'resolution': original, 'cropPixels': crop, 'grayMean': round(mean, 3), 'grayStddev': round(deviation, 3)}


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = {'schema': 1, 'size': SIZE, 'encoding': 'linear neutral detail, 128/255 midpoint',
                'channelOrder': 'RGBA, alpha is data, not opacity', 'packs': [], 'materials': []}
    for pack, entries in SETS:
        bands = []
        for kind, name in entries:
            path = SOURCE / name
            band, info = channel(path, kind)
            bands.append(band)
            manifest['materials'].append({'id': len(manifest['materials']), 'kind': kind,
                'pack': pack + '.png', 'channel': 'RGBA'[len(bands) - 1],
                'source': 'texture/Uncompressed/' + name, 'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(), **info})
        output = DEST / (pack + '.png')
        Image.merge('RGBA', bands).save(output, optimize=True, compress_level=9)
        manifest['packs'].append({'file': output.name, 'width': SIZE, 'height': SIZE,
            'bytes': output.stat().st_size, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest()})
    manifest['downloadBytes'] = sum(p['bytes'] for p in manifest['packs'])
    manifest['gpuBytesWithMipmaps'] = 4 * sum(4 * (SIZE >> level) ** 2 for level in range(SIZE.bit_length()))
    (DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'packs': len(SETS), 'materials': len(manifest['materials']),
        'downloadBytes': manifest['downloadBytes'], 'gpuBytesWithMipmaps': manifest['gpuBytesWithMipmaps']}))


if __name__ == '__main__':
    main()
