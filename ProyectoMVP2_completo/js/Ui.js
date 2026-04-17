var UI = (function () {
  // Función interna para limpiar texto (quitar tildes y pasar a minúsculas)
  function normalizarTexto(texto) {
    if (!texto) return "";
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function fmtCurrency(n) {
    return '$ ' + Number(n).toLocaleString('es-CO');
  }

  function fmtDate(iso) {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function labelMethod(m) {
    return { efectivo: '💵 Efectivo', nequi: '📱 Nequi', debe: '📝 Debe' }[m] || m;
  }

  function showToast(msg, type) {
    type = type || 'success';
    var c = document.getElementById('toast-container');
    if (!c) return;
    var t = document.createElement('div');
    t.className = 'toast ' + type;
    var icons = { success: '✅', error: '❌', info: '✦' };
    t.innerHTML = '<span>' + (icons[type] || '✦') + '</span><span>' + msg + '</span>';
    c.appendChild(t);
    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transition = 'opacity .3s';
      setTimeout(function () { t.remove(); }, 300);
    }, 3200);
  }

  function openModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('open');
  }

  function closeModal(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('open');
  }

  function showView(name) {
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
    document.querySelectorAll('.nav-btn').forEach(function (b) { b.classList.remove('active'); });
    var target = document.getElementById('view-' + name);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(function (b) {
      if ((b.getAttribute('onclick') || '').indexOf("'" + name + "'") >= 0) b.classList.add('active');
    });
  }

  function confirmDialog(message, onConfirm) {
    document.getElementById('confirm-msg').textContent = message;
    openModal('modal-confirm');
    var btn = document.getElementById('btn-confirm-ok');
    var newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', function () {
      closeModal('modal-confirm');
      onConfirm();
    });
  }

  return {
    fmtCurrency: fmtCurrency,
    fmtDate: fmtDate,
    labelMethod: labelMethod,
    showToast: showToast,
    openModal: openModal,
    closeModal: closeModal,
    showView: showView,
    confirmDialog: confirmDialog,
    normalizarTexto: normalizarTexto
  };

})();