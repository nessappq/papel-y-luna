document.addEventListener('DOMContentLoaded', function() {
    Products.init();
    POS.init();
    if (window.History)   History.init();
    if (window.Purchases) Purchases.init();
    if (window.Entities)  Entities.init();

    document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.classList.remove('open');
      });
    });

    document.querySelectorAll('[data-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.closeModal(btn.dataset.close);
      });
    });

    showView('pos');
});

function showView(name) {
  UI.showView(name);
  if (name === 'pos')       POS.refresh();
  if (name === 'products')  Products.refresh();
  if (name === 'history' && window.History)   History.refresh();
  if (name === 'purchases' && window.Purchases) Purchases.refresh();
  if (name === 'entities' && window.Entities)   Entities.refresh();
}
