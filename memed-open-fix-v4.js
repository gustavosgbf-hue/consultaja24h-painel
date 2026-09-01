(function () {
  if (window.__cjMemedOpenFixV4) return;
  window.__cjMemedOpenFixV4 = true;

  var moduloPronto = false;
  var listenerInstalado = false;
  var wrappersInstalados = false;

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function diagnosticarCamada() {
    var raiz = document.getElementById('memed-auto-generated')
      || document.getElementById('memed-sinapse-container');
    var iframe = document.getElementById('mdhub-module-plataforma.prescricao')
      || document.querySelector('#memed-auto-generated>iframe[title="Memed Prescrição"],#memed-sinapse-container>iframe[title="Memed Prescrição"]');
    var retangulo = iframe && iframe.getBoundingClientRect ? iframe.getBoundingClientRect() : null;
    console.log('[MEMED-V4] Camada visual.', {
      raiz: raiz ? raiz.id : null,
      iframe: iframe ? (iframe.id || iframe.title || 'iframe') : null,
      largura: retangulo ? Math.round(retangulo.width) : 0,
      altura: retangulo ? Math.round(retangulo.height) : 0,
      display: iframe ? getComputedStyle(iframe).display : null,
      visibility: iframe ? getComputedStyle(iframe).visibility : null,
      opacity: iframe ? getComputedStyle(iframe).opacity : null
    });
    return !!(iframe && retangulo && retangulo.width > 0 && retangulo.height > 0);
  }

  function nomeModulo(data) {
    return String((data && (data.name || data.moduleName)) || '');
  }

  function estadoV4() {
    var api = window.MdSinapsePrescricao;
    if (!api || typeof api.getContract !== 'function') {
      return { detectado: false, pronto: false };
    }
    try {
      var contrato = api.getContract() || {};
      return { detectado: true, pronto: !!contrato.version, versao: contrato.version || null };
    } catch (_) {
      return { detectado: true, pronto: false, versao: null };
    }
  }

  function instalarListenerCore() {
    if (listenerInstalado) return true;
    if (!window.MdHub || !window.MdHub.event || typeof window.MdHub.event.add !== 'function') return false;
    try {
      window.MdHub.event.add('core:moduleInit', function (data) {
        if (nomeModulo(data) === 'plataforma.prescricao') {
          moduloPronto = true;
          console.log('[MEMED-V4] plataforma.prescricao pronta para abrir.');
        }
      });
      listenerInstalado = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  async function aguardarModuloReal(timeoutMs) {
    var inicio = Date.now();
    var limite = Number(timeoutMs) || 20000;
    while (Date.now() - inicio < limite) {
      instalarListenerCore();
      var v4 = estadoV4();
      if (v4.detectado) {
        if (v4.pronto) {
          console.log('[MEMED-V4] iframe pronto.', { versao: v4.versao });
          return true;
        }
        await sleep(120);
        continue;
      }
      if (moduloPronto) return true;

      // Fallback para casos em que o evento ocorreu antes do listener.
      if (window.MdHub && window.MdHub.module && typeof window.MdHub.module.show === 'function' &&
          window.MdHub.command && typeof window.MdHub.command.send === 'function') {
        try {
          if (typeof window.MdHub.command.ping === 'function') {
            var resposta = await Promise.race([
              Promise.resolve(window.MdHub.command.ping('plataforma.prescricao')),
              sleep(500).then(function () { return null; })
            ]);
            if (resposta !== null && resposta !== false) {
              moduloPronto = true;
              return true;
            }
          }
        } catch (_) {}
      }
      await sleep(120);
    }
    throw new Error(estadoV4().detectado
      ? 'O iframe da Memed não concluiu a inicialização'
      : 'Módulo de prescrição Memed não inicializou');
  }

  function instalarWrappers() {
    if (wrappersInstalados) return true;
    if (typeof window.aguardarSdkMemed !== 'function' || typeof window.mostrarModuloMemed !== 'function') return false;

    var aguardarAnterior = window.aguardarSdkMemed;
    var mostrarAnterior = window.mostrarModuloMemed;

    window.aguardarSdkMemed = async function (timeoutMs) {
      await aguardarAnterior(timeoutMs || 20000);
      await aguardarModuloReal(timeoutMs || 20000);
      // Pequena folga depois do core:moduleInit; evita corrida interna do SDK.
      await sleep(180);
    };

    window.mostrarModuloMemed = async function () {
      await aguardarModuloReal(8000);
      var ultimoErro = null;
      for (var i = 0; i < 5; i += 1) {
        try {
          await mostrarAnterior();
          await sleep(80);
          if (!diagnosticarCamada()) throw new Error('Iframe da Memed abriu sem dimensão visível');
          console.log('[MEMED-V4] Prescrição aberta com sucesso.');
          return;
        } catch (err) {
          ultimoErro = err;
          console.warn('[MEMED-V4] show/setPaciente falhou; repetindo.', {
            tentativa: i + 1,
            erro: err && err.message ? err.message : String(err || '')
          });
          await sleep(300 + i * 200);
        }
      }
      throw ultimoErro || new Error('Memed não abriu');
    };

    wrappersInstalados = true;
    console.log('[MEMED-V4] Correção de abertura instalada.');
    return true;
  }

  var tentativas = 0;
  var timer = setInterval(function () {
    tentativas += 1;
    instalarListenerCore();
    if (instalarWrappers() && listenerInstalado) {
      clearInterval(timer);
    } else if (tentativas >= 240) {
      clearInterval(timer);
    }
  }, 100);
})();
