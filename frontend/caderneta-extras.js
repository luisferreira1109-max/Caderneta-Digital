/* Caderneta extras: capa que abre, virar página, slots com nome, colar com brilhos */
(function () {
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  window._cadSemCapa = false;

  function clonePag(el) {
    const c = el.cloneNode(true);
    c.removeAttribute('id');
    c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    c.removeAttribute('onclick');
    c.classList.add('ativa', 'cx-clone');
    return c;
  }
  function pagAtiva(clube, lado) {
    return document.querySelector('#caderneta-' + clube + ' .' + lado + '.ativa');
  }

  /* ---------- 1. CAPA QUE ABRE ---------- */
  function abrirCapa(clube) {
    if (isMobileCad()) return;
    const livro = document.getElementById('caderneta-' + clube);
    const esq = document.getElementById(clube + '-pag-esq-indice');
    if (!livro || !esq) return;
    livro.querySelectorAll('.cx-capa-wrap').forEach(n => n.remove());
    const emb = esq.querySelector('.pag-emblema');
    const nome = esq.querySelector('.pag-clube-nome');
    const wrap = document.createElement('div');
    wrap.className = 'cx-capa-wrap';
    const capa = document.createElement('div');
    capa.className = 'cx-capa';
    const frente = document.createElement('div');
    frente.className = 'cx-capa-face cx-capa-frente ' + clube;
    frente.innerHTML =
      '<div class="cx-capa-titulo">CADERNETA</div>' +
      '<img class="cx-capa-emblema" src="' + (emb ? emb.getAttribute('src') : '') + '"/>' +
      '<div class="cx-capa-nome">' + (nome ? nome.innerHTML : '') + '</div>' +
      '<div class="cx-capa-brilho"></div><div class="cx-capa-sombra"></div>';
    const verso = document.createElement('div');
    verso.className = 'cx-capa-face cx-capa-verso';
    verso.appendChild(clonePag(esq));
    capa.appendChild(frente); capa.appendChild(verso);
    wrap.appendChild(capa);
    livro.appendChild(wrap);
    livro.classList.add('cx-abrindo', 'cx-fechada');
    isAnimatingCad = true;
    setTimeout(() => livro.classList.remove('cx-fechada'), 1200);
    setTimeout(() => {
      wrap.remove();
      livro.classList.remove('cx-abrindo');
      isAnimatingCad = false;
    }, 1900);
  }

  const obs = new MutationObserver(muts => {
    muts.forEach(m => {
      const el = m.target;
      const antes = (m.oldValue || '').split(/\s+/).includes('show');
      const agora = el.classList.contains('show');
      if (agora && !antes && el.id && el.id.startsWith('modal-')) {
        const clube = el.id.replace('modal-', '');
        if (window._cadSemCapa) return;
        abrirCapa(clube);
      }
    });
  });
  ['fcps', 'ccrdsv'].forEach(c => {
    const m = document.getElementById('modal-' + c);
    if (m) obs.observe(m, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  });

  /* ---------- 2. VIRAR PÁGINA ---------- */
  window.animarFlipCad = function (clube, dir, cb) {
    if (isMobileCad() || isAnimatingCad) { cb(); return; }
    const overlay = document.getElementById(clube + '-flip-overlay');
    const velhaEsq = pagAtiva(clube, 'pag-esq');
    const velhaDir = pagAtiva(clube, 'pag-dir');
    if (!overlay || !velhaEsq || !velhaDir) { cb(); return; }
    isAnimatingCad = true;
    const fwd = dir === 1;
    const frenteCl = clonePag(fwd ? velhaDir : velhaEsq);
    const estaticaCl = clonePag(fwd ? velhaEsq : velhaDir);
    cb();
    const novaEsq = pagAtiva(clube, 'pag-esq');
    const novaDir = pagAtiva(clube, 'pag-dir');
    const versoCl = clonePag(fwd ? (novaEsq || velhaEsq) : (novaDir || velhaDir));

    const est = document.createElement('div');
    est.className = 'cx-estatica ' + (fwd ? 'esq' : 'dir');
    est.appendChild(estaticaCl);

    const flip = document.createElement('div');
    flip.className = 'cx-flip ' + (fwd ? 'fwd' : 'bwd');
    const f = document.createElement('div'); f.className = 'cx-face frente';
    f.appendChild(frenteCl);
    const fs = document.createElement('div'); fs.className = 'cx-sombra'; f.appendChild(fs);
    const v = document.createElement('div'); v.className = 'cx-face verso';
    v.appendChild(versoCl);
    flip.appendChild(f); flip.appendChild(v);

    overlay.appendChild(est);
    overlay.appendChild(flip);
    setTimeout(() => {
      est.remove(); flip.remove();
      isAnimatingCad = false;
    }, 940);
  };

  /* ---------- 3. SLOTS COM NÚMERO + NOME ---------- */
  function decorarSlots() {
    document.querySelectorAll('.cromo-slot').forEach(slot => {
      if (slot.classList.contains('tem-cromo') || slot.querySelector('.cx-nome')) return;
      const span = slot.querySelector('span');
      const pag = slot.closest('[id]');
      if (!span || !pag) return;
      const clube = pag.id.startsWith('fcps') ? 'fcps' : (pag.id.startsWith('ccrdsv') ? 'ccrdsv' : null);
      if (!clube) return;
      const j = (typeof JOGADORES !== 'undefined') ? JOGADORES[clube + '-' + parseInt(span.textContent)] : null;
      if (j && j.nome) {
        const em = document.createElement('em');
        em.className = 'cx-nome';
        em.textContent = j.nome;
        slot.appendChild(em);
      }
    });
  }
  window.decorarSlotsCad = decorarSlots;
  decorarSlots();

  /* ---------- 4. COLAR COM ANIMAÇÃO ---------- */
  function sparkles(cx, cy, n, raio, grande) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'cx-estrela';
      const t = (grande ? 10 : 7) + Math.random() * (grande ? 14 : 8);
      s.style.width = s.style.height = t + 'px';
      s.style.left = (cx - t / 2) + 'px';
      s.style.top = (cy - t / 2) + 'px';
      document.body.appendChild(s);
      const ang = (i / n) * Math.PI * 2 + Math.random() * .5;
      const d = raio * (.6 + Math.random() * .8);
      const a = s.animate([
        { transform: 'translate(0,0) scale(0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + Math.cos(ang) * d * .6 + 'px,' + Math.sin(ang) * d * .6 + 'px) scale(1.2) rotate(90deg)', opacity: 1, offset: .4 },
        { transform: 'translate(' + Math.cos(ang) * d + 'px,' + Math.sin(ang) * d + 'px) scale(0) rotate(200deg)', opacity: 0 }
      ], { duration: 900 + Math.random() * 500, easing: 'ease-out', delay: Math.random() * 120 });
      a.onfinish = () => s.remove();
    }
  }
  function anel(r, grande) {
    const a = document.createElement('div');
    a.className = 'cx-anel';
    a.style.left = r.left + 'px'; a.style.top = r.top + 'px';
    a.style.width = r.width + 'px'; a.style.height = r.height + 'px';
    document.body.appendChild(a);
    const an = a.animate([
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(' + (grande ? 2.2 : 1.7) + ')', opacity: 0 }
    ], { duration: 800, easing: 'ease-out' });
    an.onfinish = () => a.remove();
  }

  function acharSlot(clube, num) {
    for (const slot of document.querySelectorAll('.cromo-slot')) {
      const span = slot.querySelector('span');
      const pag = slot.closest('[id]');
      if (span && pag && parseInt(span.textContent) === num && pag.id.startsWith(clube + '-')) return { slot, pagId: pag.id };
    }
    return null;
  }

  window.colarNaCaderneta = async function () {
    if (!_cromoselecionado) return;
    const cromo = _cromoselecionado;
    const clube = cromo.clube;
    const key = clube + '-' + cromo.num_cromo;
    const img = CROMOS_IMAGENS[key];
    const lend = (cromo.raridade || getRaridade(clube, cromo.num_cromo)) === 'lendario';
    const clubeNome = clube === 'fcps' ? 'FCPS Paço de Sousa' : 'CCRDSV Irivo';

    const achado = acharSlot(clube, cromo.num_cromo);
    if (!achado) { mostrarNotificacao('Slot não encontrado na caderneta!', 'erro'); return; }
    const slot = achado.slot;

    // Posição inicial = cromo no popup
    const imgPop = document.querySelector('#cromo-overlay-img img');
    let ini = imgPop ? imgPop.getBoundingClientRect() : null;
    if (!ini || !ini.width) {
      const w = Math.min(220, innerWidth * .6);
      ini = { left: innerWidth / 2 - w / 2, top: innerHeight / 2 - w * .75, width: w, height: w * 1.5 };
    }
    fecharCromoOverlay(null);

    // Abrir a caderneta na página certa (sem animação de capa)
    window._cadSemCapa = true;
    const cadNav = document.querySelector('.nav-item[onclick*="cadernetas"]');
    if (cadNav) mostrarPagina('cadernetas', cadNav);
    const m = document.getElementById('modal-' + clube);
    const n = parseInt(achado.pagId.split('-pag-')[1]);
    const esqN = isMobileCad() ? n : (n % 2 === 1 ? n : n - 1);
    mostrarPaginasCad(clube, esqN, false);
    m.classList.add('show');
    await carregarCromosColados(clube);
    setTimeout(() => { window._cadSemCapa = false; }, 80);
    await esperar(350);

    const fim = slot.getBoundingClientRect();
    // Voo
    if (img) {
      const voo = document.createElement('div');
      voo.className = 'cx-voo';
      voo.style.cssText += ';left:' + ini.left + 'px;top:' + ini.top + 'px;width:' + ini.width + 'px;height:' + ini.height + 'px;';
      voo.innerHTML = '<img src="' + img + '"/>';
      document.body.appendChild(voo);
      const dx = (fim.left + fim.width / 2) - (ini.left + ini.width / 2);
      const dy = (fim.top + fim.height / 2) - (ini.top + ini.height / 2);
      const esc = fim.width / ini.width;
      const voar = voo.animate([
        { transform: 'translate(0,0) scale(1) rotate(0deg)' },
        { transform: 'translate(' + dx * .45 + 'px,' + (dy * .45 - 70) + 'px) scale(' + (1 + (esc - 1) * .5 + .08) + ') rotate(-6deg)', offset: .55 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + esc + ') rotate(0deg)' }
      ], { duration: 850, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
      await voar.finished;
      voo.remove();
    }

    // Preencher slot
    if (img) {
      slot.innerHTML = '<img src="' + img + '" style="width:100%;height:100%;object-fit:contain;"/>';
    } else {
      slot.innerHTML = '<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a2a3a,#0d1a2a);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#c8a84b;font-weight:700;">#' + cromo.num_cromo + '</div>';
    }
    slot.classList.add('tem-cromo', 'cx-colado');
    slot.onclick = img ? () => abrirCromoImg(img) : null;
    const br = document.createElement('div');
    br.className = 'cx-brilho-slot';
    slot.appendChild(br);
    setTimeout(() => { br.remove(); slot.classList.remove('cx-colado'); }, 1100);

    const r = slot.getBoundingClientRect();
    sparkles(r.left + r.width / 2, r.top + r.height / 2, lend ? 30 : 14, lend ? 150 : 85, lend);
    anel(r, lend);
    if (lend) setTimeout(() => anel(r, true), 180);

    // Guardar na base de dados
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      if (cromo.quantidade > 1) {
        await sb.from('colecao').update({ quantidade: cromo.quantidade - 1 })
          .eq('user_id', user.id).eq('clube', clube).eq('num_cromo', cromo.num_cromo);
      } else {
        await sb.from('colecao').delete()
          .eq('user_id', user.id).eq('clube', clube).eq('num_cromo', cromo.num_cromo);
      }
      await sb.from('cromos_colados').upsert({ user_id: user.id, clube: clube, num_cromo: cromo.num_cromo });
      await carregarColecao();
    }
    mostrarNotificacao('✅ Cromo #' + cromo.num_cromo + ' colado na caderneta ' + clubeNome + '!', 'sucesso');
    atualizarBarrasProgresso();
  };
})();
