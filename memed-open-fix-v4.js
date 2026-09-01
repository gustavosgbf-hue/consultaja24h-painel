(function () {
  var moduloPronto = false;
  var listenerInstalado = false;
  var wrappersInstalados = false;

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function nomeModulo(data) {
    return String((data && (data.name || data.moduleName)) || '');
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
    throw new Error('Módulo de prescrição Memed não inicializou');
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
