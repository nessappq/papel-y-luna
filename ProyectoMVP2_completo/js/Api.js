var API_URL = "https://script.google.com/macros/s/AKfycbx65lEM4MDoAphgvOASTVXMmhUBC3eOAmIeEh49z2ALOX3vO4zPFLTNG--M/exec";

var API_DISPONIBLE = true;

function jsonpRequest(url) {
  return new Promise(function(resolve, reject) {
    var callbackName = 'cb_' + Date.now();
    window[callbackName] = function(data) {
      resolve(data);
      delete window[callbackName];
      document.head.removeChild(script);
    };
    var script = document.createElement('script');
    script.src = url + '&callback=' + callbackName;
    script.onerror = function() {
      reject(new Error('Error de conexion'));
      delete window[callbackName];
      document.head.removeChild(script);
    };
    document.head.appendChild(script);
  });
}

async function apiGet(resource) {
  try {
    var url = API_URL + '?resource=' + resource + '&t=' + Date.now();
    return await jsonpRequest(url);
  } catch(e) {
    console.warn('[API] Error GET:', e.message);
    return null;
  }
}

async function apiPost(resource, payload) {
  try {
    var jsonStr = encodeURIComponent(JSON.stringify(payload));
    var url = API_URL + '?resource=' + resource + '&action=post&data=' + jsonStr + '&t=' + Date.now();
    return await jsonpRequest(url);
  } catch(e) {
    console.warn('[API] Error POST:', e.message);
    return { success: false, message: e.message };
  }
}
