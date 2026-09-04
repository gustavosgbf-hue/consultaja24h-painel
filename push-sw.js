self.addEventListener('push', function(event){
  var data={};
  try{data=event.data?event.data.json():{}}catch(e){}
  event.waitUntil(self.registration.showNotification(data.title||'ConsultaJá24h',{body:data.body||'Você recebeu uma nova mensagem.',icon:'/favicon.ico',badge:'/favicon.ico',tag:data.atendimentoId?'cj24h-medico-'+data.atendimentoId:'cj24h-medico',renotify:true,data:{url:data.url||'/'}}));
});
self.addEventListener('notificationclick',function(event){
  event.notification.close();
  var url=(event.notification.data&&event.notification.data.url)||'/';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){for(var i=0;i<list.length;i++){var c=list[i];if('focus'in c){c.navigate(url);return c.focus();}}return clients.openWindow?clients.openWindow(url):null;}));
});
