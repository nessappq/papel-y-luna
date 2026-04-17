// Api.js — Integracion con Google Sheets via fetch + async/await


var API_URL  = "https://script.google.com/macros/s/AKfycbxgYDWjGb4xHX6vybwa-FGoJkysSpdts_vJlKvi4xxgfOkKAAGYq5kBrgYFkfB3Unrz/exec";

var API_DISPONIBLE = true;



async function apiGet(resource) {
  if (!API_DISPONIBLE) return null;
  try {
    var url      = API_URL + '?resource=' + resource + '&t=' + Date.now();
    var response = await fetch(url);
    var data     = await response.json();
    return Array.isArray(data) ? data : (data.data || null);
  } catch (e) {
    console.warn('[API] Error GET ' + resource + ':', e.message);
    return null;
  }
}


async function apiPost(resource, payload) {
  if (!API_DISPONIBLE) return { success: false, message: 'API no configurada' };
  try {
    var response = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify({ resource: resource, data: payload })
    });
    var result = await response.json();
    return result || { success: false };
  } catch (e) {
    console.warn('[API] Error POST ' + resource + ':', e.message);
    return { success: false, message: e.message };
  }
}
