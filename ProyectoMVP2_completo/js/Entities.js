// Modulo de gestion de entidades: Categorias, Proveedores, Clientes

var Entities = (function () {

  var activeTab    = 'categories';
  var editingId    = null;
  var editingType  = null;

  function init() {
    // Tabs
    document.querySelectorAll('.ent-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { switchTab(tab.dataset.tab); });
    });

    // Busquedas
    document.getElementById('cat-search').addEventListener('input',  renderCategories);
    document.getElementById('sup-search').addEventListener('input',  renderSuppliers);
    document.getElementById('cus-search').addEventListener('input',  renderCustomers);

    // Botones nuevo
    document.getElementById('btn-new-cat').addEventListener('click', function () { openEntityModal('categories'); });
    document.getElementById('btn-new-sup').addEventListener('click', function () { openEntityModal('suppliers'); });
    document.getElementById('btn-new-cus').addEventListener('click', function () { openEntityModal('customers'); });

    // Formulario
    document.getElementById('entity-form').addEventListener('submit', saveEntity);

    renderCategories();
    renderSuppliers();
    renderCustomers();
  }

  function refresh() {
    renderCategories();
    renderSuppliers();
    renderCustomers();
  }

  function switchTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.ent-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.tab === tab);
    });
    document.querySelectorAll('.ent-panel').forEach(function (p) {
      p.style.display = p.dataset.panel === tab ? 'block' : 'none';
    });
  }

  // ── Categorias ──
  function renderCategories() {
    var q     = UI.normalizarTexto(document.getElementById('cat-search').value);
    var tbody = document.getElementById('cat-tbody');
    var list  = State.getCategories().filter(function (c) {
      return UI.normalizarTexto(c.name).indexOf(q) >= 0 ||
             UI.normalizarTexto(c.description || '').indexOf(q) >= 0;
    });
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:30px;color:var(--text-light)">'
        + (q ? 'Sin resultados' : 'No hay categorias') + '</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (c) {
      return '<tr>'
        + '<td><strong>' + c.id + '</strong></td>'
        + '<td>' + c.name + '</td>'
        + '<td>' + (c.description || '') + '</td>'
        + '<td><div style="display:flex;gap:6px">'
          + '<button class="btn btn-outline btn-sm btn-edit-ent" data-type="categories" data-id="' + c.id + '">Editar</button>'
          + '<button class="btn btn-ghost btn-sm btn-del-ent" data-type="categories" data-id="' + c.id + '" data-name="' + c.name + '">Eliminar</button>'
        + '</div></td></tr>';
    }).join('');
    attachEntityActions(tbody);
  }

  // ── Proveedores ──
  function renderSuppliers() {
    var q     = UI.normalizarTexto(document.getElementById('sup-search').value);
    var tbody = document.getElementById('sup-tbody');
    var list  = State.getSuppliers().filter(function (s) {
      return UI.normalizarTexto(s.name).indexOf(q) >= 0 ||
             UI.normalizarTexto(s.contact || '').indexOf(q) >= 0;
    });
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-light)">'
        + (q ? 'Sin resultados' : 'No hay proveedores') + '</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (s) {
      return '<tr>'
        + '<td><strong>' + s.id + '</strong></td>'
        + '<td>' + s.name + '</td>'
        + '<td>' + (s.contact || '') + '</td>'
        + '<td>' + (s.email || '') + '</td>'
        + '<td><div style="display:flex;gap:6px">'
          + '<button class="btn btn-outline btn-sm btn-edit-ent" data-type="suppliers" data-id="' + s.id + '">Editar</button>'
          + '<button class="btn btn-ghost btn-sm btn-del-ent" data-type="suppliers" data-id="' + s.id + '" data-name="' + s.name + '">Eliminar</button>'
        + '</div></td></tr>';
    }).join('');
    attachEntityActions(tbody);
  }

  // ── Clientes ──
  function renderCustomers() {
    var q     = UI.normalizarTexto(document.getElementById('cus-search').value);
    var tbody = document.getElementById('cus-tbody');
    var list  = State.getCustomers().filter(function (c) {
      return UI.normalizarTexto(c.name).indexOf(q) >= 0 ||
             UI.normalizarTexto(c.phone || '').indexOf(q) >= 0 ||
             UI.normalizarTexto(c.email || '').indexOf(q) >= 0;
    });
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-light)">'
        + (q ? 'Sin resultados' : 'No hay clientes') + '</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (c) {
      return '<tr>'
        + '<td><strong>' + c.id + '</strong></td>'
        + '<td>' + c.name + '</td>'
        + '<td>' + (c.phone || '') + '</td>'
        + '<td>' + (c.email || '') + '</td>'
        + '<td><div style="display:flex;gap:6px">'
          + '<button class="btn btn-outline btn-sm btn-edit-ent" data-type="customers" data-id="' + c.id + '">Editar</button>'
          + '<button class="btn btn-ghost btn-sm btn-del-ent" data-type="customers" data-id="' + c.id + '" data-name="' + c.name + '">Eliminar</button>'
        + '</div></td></tr>';
    }).join('');
    attachEntityActions(tbody);
  }

  function attachEntityActions(container) {
    container.querySelectorAll('.btn-edit-ent').forEach(function (btn) {
      btn.addEventListener('click', function () { openEntityModal(btn.dataset.type, btn.dataset.id); });
    });
    container.querySelectorAll('.btn-del-ent').forEach(function (btn) {
      btn.addEventListener('click', function () {
        UI.confirmDialog('Eliminar "' + btn.dataset.name + '"? Esta accion no se puede deshacer.', function () {
          if (btn.dataset.type === 'categories') State.deleteCategory(btn.dataset.id);
          else if (btn.dataset.type === 'suppliers') State.deleteSupplier(btn.dataset.id);
          else if (btn.dataset.type === 'customers') State.deleteCustomer(btn.dataset.id);
          refresh();
          UI.showToast('Eliminado correctamente', 'info');
        });
      });
    });
  }

  // ── Modal formulario ──
  var CONFIGS = {
    categories: {
      title:  'Categoria',
      fields: [
        { id:'ent-f-name',        label:'Nombre *',      type:'text',  key:'name',        required:true  },
        { id:'ent-f-description', label:'Descripcion',   type:'text',  key:'description', required:false },
      ]
    },
    suppliers: {
      title:  'Proveedor',
      fields: [
        { id:'ent-f-name',    label:'Nombre *',  type:'text',  key:'name',    required:true  },
        { id:'ent-f-contact', label:'Telefono',  type:'text',  key:'contact', required:false },
        { id:'ent-f-email',   label:'Email',     type:'email', key:'email',   required:false },
        { id:'ent-f-address', label:'Direccion', type:'text',  key:'address', required:false },
      ]
    },
    customers: {
      title:  'Cliente',
      fields: [
        { id:'ent-f-name',  label:'Nombre *', type:'text',  key:'name',  required:true  },
        { id:'ent-f-phone', label:'Telefono', type:'text',  key:'phone', required:false },
        { id:'ent-f-email', label:'Email',    type:'email', key:'email', required:false },
        { id:'ent-f-notes', label:'Notas',    type:'text',  key:'notes', required:false },
      ]
    }
  };

  function openEntityModal(type, id) {
    editingType = type;
    editingId   = id || null;
    var config  = CONFIGS[type];
    var labels  = { categories:'Categoria', suppliers:'Proveedor', customers:'Cliente' };

    document.getElementById('entity-modal-title').textContent =
      (id ? 'Editar ' : 'Nuevo ') + labels[type];

    // Construir campos dinamicamente
    var fieldsEl = document.getElementById('entity-fields');
    var record   = null;
    if (id) {
      if (type === 'categories') record = State.getCategoryById(id);
      else if (type === 'suppliers') record = State.getSupplierById(id);
      else if (type === 'customers') record = State.getCustomerById(id);
    }

    fieldsEl.innerHTML = config.fields.map(function (f) {
      var val = (record && record[f.key]) ? record[f.key] : '';
      return '<div class="form-group">'
        + '<label class="form-label">' + f.label + '</label>'
        + '<input type="' + f.type + '" class="form-control" id="' + f.id + '" value="' + val + '">'
        + '</div>';
    }).join('');

    UI.openModal('modal-entity');
  }

  function saveEntity(e) {
    e.preventDefault();
    var config = CONFIGS[editingType];
    var data   = {};
    var valid  = true;

    config.fields.forEach(function (f) {
      var el  = document.getElementById(f.id);
      var val = el ? el.value.trim() : '';
      if (f.required && !val) { UI.showToast('El campo "' + f.label.replace(' *','') + '" es obligatorio', 'error'); valid = false; }
      data[f.key] = val;
    });

    if (!valid) return;

    if (editingId) {
      if (editingType === 'categories') State.updateCategory(editingId, data);
      else if (editingType === 'suppliers') State.updateSupplier(editingId, data);
      else if (editingType === 'customers') State.updateCustomer(editingId, data);
      UI.showToast('Actualizado correctamente', 'success');
    } else {
      if (editingType === 'categories') State.addCategory(data);
      else if (editingType === 'suppliers') State.addSupplier(data);
      else if (editingType === 'customers') State.addCustomer(data);
      UI.showToast('Creado correctamente', 'success');
    }

    UI.closeModal('modal-entity');
    refresh();
  }

  return { init: init, refresh: refresh };

})();
