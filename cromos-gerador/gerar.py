#!/usr/bin/env python3
"""Gera as imagens de todos os cromos (webp) a partir de jogadores.json.
Uso:  python3 gerar.py            (todos)
      python3 gerar.py fcps-132   (só um)
Saída: ../frontend/images/cromos/<clube>-<num>.webp  e  ../frontend/jogadores-dados.js
"""
import json, re, sys, os, html
from playwright.sync_api import sync_playwright
from PIL import Image
import io

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, '..', 'frontend', 'images', 'cromos')
CLUBES = {
  'fcps':   dict(total=216, nome='FC PAÇO DE SOUSA',       emb='emblemas/fcps.png',   box=(298, 28, 80, 100),
                 lend=[132], epic=[25,50,75,100,125,150,175,200],
                 raro=[10,20,30,40,60,70,80,90,110,120,130,140,160,170,180,190,210]),
  'ccrdsv': dict(total=240, nome='CCRDSV IRIVO PENAFIEL',  emb='emblemas/ccrdsv.png', box=(274, 28, 104, 101),
                 lend=[13,223], epic=[24,48,72,96,120,144,168,192,216],
                 raro=[12,36,60,84,108,132,156,180,204,228]),
}
# estilo: lendário = azul e dourado | raro e épico = dourado liso | comum = prata
def estilo(clube, n):
    c = CLUBES[clube]
    if n in c['lend']: return 'lendario'
    if n in c['epic'] or n in c['raro']: return 'raro'
    return 'comum'

SILUETA = {'comum': ('#8f979f', .55), 'raro': ('#a8740f', .40), 'lendario': ('#9cc4ff', .38)}

def gerar_html(modelo, clube, n, j):
    c = CLUBES[clube]; est = estilo(clube, n); h = modelo[est]
    nome = (j.get('nome') or 'JOGADOR').upper()
    pos = (j.get('pos') or '').upper(); cam = str(j.get('camisola') or '')
    fs = min(34, 330 / (len(nome) * 0.70)); fs = round(fs, 1)
    fx, fy, fw, fh = j.get('fx', 85), j.get('fy', 42), j.get('fw', 230), j.get('fh', 303)
    foto = j.get('foto')
    if foto and os.path.exists(os.path.join(AQUI, foto)):
        photo = f'<image href="{foto}" x="{fx}" y="{fy}" width="{fw}" height="{fh}" clip-path="url(#cp)" filter="url(#sh)"/>'
    else:
        col, op = SILUETA[est]
        photo = (f'<g clip-path="url(#cp)" fill="{col}" opacity="{op}"><circle cx="200" cy="148" r="52"/>'
                 f'<path d="M92,345 C92,262 140,222 200,222 C260,222 308,262 308,345 Z"/></g>')
    x, y, w, hh = c['box']
    emb = f'<image href="{c["emb"]}" x="{x}" y="{y}" width="{w}" height="{hh}" preserveAspectRatio="xMaxYMin meet" filter="url(#sh)"/>'
    if est == 'lendario' and clube == 'ccrdsv':
        # luz clara atrás do emblema (o verde/preto perde-se no azul)
        cx, cy, r = x + w / 2, y + hh / 2, max(w, hh) * 0.60
        emb = (f'<defs><radialGradient id="egl"><stop offset="0" stop-color="#ffffff" stop-opacity="1"/>'
               f'<stop offset=".72" stop-color="#ffffff" stop-opacity=".97"/><stop offset=".9" stop-color="#eaf2ff" stop-opacity=".55"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient></defs>'
               f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#egl)"/>') + emb
    h = re.sub(r'<image href="luis_cut\.png"[^>]*/>', lambda m: photo, h)
    h = re.sub(r'<image href="fcps\.png"[^>]*/>', lambda m: emb, h)
    h = re.sub(r'(<text x="80" y="104"[^>]*>)AV(</text>)', lambda m: m.group(1) + html.escape(pos) + m.group(2), h)
    h = re.sub(r'(<text x="80" y="152"[^>]*>)8(</text>)', lambda m: m.group(1) + html.escape(cam) + m.group(2), h)
    h = re.sub(r'(<text x="200" y="426"[^>]*?)font-size="34"([^>]*>)LUÍS FERREIRA(</text>)',
               lambda m: f'{m.group(1)}font-size="{fs}"{m.group(2)}{html.escape(nome)}{m.group(3)}', h)
    h = h.replace('>FC PAÇO DE SOUSA<', f'>{c["nome"]}<').replace('>Nº 132<', f'>Nº {n}<')
    # clube e Nº do cromo maiores (legíveis em tamanho pequeno)
    fc = round(min(17, 310 / (len(c['nome']) * 0.80)), 1)
    h = re.sub(r'y="456"( text-anchor="middle") font-size="12" font-weight="600"( fill="[^"]*") letter-spacing="4"',
               lambda m: f'y="466"{m.group(1)} font-size="{fc}" font-weight="700"{m.group(2)} letter-spacing="2"', h)
    h = re.sub(r'y="544"( text-anchor="middle") font-size="14" font-weight="700"( fill="[^"]*") letter-spacing="3"',
               lambda m: f'y="546"{m.group(1)} font-size="26" font-weight="800"{m.group(2)} letter-spacing="2"', h)
    return h

def main():
    dados = json.load(open(os.path.join(AQUI, 'jogadores.json'), encoding='utf-8'))
    modelo = {e: open(os.path.join(AQUI, 'modelos', e + '.html'), encoding='utf-8').read() for e in ('comum', 'raro', 'lendario')}
    alvo = set(sys.argv[1:])
    os.makedirs(SAIDA, exist_ok=True)
    tmp = os.path.join(AQUI, '_tmp.html')
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = {1: b.new_page(viewport={'width': 640, 'height': 960}, device_scale_factor=1),
              2: b.new_page(viewport={'width': 640, 'height': 960}, device_scale_factor=2)}
        for clube, c in CLUBES.items():
            for n in range(1, c['total'] + 1):
                k = f'{clube}-{n}'
                if alvo and k not in alvo: continue
                esc = 2 if estilo(clube, n) == 'lendario' else 1   # lendários em alta resolução
                open(tmp, 'w', encoding='utf-8').write(gerar_html(modelo, clube, n, dados.get(k, {})))
                pg[esc].goto('file://' + tmp); pg[esc].wait_for_timeout(60)
                im = Image.open(io.BytesIO(pg[esc].screenshot(omit_background=True)))
                # corta a margem transparente (proporção 2:3)
                im = im.crop((20 * esc, 30 * esc, 620 * esc, 930 * esc))
                im.save(os.path.join(SAIDA, k + '.webp'), 'WEBP', quality=86, method=6)
        b.close()
    os.remove(tmp)
    # dados dos jogadores para o site
    out = {k: {'nome': v.get('nome', ''), 'escalao': v.get('escalao', '')} for k, v in dados.items() if not k.startswith('_') and v.get('nome')}
    js = '// Gerado por cromos-gerador/gerar.py - não editar à mão.\nconst JOGADORES = ' + json.dumps(out, ensure_ascii=False, indent=2) + ';\n'
    open(os.path.join(AQUI, '..', 'frontend', 'jogadores-dados.js'), 'w', encoding='utf-8').write(js)
    print('ok')
if __name__ == '__main__': main()
