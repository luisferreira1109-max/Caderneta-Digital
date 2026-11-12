/* ===== ANIMAÇÃO DE ABERTURA DE PACKS (Caderneta Digital) =====
   Pack normal:  loading  ->  cromos em fila
   Pack lendário: loading -> abertura de estádio -> cromo dourado -> revelação -> loading -> cromos em fila
   Se sair mais do que um lendário, mostra-se o de número mais baixo. */
(function () {
  var ICONE = 'images/Logo/logo-icon.png';

  var LENDARIOS = {
    'fcps-132':   { nome: 'Luís Ferreira', pos: 'AV', posNome: 'Avançado', clube: 'FC Paço de Sousa',      emblema: 'images/simbolo paço de sousa/emblema-fcps.png' },
    'ccrdsv-13':  { nome: 'Duarte Silva',  pos: 'DE', posNome: 'Defesa',   clube: 'CCRDSV Irivo Penafiel', emblema: 'images/simbolo irivo/emblema-ccrdsv.png' },
    'ccrdsv-223': { nome: 'Vitor Ferreira', pos: 'AV', posNome: 'Avançado', clube: 'CCRDSV Irivo Penafiel', emblema: 'images/simbolo irivo/emblema-ccrdsv.png' }
  };

  var layer = null, cancelado = false, timers = [], esperaClique = null;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esperar(ms) {
    return new Promise(function (res) {
      var t = setTimeout(res, ms);
      timers.push(t);
    });
  }
  function limparTimers() { timers.forEach(clearTimeout); timers = []; }

  function limpar() {
    limparTimers();
    if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    layer = null;
  }

  function mostrarLoading() {
    layer.querySelectorAll('.pa-load').forEach(function (n) { n.remove(); });
    var l = el('div', 'pa-load', '<div class="pa-load-line"></div><img class="pa-load-icon" src="' + ICONE + '" alt="">');
    layer.appendChild(l);
    return l;
  }

  async function loading(ms) {
    var l = mostrarLoading();
    await esperar(ms);
    return l;
  }

  function escolherLendario(cromos) {
    var l = cromos.filter(function (c) { return c.raridade === 'lendario'; });
    if (!l.length) return null;
    l.sort(function (a, b) { return a.num - b.num; });
    return l[0];
  }

  /* ---------- abertura de estádio + cromo lendário ---------- */
  function metade(lado, emblema) {
    return '<div class="pa-door ' + lado + '"><div class="pa-door-in"><img class="pa-shield" src="' + emblema + '" alt=""></div></div>';
  }

  async function momentoLendario(cromo, info) {
    var imgSrc = (typeof CROMOS_IMAGENS !== 'undefined' && CROMOS_IMAGENS[cromo.clube + '-' + cromo.num]) || '';
    var s = el('div', 'pa-stadium');
    var cam = el('div', 'pa-cam');
    cam.appendChild(el('div', 'pa-wall l'));
    cam.appendChild(el('div', 'pa-wall r'));
    cam.appendChild(el('div', 'pa-floor'));
    for (var i = 0; i < 9; i++) {
      var x = 6 + i * 11.5;
      var sp = el('div', 'pa-spot'); sp.style.left = x + '%';
      var bm = el('div', 'pa-beam'); bm.style.left = 'calc(' + x + '% - 4vmin)';
      var dir = (x < 50 ? 1 : -1);
      bm.style.setProperty('--a0', (dir * (4 + (i % 3) * 4)) + 'deg');
      bm.style.setProperty('--a1', (dir * -1 * (3 + (i % 4) * 3)) + 'deg');
      bm.style.animationDelay = (-i * 0.4) + 's';
      cam.appendChild(bm); cam.appendChild(sp);
    }
    // ecrã dourado com o escudo, dividido em duas portas
    var scr = el('div', 'pa-screen', '<div class="pa-door-light"></div>' + metade('l', info.emblema) + metade('r', info.emblema) + '<div class="pa-shine"></div>');
    cam.appendChild(scr);
    s.appendChild(cam);

    // cromo lendário: aparece na parede amarela, quando a porta abre
    var wrap = el('div', 'pa-cardwrap');
    wrap.appendChild(el('div', 'pa-front', imgSrc ? '<img src="' + imgSrc + '" alt="' + info.nome + '">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fff;color:#333;font:700 28px Inter,sans-serif">#' + cromo.num + '</div>'));
    var inf = el('div', 'pa-info',
      '<div class="pa-badge">CROMO LENDÁRIO</div>' +
      '<div class="pa-nome">' + info.nome + '</div>' +
      '<div class="pa-sub">' + info.clube + ' &middot; ' + info.pos + ' &middot; ' + info.posNome + '</div>');
    var cont = el('div', 'pa-cont', 'Toca para continuar');
    s.appendChild(el('div', 'pa-dim'));
    s.appendChild(wrap); s.appendChild(inf); s.appendChild(cont);
    layer.appendChild(s);
    layer.querySelectorAll('.pa-load').forEach(function (n) { n.remove(); });

    await esperar(2100);
    scr.classList.add('charge');          // o escudo ganha brilho
    await esperar(800);
    scr.classList.add('seam');            // aparece a risca da porta
    await esperar(700);
    scr.classList.add('open');            // abre ao meio, uma metade para cada lado
    await esperar(700);
    s.classList.add('com-cromo');         // o cromo aparece na parede amarela
    wrap.classList.add('in');
    await esperar(1300);
    inf.classList.add('show');
    await esperar(700);
    cont.classList.add('show');

    // espera clique
    await new Promise(function (res) {
      esperaClique = res;
      layer.addEventListener('click', function h() { layer.removeEventListener('click', h); res(); });
    });
    esperaClique = null;
  }

  /* ---------- fluxo principal ---------- */
  async function iniciar(cromos, tipo, fim) {
    if (layer) limpar();
    cancelado = false;
    layer = el('div'); layer.id = 'pa-layer';
    var skip = el('button', 'pa-skip', 'Saltar &rsaquo;');
    skip.type = 'button';
    skip.onclick = function (e) {
      e.stopPropagation();
      cancelado = true;
      limparTimers();
      if (esperaClique) esperaClique();
      terminar();
    };
    layer.appendChild(skip);
    document.body.appendChild(layer);

    var terminado = false;
    function terminar() {
      if (terminado) return;
      terminado = true;
      limpar();
      if (typeof fim === 'function') fim();
    }
    try {
      mostrarLoading();
      await esperar(1500);
      if (cancelado) return;

      var lend = escolherLendario(cromos);
      if (lend) {
        var info = LENDARIOS[lend.clube + '-' + lend.num] || { nome: 'Cromo #' + lend.num, pos: '', posNome: '', clube: lend.clube === 'fcps' ? 'FC Paço de Sousa' : 'CCRDSV Irivo Penafiel', emblema: ICONE };
        await momentoLendario(lend, info);
        if (cancelado) return;
        // volta ao ecrã preto com loading
        layer.querySelectorAll('.pa-stadium').forEach(function (n) { n.remove(); });
        mostrarLoading();
        await esperar(1300);
        if (cancelado) return;
      }
      terminar();
    } catch (err) {
      console.error('PackAnim:', err);
      terminar();
    }
  }

  window.PackAnim = { iniciar: iniciar };
})();
