/* Chat em duas colunas (conversas à esquerda, conversa aberta à direita) + remover amizade. */
(function () {
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var conversas = [];      // {id, nome, avatar, online, ultima, hora, naoLidas}
  var aberta = null;       // id do amigo aberto
  var temporizador = null;
  var meuId = null;

  function ava(c, grande) {
    return c.avatar ? '<img src="' + esc(c.avatar) + '" alt="">' : esc((c.nome || '?')[0].toUpperCase());
  }
  function formatarHora(iso) {
    if (!iso) return '';
    var d = new Date(iso), hoje = new Date();
    if (d.toDateString() === hoje.toDateString()) return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  }

  async function carregarConversas() {
    var r = await sb.auth.getUser(); var u = r.data && r.data.user; if (!u) return;
    meuId = u.id;
    var a1 = (await sb.from('amigos').select('*').eq('user_id', u.id).eq('status', 'aceite')).data || [];
    var a2 = (await sb.from('amigos').select('*').eq('amigo_id', u.id).eq('status', 'aceite')).data || [];
    var ids = a1.map(function (x) { return x.amigo_id; }).concat(a2.map(function (x) { return x.user_id; }));
    ids = ids.filter(function (v, i) { return ids.indexOf(v) === i; });
    var msgs = (await sb.from('mensagens').select('*').or('de_user_id.eq.' + u.id + ',para_user_id.eq.' + u.id).order('criado_em', { ascending: false }).limit(600)).data || [];
    var agora = new Date(), lista = [];
    for (var i = 0; i < ids.length; i++) {
      var p = (await sb.from('perfis_publicos').select('id, display_name, avatar_url, online_at').eq('id', ids[i]).single()).data;
      if (!p) continue;
      var dele = msgs.filter(function (m) { return m.de_user_id !== m.para_user_id && (m.de_user_id === p.id || m.para_user_id === p.id); });
      var ult = dele[0];
      lista.push({
        id: p.id, nome: p.display_name || 'Utilizador', avatar: p.avatar_url,
        online: !!(p.online_at && (agora - new Date(p.online_at)) < 5 * 60 * 1000),
        ultima: ult ? ((ult.de_user_id === u.id ? 'Tu: ' : '') + ult.mensagem) : 'Ainda não há mensagens',
        hora: ult ? ult.criado_em : null,
        naoLidas: dele.filter(function (m) { return m.para_user_id === u.id && !m.lida; }).length
      });
    }
    lista.sort(function (a, b) {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return (b.hora || '').localeCompare(a.hora || '');
    });
    conversas = lista;
    window._mzMsg = lista.reduce(function (s, c) { return s + c.naoLidas; }, 0);
    if (window.mzPonto) window.mzPonto();
  }

  function desenharLista() {
    var f = ($('cm-pesquisa').value || '').trim().toLowerCase();
    var el = $('cm-lista'); el.innerHTML = '';
    var vis = conversas.filter(function (c) { return !f || c.nome.toLowerCase().indexOf(f) >= 0; });
    if (!vis.length) { el.innerHTML = '<div class="cm-nada">' + (conversas.length ? 'Nenhum amigo encontrado.' : 'Ainda não tens amigos. Adiciona amigos para poderes falar com eles.') + '</div>'; return; }
    vis.forEach(function (c) {
      var d = document.createElement('div');
      d.className = 'cm-item' + (c.id === aberta ? ' ativo' : '');
      d.innerHTML = '<div class="cm-ava">' + ava(c) + '<span class="cm-dot ' + (c.online ? 'on' : '') + '"></span></div>' +
        '<div class="cm-info"><div class="cm-nome">' + esc(c.nome) + '</div><div class="cm-ult">' + esc(c.ultima) + '</div></div>' +
        '<div class="cm-meta"><div class="cm-hora">' + esc(formatarHora(c.hora)) + '</div>' + (c.naoLidas ? '<div class="cm-badge">' + (c.naoLidas > 9 ? '9+' : c.naoLidas) + '</div>' : '') + '</div>';
      d.onclick = function () { abrir(c.id); };
      el.appendChild(d);
    });
  }

  async function desenharMensagens(marcarLidas) {
    if (!aberta || !meuId) return;
    var q = await sb.from('mensagens').select('*')
      .or('and(de_user_id.eq.' + meuId + ',para_user_id.eq.' + aberta + '),and(de_user_id.eq.' + aberta + ',para_user_id.eq.' + meuId + ')')
      .order('criado_em', { ascending: true });
    var ms = q.data || [];
    var el = $('cm-msgs');
    var fim = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (!ms.length) el.innerHTML = '<div class="cm-nada">Ainda não há mensagens. Diz olá! 👋</div>';
    else el.innerHTML = ms.map(function (m) {
      var env = m.de_user_id === meuId;
      return '<div class="cm-linha ' + (env ? 'env' : 'rec') + '"><div class="cm-bolha">' + esc(m.mensagem) + '</div><div class="cm-h">' + esc(formatarHora(m.criado_em)) + '</div></div>';
    }).join('');
    if (fim || marcarLidas) el.scrollTop = el.scrollHeight;
    if (marcarLidas) {
      await sb.from('mensagens').update({ lida: true }).eq('de_user_id', aberta).eq('para_user_id', meuId).eq('lida', false);
      var c = conversas.filter(function (x) { return x.id === aberta; })[0];
      if (c) { c.naoLidas = 0; }
      window._mzMsg = conversas.reduce(function (s, x) { return s + x.naoLidas; }, 0);
      if (window.mzPonto) window.mzPonto();
      desenharLista();
    }
  }

  async function abrir(id) {
    aberta = id;
    var c = conversas.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    $('cm-vazio').style.display = 'none'; $('cm-conversa').style.display = '';
    $('cm-topo-ava').innerHTML = ava(c);
    $('cm-topo-nome').textContent = c.nome;
    $('cm-topo-estado').textContent = c.online ? '● ON' : '● OFF';
    $('cm-topo-estado').className = 'cm-topo-estado ' + (c.online ? 'on' : '');
    desenharLista();
    await desenharMensagens(true);
    $('cm-input').focus();
  }

  window.mzChatFiltrar = desenharLista;

  window.mzChatEnviar = async function () {
    var inp = $('cm-input'); var t = inp.value.trim();
    if (!t || !aberta) return;
    inp.value = '';
    await sb.from('mensagens').insert({ de_user_id: meuId, para_user_id: aberta, mensagem: t });
    var c = conversas.filter(function (x) { return x.id === aberta; })[0];
    if (c) { c.ultima = 'Tu: ' + t; c.hora = new Date().toISOString(); }
    desenharLista();
    await desenharMensagens(true);
  };

  window.mzChatInicio = async function () {
    aberta = null;
    $('cm-vazio').style.display = ''; $('cm-conversa').style.display = 'none';
    $('cm-lista').innerHTML = '<div class="cm-nada">A carregar...</div>';
    try { await carregarConversas(); } catch (e) { $('cm-lista').innerHTML = '<div class="cm-nada">Não foi possível carregar as conversas.</div>'; return; }
    desenharLista();
    clearInterval(temporizador);
    temporizador = setInterval(async function () {
      var vis = $('am-chat') && $('am-chat').offsetParent !== null;
      if (!vis) { clearInterval(temporizador); return; }
      try { await carregarConversas(); desenharLista(); await desenharMensagens(false); if (aberta) { await sb.from('mensagens').update({ lida: true }).eq('de_user_id', aberta).eq('para_user_id', meuId).eq('lida', false); } } catch (e) {}
    }, 4000);
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && document.activeElement && document.activeElement.id === 'cm-input') { e.preventDefault(); mzChatEnviar(); }
  });

  /* Pontinho vermelho para mensagens por ler (verifica de vez em quando) */
  async function verificarNaoLidas() {
    try {
      var r = await sb.auth.getUser(); var u = r.data && r.data.user; if (!u) return;
      var q = await sb.from('mensagens').select('id, de_user_id', { count: 'exact' }).eq('para_user_id', u.id).eq('lida', false);
      var n = (q.data || []).filter(function (m) { return m.de_user_id !== u.id; }).length;
      window._mzMsg = n; if (window.mzPonto) window.mzPonto();
    } catch (e) {}
  }
  setTimeout(verificarNaoLidas, 3000);
  setInterval(function () { if (!($('am-chat') && $('am-chat').offsetParent !== null)) verificarNaoLidas(); }, 25000);

  /* ----- Remover amizade ----- */
  window.mzRemoverAmigo = async function (amizadeId, nome) {
    if (!confirm('Remover ' + nome + ' dos teus amigos?')) return;
    try {
      await sb.from('amigos').delete().eq('id', amizadeId);
      mostrarNotificacao('Amizade removida.', 'sucesso');
      carregarAmigos();
    } catch (e) { mostrarNotificacao('Não foi possível remover a amizade.', 'erro'); }
  };
})();
