var API_URL = "https://script.google.com/macros/s/AKfycbwxo-H_rqE18IT9niqbqWG8IdLzHBVArqVzmTtdBNj1kdtUdiDqa_vWTnTC1DxLo8z9/exec";

var API_DISPONIBLE = true;

function jsonpRequest(url) {
  return new Promise(function(resolve, reject) {
    var callbackName = 'cb_' + Date.now();
    var script = document.createElement('script');
    window[callbackName] = function(data) {
      resolve(data);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    script.src = url + '&callback=' + callbackName;
    script.onerror = function() {
      reject(new Error('Error de conexion'));
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    setTimeout(function() {
      if (window[callbackName]) {
        reject(new Error('Timeout'));
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }
    }, 10000);
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
