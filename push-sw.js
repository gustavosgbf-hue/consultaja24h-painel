// Atualização imediata do serviço de push (sem interceptar requisições HTTP).
self.addEventListener('install',function(event){event.waitUntil(self.skipWaiting())});
self.addEventListener('activate',function(event){event.waitUntil(self.clients.claim())});
self.addEventListener('push', function(event){
  var data={};
  try{data=event.data?event.data.json():{}}catch(e){}
  event.waitUntil(self.registration.showNotification(data.title||'ConsultaJá24h',{body:data.body||'Você recebeu uma nova mensagem.',icon:'/favicon.ico',badge:'/favicon.ico',tag:data.atendimentoId?'cj24h-medico-'+data.atendimentoId:'cj24h-medico',renotify:true,data:{url:data.url||'/',kind:data.kind||''}}));
});
self.addEventListener('notificationclick',function(event){
  event.notification.close();
  var url=(event.notification.data&&event.notification.data.url)||'/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
    var target;try{target=new URL(url,self.location.origin)}catch(_){target=new URL('/',self.location.origin)}
    for(var i=0;i<list.length;i++){
      var c=list[i];
      try{
        if(new URL(c.url).origin!==target.origin)continue;
        if('focus' in c){
          if(event.notification.data && event.notification.data.kind==='chat-medico'){
            c.postMessage({type:'cj-medico-push-open',url:target.href});
            return c.focus();
          }
          return c.navigate(target.href).then(function(){return c.focus()});
        }
      }catch(_){}
    }
    return clients.openWindow?clients.openWindow(target.href):null;
  }));
});
