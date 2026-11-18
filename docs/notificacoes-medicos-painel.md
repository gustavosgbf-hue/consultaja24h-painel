# Sininho de notificações médicas (frontend, prévia local)

## Interface
Um sino discreto na barra superior abre opções de notificações com um controle principal e dois independentes: Paciente novo e Mensagens do paciente. A escolha fica associada ao endpoint Web Push e ao médico autenticado no backend, por dispositivo. Sem mensagens clínicas na tela bloqueada.

## Android
O médico acessa o painel por HTTPS no Chrome, toca no sino, ativa notificações e confirma a permissão nativa. É possível receber avisos enquanto a página não está aberta, sujeito a bateria, conectividade e configurações do SO.

## iOS/iPadOS
Web Push para web apps adicionados à Tela de Início em iOS/iPadOS 16.4+. No Safari, usar Compartilhar → Adicionar à Tela de Início; abrir pelo ícone instalado e tocar no sino para autorizar. Em aba comum do Safari não é possível habilitar push desse modo. O painel inclui manifest, ícones e service worker push existente.

## Backend
Publicar ANTES a branch `feat/medico-webpush-preferencias` do repositório `triagem-api`, commit descrito no próprio repositório. O endpoint existente `/api/web-push/public-key` precisa retornar uma chave VAPID válida; enquanto não publicado, a interface deve explicar que o serviço está indisponível e não ativar o toggle.

## Segurança
- Texto clínico não é copiado para o payload de notificação.
- O título de novas mensagens contém o primeiro nome do paciente, sem texto da mensagem.
- Sair da conta encerra localmente a assinatura do navegador.
- Não enviar notificações retroativas e não usar Web Push como garantia de atendimento urgente.
- A demo `demo-review.html` é totalmente fictícia: altera estados visuais sem solicitar permissão ou enviar solicitações à API.

## Homologação pendente
Testes com aparelhos reais, Android Chrome e iPhone via Tela de Início, permissões concedidas/negadas, tela bloqueada, app fechado, múltiplos médicos e múltiplos dispositivos. O teste automatizado da interface não comprova o recebimento de push em segundo plano.
