"""Ajoute ou met à jour des textes de l'espace connecté.

Usage : python3 scripts/i18n-add.py fichier.json
Format : {"clé": ["texte anglais", "texte français"]}
"""
import json
import re
import sys

PATH = "src/admin/i18n.ts"
FR_MARKER = "const fr: Record<MessageKey, string> = {"
EN_MARKER = "const en = {"


def end_of(src, marker):
    i = src.index(marker)
    depth = 0
    k = src.index("{", i)
    while True:
        if src[k] == "{":
            depth += 1
        elif src[k] == "}":
            depth -= 1
            if depth == 0:
                return k
        k += 1


def main():
    src = open(PATH).read()
    keys = json.load(open(sys.argv[1]))
    new = {k: v for k, v in keys.items() if f'  "{k}":' not in src}
    updated = {k: v for k, v in keys.items() if k not in new}
    for key, (en, fr) in updated.items():
        pat = re.compile(r'(\n  "' + re.escape(key) + r'":\s*)("(?:[^"\\]|\\.)*")')
        fr_start = src.index(FR_MARKER)
        m = pat.search(src, fr_start)
        src = src[: m.start(2)] + json.dumps(fr, ensure_ascii=False) + src[m.end(2):]
        fr_start = src.index(FR_MARKER)
        m = pat.search(src, 0, fr_start)
        src = src[: m.start(2)] + json.dumps(en, ensure_ascii=False) + src[m.end(2):]
    k = end_of(src, FR_MARKER)
    src = src[:k] + "".join(f"  {json.dumps(a)}: {json.dumps(b[1], ensure_ascii=False)},\n" for a, b in new.items()) + src[k:]
    k = end_of(src, EN_MARKER)
    src = src[:k] + "".join(f"  {json.dumps(a)}: {json.dumps(b[0], ensure_ascii=False)},\n" for a, b in new.items()) + src[k:]
    open(PATH, "w").write(src)
    print(f"{len(new)} ajoutées, {len(updated)} mises à jour")


if __name__ == "__main__":
    main()
