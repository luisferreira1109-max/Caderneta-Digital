/* Caderneta em livro: capa que abre, folhas a virar, índice clicável.
   Usa: sb (Supabase), ESCALOES, CROMOS_IMAGENS, CROMOS_DISPONIVEIS, abrirCromoImg (do dashboard). */
(function () {
  var NOMES = { fcps: 'FC Paço de Sousa', ccrdsv: 'CCRDSV Irivo Penafiel' };
  var estado = null;
  function nm(t) { return String(t).replace(/\s+Forma[cç][aã]o$/i, ''); }
  var EMB = { fcps: 'images/simbolo paço de sousa/emblema-fcps.png', ccrdsv: 'images/simbolo irivo/emblema-ccrdsv.png' };

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
    var tec = n >= 2 && (n - 2) % 24 >= 21;
    return '<div class="lv-slot' + (tec ? ' lv-tec' : '') + '" data-n="' + n + '"><b>' + n + '</b>' + (tec ? '<em>Treinador</em>' : '') + '</div>';
  }

  function paginas(clube, colados) {
    var esc_ = ESCALOES[clube], total = CROMOS_DISPONIVEIS[clube].total;
    var P = [];
    var emblema = CROMOS_IMAGENS[clube + '-1'];
    P.push('<div class="lv-pg lv-intro">' + (emblema ? '<img src="' + emblema + '" alt="">' : '') +
      '<h2>' + esc(NOMES[clube]) + '</h2></div>');
    var itens = esc_.map(function (e, k) {
      return '<li class="lv-idx" data-pag="' + (3 + 2 * k) + '"><div><b>' + esc(nm(e.nome)) + '</b><small>Cromos ' + e.min + ' a ' + e.max + '</small></div><span>Pág. ' + (3 + 2 * k) + '</span></li>';
    }).join('');
    P.push('<div class="lv-pg"><div class="lv-idx-topo"><h2>Índice</h2><div class="lv-sub" style="border:0;margin:2px 0 0;padding:0">' + total + ' cromos · ' + esc_.length + ' escalões</div></div><ul class="lv-indice">' + itens + '</ul></div>');
    esc_.forEach(function (e) {
      [0, 12].forEach(function (off) {
        var ini = e.min + off, fim = Math.min(e.max, ini + 11), g = '';
        for (var n = ini; n <= fim; n++) g += slot(clube, n, colados);
        P.push('<div class="lv-pg"><div class="lv-cab"><img src="' + EMB[clube] + '" alt=""><h2' + (nm(e.nome).length > 11 ? ' class="lv-longo"' : '') + '>' + esc(nm(e.nome)) + '</h2></div><div class="lv-sub">' + esc(NOMES[clube]) + ' · 2026/2027</div><div class="lv-grelha">' + g + '</div></div>');
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
    modal.innerHTML = '<div class="lv-fundo"><div class="lv-bancada"></div><div class="lv-relva"><div class="lv-campo"><svg viewBox="0 0 1000 1000" preserveAspectRatio="none" fill="none" stroke="rgba(255,255,255,.95)"><path d="M330 90 H1000"/><path d="M330 90 V1000"/><path d="M330 180 A90 90 0 0 0 420 90"/><path d="M640 90 V380 H900 V90"/><path d="M720 90 V220 H820 V90"/></svg></div></div></div>' + '<button class="lv-fechar">✕ Fechar</button><button class="lv-indbtn">← Índice</button>' +
      '<div class="lv-cena fechado"><div class="lv-livro"></div><div class="lv-sombra"></div></div>' +
      '<div class="lv-nav"><button class="lv-seta lv-ant">‹</button><button class="lv-seta lv-prox">›</button></div>';
    var P = paginas(clube, colados), livro = modal.querySelector('.lv-livro'), cena = modal.querySelector('.lv-cena');
    var folhas = [['<div class="lv-capa" style="position:absolute;inset:0"><img class="c3d" src="images/caderneta-' + clube + '.png" alt=""></div>', P[0]]];
    for (var k = 1; k < P.length / 2; k++) folhas.push([P[2 * k - 1], P[2 * k]]);
    folhas.push([P[P.length - 1], '']);
    var els = folhas.map(function (f, i) {
      var d = document.createElement('div'); d.className = 'lv-folha';
      d.innerHTML = '<div class="lv-borda"></div><div class="lv-face lv-frente' + (i === 0 ? ' lv-capa' : '') + '">' + f[0] + (i === 0 ? '' : '<div class="lv-num">' + (2 * i) + '</div>') + '</div>' +
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
    s.modal.querySelector('.lv-ant').disabled = s.est <= 1;
    s.modal.classList.toggle('lv-nao-indice', s.est >= 2);
    s.modal.querySelector('.lv-prox').disabled = s.est === s.max;
  }

  function ir(d) {
    var s = estado; if (!s) return;
    var n = s.est + d; if (n < 1 || n > s.max) return;
    var f = s.els[d > 0 ? s.est : n]; f.classList.add('virando', 'lv-som');
    setTimeout(function () { f.classList.remove('lv-som'); }, 420);
    s.cena.classList.add('solta');
    clearTimeout(s.tsolta);
    setTimeout(function () { f.classList.remove('virando'); }, 950);
    s.est = n; pinta();
    s.tsolta = setTimeout(function () { if (estado === s && s.est === 0) s.cena.classList.remove('solta'); }, 1000);
  }

  function saltar(pag) {
    var alvo = Math.ceil(pag / 2);
    (function passo() { if (!estado || estado.est === alvo) return; ir(estado.est < alvo ? 1 : -1); setTimeout(passo, 260); })();
  }

  function fechar() { var m = document.getElementById('livro-modal'); if (m) { m.classList.remove('show'); m.innerHTML = ''; } estado = null; }

  document.addEventListener('click', function (e) {
    var m = document.getElementById('livro-modal'); if (!m || !m.contains(e.target) || !estado) return;
    if (e.target.closest('.lv-fechar')) return fechar();
    if (e.target.closest('.lv-indbtn')) return saltar(2);
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
  var VIDEOS = { fcps: 'images/abrir-fcps.mp4', ccrdsv: 'images/abrir-ccrdsv.mp4' };
  function intro(clube) {
    var s = estado, v = document.createElement('video'), feito = false;
    v.className = 'lv-video'; v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = VIDEOS[clube];
    var w = document.createElement('div'); w.className = 'lv-vid'; w.appendChild(v);
    s.modal.classList.add('lv-intro-on'); s.modal.appendChild(w);
    s.est = 1; pinta();
    function fim() {
      if (feito) return; feito = true;
      s.modal.classList.remove('lv-intro-on'); w.classList.add('sai');
      setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); }, 900);
    }
    v.addEventListener('timeupdate', function () { if (v.currentTime >= 2.4) fim(); });
    v.addEventListener('ended', fim); v.addEventListener('error', fim);
    setTimeout(fim, 6000);
    var pr = v.play(); if (pr && pr.catch) pr.catch(fim);
  }
  window.abrirCaderneta = async function (clube) {
    var colados = await buscarColados(clube);
    construir(clube, colados);
    if (VIDEOS[clube]) intro(clube);
  };
  /* Abre o livro direto na página do cromo (sem vídeo nem animação) e devolve o espaço onde ele vai colar */
  window.abrirLivroParaColar = async function (clube, num) {
    var colados = await buscarColados(clube);
    colados.delete(num);
    construir(clube, colados);
    var s = estado, k = 0, es = ESCALOES[clube];
    for (var i = 0; i < es.length; i++) { if (num >= es[i].min && num <= es[i].max) { k = i; break; } }
    s.modal.classList.add('lv-sem-anim');
    s.est = 2 + k; pinta();
    void s.modal.offsetWidth;
    setTimeout(function () { s.modal.classList.remove('lv-sem-anim'); }, 60);
    return s.modal.querySelector('.lv-slot[data-n="' + num + '"]');
  };
  window.fecharLivro = fechar;
})();
