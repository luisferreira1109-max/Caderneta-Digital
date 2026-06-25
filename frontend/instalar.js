// Botão Instalar App
var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
var isAndroid = /android/i.test(navigator.userAgent);
var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
var deferredPrompt = null;

if (!isStandalone) {
  var btn = document.createElement('button');
  btn.id = 'btn-instalar-app';
  btn.innerHTML = '📱 Instalar App';
  btn.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#C9943A,#E8A83E);color:#0a0a0f;border:none;border-radius:50px;padding:14px 28px;font-size:15px;font-weight:700;cursor:pointer;z-index:200;box-shadow:0 4px 20px rgba(201,148,58,0.4);';
  document.body.appendChild(btn);
  btn.addEventListener('click', instalarApp);
}

window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredPrompt = e;
});

function instalarApp() {
  if (isIOS) {
    var modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:999;display:flex;align-items:flex-end;justify-content:center;';
    modal.innerHTML = '<div style="background:#0f0f1a;border:1.5px solid #C9943A;border-radius:20px 20px 0 0;padding:32px 24px;width:100%;max-width:480px;color:white;">' +
      '<p style="font-size:18px;font-weight:700;text-align:center;margin-bottom:8px;">📱 Instalar no iPhone</p>' +
      '<p style="font-size:13px;color:rgba(255,255,255,0.4);text-align:center;margin-bottom:20px;">Segue estes passos no Safari</p>' +
      '<div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;gap:14px;align-items:center;"><div style="width:32px;height:32px;border-radius:50%;background:#C9943A;color:#0a0a0f;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">1</div><p style="font-size:14px;">Abre esta página no <strong>Safari</strong></p></div>' +
      '<div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;gap:14px;align-items:center;"><div style="width:32px;height:32px;border-radius:50%;background:#C9943A;color:#0a0a0f;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">2</div><p style="font-size:14px;">Carrega em <strong>⬆️ Partilhar</strong> em baixo</p></div>' +
      '<div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;gap:14px;align-items:center;"><div style="width:32px;height:32px;border-radius:50%;background:#C9943A;color:#0a0a0f;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">3</div><p style="font-size:14px;">Clica em <strong>"Adicionar ao ecrã principal"</strong></p></div>' +
      '<div style="padding:12px 0;display:flex;gap:14px;align-items:center;"><div style="width:32px;height:32px;border-radius:50%;background:#C9943A;color:#0a0a0f;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;">4</div><p style="font-size:14px;">Clica em <strong>"Adicionar"</strong> no canto direito</p></div>' +
      '<button onclick="this.parentElement.parentElement.remove()" style="width:100%;margin-top:16px;padding:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:50px;color:rgba(255,255,255,0.6);font-size:14px;cursor:pointer;">Entendi!</button>' +
      '</div>';
    document.body.appendChild(modal);
  } else if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(r) {
      if (r.outcome === 'accepted') document.getElementById('btn-instalar-app').remove();
      deferredPrompt = null;
    });
  } else {
    alert('Para instalar: clica nos 3 pontinhos do browser → "Adicionar ao ecrã principal"');
  }
}