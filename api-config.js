(function (w) {
  var defaultApi = 'https://triagem-api.onrender.com';
  var fromGlobal = w.CONSULTAJA24H_API_BASE;
  var fromMeta = document.querySelector('meta[name="consultaja24h-api-base"]')?.content;
  w.API_BASE_URL = (fromGlobal || fromMeta || defaultApi).replace(/\/$/, '');
})(window);
