"""Rebuild _data/toolmarks.yml from Simple Icons.

The marks are inlined into the page as bare <path> data so they can be tinted
with currentColor and cost no extra requests. Simple Icons is CC0; the marks
remain the trademarks of their projects and are used only to say what the work
is built with.

Note that Matplotlib has no Simple Icons mark, which is why it appears in the
profile skills list but not in the row.

    python3 tools/figures/fetch_toolmarks.py
"""
import pathlib
import re
import urllib.request

CDN = "https://cdn.jsdelivr.net/npm/simple-icons@15/icons/{slug}.svg"

ORDER = [
    ("python", "Python"),
    ("cplusplus", "C++"),
    ("openjdk", "Java"),
    ("pytorch", "PyTorch"),
    ("huggingface", "Transformers"),
    ("scikitlearn", "scikit-learn"),
    ("numpy", "NumPy"),
    ("pandas", "Pandas"),
    ("d3", "D3"),
    ("git", "Git"),
    ("github", "GitHub"),
]

HEADER = """# Monochrome tool marks for the About Me skills row.
# Paths are from Simple Icons (CC0); the marks themselves remain the
# trademarks of their projects and are used here only to say what the work
# is built with. Regenerate with tools/figures/fetch_toolmarks.py.
"""


def main():
    rows = []
    for slug, label in ORDER:
        with urllib.request.urlopen(CDN.format(slug=slug)) as response:
            svg = response.read().decode()
        match = re.search(r'<path[^>]*\sd="([^"]+)"', svg)
        if not match:
            raise SystemExit(f"no path found in the {slug} mark")
        rows.append(f'- slug: {slug}\n  label: "{label}"\n  path: "{match.group(1)}"\n')

    pathlib.Path("_data/toolmarks.yml").write_text(HEADER + "".join(rows))
    print(f"wrote {len(rows)} marks")


if __name__ == "__main__":
    main()
