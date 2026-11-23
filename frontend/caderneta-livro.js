/* Caderneta em livro: capa que abre, folhas a virar, índice clicável.
   Usa: sb (Supabase), ESCALOES, CROMOS_IMAGENS, CROMOS_DISPONIVEIS, abrirCromoImg (do dashboard). */
(function () {
  var NOMES = { fcps: 'FC Paço de Sousa', ccrdsv: 'CCRDSV Irivo Penafiel' };
  var estado = null;

  function mini(img) { return img.replace('/cromos/', '/cromos-mini/'); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  async function buscarColados(clube) {
    try {
      var r = await sb.auth.getUser(); var user = r.data && r.data.user; if (!user) return new Set();
      var q = await sb.from('cromos_colados').select('num_cromo').eq('user_id', user.id).eq('clube', clube);
      return new Set((q.data || []).map(function (c) { return c.num_cromo; }));
    } catch (e) { return new Set(); }
  }

  function slot(clube, n, colados) {
    var tem = colados.has(n), img = CROMOS_IMAGENS[clube + '-' + n];
    if (tem && img) return '<div class="lv-slot tem" data-n="' + n + '"><img src="' + mini(img) + '" alt=""></div>';
    return '<div class="lv-slot"><span>Nº ' + n + '</span></div>';
  }

  function paginas(clube, colados) {
    var esc_ = ESCALOES[clube], total = CROMOS_DISPONIVEIS[clube].total;
    var P = [];
    var emblema = CROMOS_IMAGENS[clube + '-1'];
    P.push('<div class="lv-pg lv-intro">' + (emblema ? '<img src="' + emblema + '" alt="">' : '') +
      '<h2>' + esc(NOMES[clube]) + '</h2></div>');
    var itens = esc_.map(function (e, k) {
      return '<li class="lv-idx" data-pag="' + (3 + 2 * k) + '"><div><b>' + esc(e.nome) + '</b><small>Cromos ' + e.min + ' a ' + e.max + '</small></div><span>Pág. ' + (3 + 2 * k) + '</span></li>';
    }).join('');
    P.push('<div class="lv-pg"><div class="lv-idx-topo"><h2>Índice</h2><div class="lv-sub" style="border:0;margin:2px 0 0;padding:0">' + total + ' cromos · ' + esc_.length + ' escalões</div></div><ul class="lv-indice">' + itens + '</ul></div>');
    esc_.forEach(function (e) {
      [0, 12].forEach(function (off) {
        var ini = e.min + off, fim = Math.min(e.max, ini + 11), g = '';
        for (var n = ini; n <= fim; n++) g += slot(clube, n, colados);
        P.push('<div class="lv-pg"><h2>' + esc(e.nome) + '</h2><div class="lv-sub">Cromos ' + ini + ' a ' + fim + '</div><div class="lv-grelha">' + g + '</div></div>');
      });
    });
    return P;
  }

  function construir(clube, colados) {
    var modal = document.getElementById('livro-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'livro-modal'; modal.className = 'caderneta-modal';
      document.body.appendChild(modal);
    }
    modal.className = 'caderneta-modal show lv-' + clube;
    modal.innerHTML = '<div class="lv-fundo"><div class="lv-bancada"></div><div class="lv-relva"><div class="lv-campo"><svg viewBox="0 0 1000 1000" preserveAspectRatio="none" fill="none" stroke="rgba(255,255,255,.95)"><path d="M330 90 H1000"/><path d="M330 90 V1000"/><path d="M330 180 A90 90 0 0 0 420 90"/><path d="M640 90 V380 H900 V90"/><path d="M720 90 V220 H820 V90"/></svg></div></div></div>' + '<button class="lv-fechar">✕ Fechar</button>' +
      '<div class="lv-cena fechado"><div class="lv-livro"></div><div class="lv-sombra"></div></div>' +
      '<div class="lv-nav"><button class="lv-seta lv-ant">‹</button><button class="lv-seta lv-prox">›</button></div>';
    var P = paginas(clube, colados), livro = modal.querySelector('.lv-livro'), cena = modal.querySelector('.lv-cena');
    var folhas = [['<div class="lv-capa" style="position:absolute;inset:0"><img src="images/caderneta-' + clube + '.png" alt=""></div>', P[0]]];
    for (var k = 1; k < P.length / 2; k++) folhas.push([P[2 * k - 1], P[2 * k]]);
    folhas.push([P[P.length - 1], '']);
    var els = folhas.map(function (f, i) {
      var d = document.createElement('div'); d.className = 'lv-folha';
      d.innerHTML = '<div class="lv-face lv-frente' + (i === 0 ? ' lv-capa' : '') + '">' + f[0] + (i === 0 ? '' : '<div class="lv-num">' + (2 * i) + '</div>') + '</div>' +
        (i === folhas.length - 1 ? '' : '<div class="lv-face lv-verso">' + f[1] + '<div class="lv-num">' + (2 * i + 1) + '</div></div>');
      livro.appendChild(d); return d;
    });
    estado = { clube: clube, est: 0, max: folhas.length - 1, els: els, cena: cena, modal: modal };
    pinta();
  }

  function pinta() {
    var s = estado;
    s.els.forEach(function (e, i) { e.classList.toggle('virada', i < s.est); e.style.zIndex = i < s.est ? i : (s.els.length - i); });
    s.cena.classList.toggle('fechado', s.est === 0);
    s.modal.querySelector('.lv-ant').disabled = s.est === 0;
    s.modal.querySelector('.lv-prox').disabled = s.est === s.max;
  }

  function ir(d) {
    var s = estado; if (!s) return;
    var n = s.est + d; if (n < 0 || n > s.max) return;
    var f = s.els[d > 0 ? s.est : n]; f.classList.add('virando');
    setTimeout(function () { f.classList.remove('virando'); }, 950);
    s.est = n; pinta();
  }

  function saltar(pag) {
    var alvo = Math.ceil(pag / 2);
    (function passo() { if (!estado || estado.est === alvo) return; ir(estado.est < alvo ? 1 : -1); setTimeout(passo, 260); })();
  }

  function fechar() { var m = document.getElementById('livro-modal'); if (m) { m.classList.remove('show'); m.innerHTML = ''; } estado = null; }

  document.addEventListener('click', function (e) {
    var m = document.getElementById('livro-modal'); if (!m || !m.contains(e.target) || !estado) return;
    if (e.target.closest('.lv-fechar')) return fechar();
    if (e.target.closest('.lv-prox')) return ir(1);
    if (e.target.closest('.lv-ant')) return ir(-1);
    var li = e.target.closest('.lv-idx'); if (li) return saltar(parseInt(li.dataset.pag, 10));
    var sl = e.target.closest('.lv-slot.tem'); if (sl) { var img = CROMOS_IMAGENS[estado.clube + '-' + sl.dataset.n]; if (img) abrirCromoImg(img); }
  });
  document.addEventListener('keydown', function (e) {
    if (!estado) return;
    if (e.key === 'ArrowRight') ir(1); else if (e.key === 'ArrowLeft') ir(-1); else if (e.key === 'Escape') fechar();
  });
  var x0 = null;
  document.addEventListener('pointerdown', function (e) { x0 = (estado && e.target.closest('#livro-modal .lv-cena')) ? e.clientX : null; });
  document.addEventListener('pointerup', function (e) { if (x0 === null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 60) ir(dx < 0 ? 1 : -1); });

  /* Substitui a caderneta antiga */
  window.abrirCaderneta = async function (clube) {
    var colados = await buscarColados(clube);
    construir(clube, colados);
  };
  window.fecharLivro = fechar;
})();
