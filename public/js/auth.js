/* ========================================
   FENIX HOME ITALIA - Auth & Admin JS
   auth.js - Gestione Autenticazione e Admin
   ======================================== */

// Variabili globali utente
let currentUser = null;
let userPermissions = null;

// ============================================
// INIZIALIZZAZIONE E CHECK AUTH
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    await checkAuthentication();
});

async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            userPermissions = data.permissions;
            updateUIForUser();
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        window.location.href = '/login';
    }
}

function updateUIForUser() {
    if (!currentUser) return;
    
    // Aggiorna header
    const userNameHeader = document.getElementById('userNameHeader');
    if (userNameHeader) userNameHeader.textContent = currentUser.nome;
    
    const userNameDropdown = document.getElementById('userNameDropdown');
    if (userNameDropdown) userNameDropdown.textContent = currentUser.nome;
    
    const userEmailDropdown = document.getElementById('userEmailDropdown');
    if (userEmailDropdown) userEmailDropdown.textContent = currentUser.email;
    
    // Aggiorna sidebar
    const sidebarUserName = document.getElementById('sidebarUserName');
    if (sidebarUserName) sidebarUserName.textContent = currentUser.nome;
    
    const roleText = currentUser.ruolo === 'admin' ? 'Amministratore' : 
                     currentUser.ruolo === 'operatore' ? 'Operatore' : 'Cliente';
    const sidebarUserRole = document.getElementById('sidebarUserRole');
    if (sidebarUserRole) sidebarUserRole.innerHTML = `<i class="bi bi-circle-fill" style="font-size:8px"></i> ${roleText}`;
    
    // Avatar con iniziali
    const initials = currentUser.nome.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) userAvatar.src = `https://via.placeholder.com/45/d32f2f/fff?text=${initials}`;
    
    // Mostra/nascondi elementi admin
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(el => {
        el.style.display = currentUser.ruolo === 'admin' ? '' : 'none';
    });
    
    if (currentUser.ruolo !== 'admin') {
        applyPermissions();
    }
}

function applyPermissions() {
    if (!userPermissions) return;
    
    if (!userPermissions.can_view_contrassegni) {
        document.querySelectorAll('[onclick*="view-contrassegni"]').forEach(el => {
            const li = el.closest('li');
            if (li) li.style.display = 'none';
        });
    }
    
    if (!userPermissions.can_view_reports) {
        document.querySelectorAll('[onclick*="view-report"]').forEach(el => {
            const li = el.closest('li');
            if (li) li.style.display = 'none';
        });
    }
    
    if (!userPermissions.can_access_shopify) {
        document.querySelectorAll('[onclick*="view-shopify"]').forEach(el => {
            const li = el.closest('li');
            if (li) li.style.display = 'none';
        });
    }
    
    if (!userPermissions.can_manage_distinte) {
        document.querySelectorAll('[onclick*="view-crea-distinta"]').forEach(el => {
            const li = el.closest('li');
            if (li) li.style.display = 'none';
        });
    }
}

// ============================================
// LOGOUT
// ============================================

async function logout() {
    if (!confirm('Sei sicuro di voler uscire?')) return;
    
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        sessionStorage.clear();
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login';
    }
}

// ============================================
// CAMBIO PASSWORD
// ============================================

function cambiaPassword() {
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    new bootstrap.Modal(document.getElementById('modalCambioPassword')).show();
}

async function salvaCambioPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        alert('Le password non corrispondono');
        return;
    }
    
    if (newPassword.length < 6) {
        alert('La password deve essere di almeno 6 caratteri');
        return;
    }
    
    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Password aggiornata con successo');
            bootstrap.Modal.getInstance(document.getElementById('modalCambioPassword')).hide();
        } else {
            alert(data.message || 'Errore nel cambio password');
        }
    } catch (error) {
        alert('Errore di connessione');
    }
}

// ============================================
// ADMIN: GESTIONE UTENTI
// ============================================

async function caricaUtenti() {
    try {
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        
        if (data.success) {
            renderUtentiTable(data.data);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUtentiTable(utenti) {
    const tbody = document.getElementById('utentiTableBody');
    if (!tbody) return;
    
    if (!utenti || utenti.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4">Nessun utente trovato</td></tr>';
        return;
    }
    
    tbody.innerHTML = utenti.map(u => `
        <tr>
            <td>${u.id}</td>
            <td><strong>${u.nome}</strong></td>
            <td>${u.email}</td>
            <td>${u.azienda || '-'}</td>
            <td>
                <span class="badge ${u.ruolo === 'admin' ? 'bg-danger' : u.ruolo === 'operatore' ? 'bg-primary' : 'bg-secondary'}">
                    ${u.ruolo}
                </span>
            </td>
            <td>
                <span class="badge ${u.stato === 'attivo' ? 'bg-success' : 'bg-warning'}">
                    ${u.stato}
                </span>
            </td>
            <td>${u.ultimo_accesso ? new Date(u.ultimo_accesso).toLocaleString('it-IT') : 'Mai'}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="modificaUtente(${u.id})" title="Modifica">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${currentUser && u.id !== currentUser.id ? `
                        <button class="btn btn-outline-danger" onclick="eliminaUtente(${u.id})" title="Elimina">
                            <i class="bi bi-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function apriModalNuovoUtente() {
    document.getElementById('adminUtenteId').value = '';
    document.getElementById('adminUtenteNome').value = '';
    document.getElementById('adminUtenteEmail').value = '';
    document.getElementById('adminUtenteAzienda').value = '';
    document.getElementById('adminUtenteTelefono').value = '';
    document.getElementById('adminUtentePassword').value = '';
    document.getElementById('adminUtenteRuolo').value = 'cliente';
    document.getElementById('adminUtenteStato').value = 'attivo';
    
    document.getElementById('permCreateShipments').checked = true;
    document.getElementById('permViewAllShipments').checked = false;
    document.getElementById('permManageDistinte').checked = false;
    document.getElementById('permViewContrassegni').checked = false;
    document.getElementById('permViewReports').checked = false;
    document.getElementById('permViewCosts').checked = false;
    document.getElementById('permAccessShopify').checked = false;
    
    document.getElementById('modalAdminUtenteTitle').textContent = 'Nuovo Utente';
    
    caricaCorrieriCheckboxes();
    caricaListiniCheckboxes();
    
    new bootstrap.Modal(document.getElementById('modalAdminUtente')).show();
}

async function modificaUtente(id) {
    try {
        const response = await fetch(`/api/admin/users/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const u = data.user;
            const p = data.permissions;
            
            document.getElementById('adminUtenteId').value = u.id;
            document.getElementById('adminUtenteNome').value = u.nome;
            document.getElementById('adminUtenteEmail').value = u.email;
            document.getElementById('adminUtenteAzienda').value = u.azienda || '';
            document.getElementById('adminUtenteTelefono').value = u.telefono || '';
            document.getElementById('adminUtentePassword').value = '';
            document.getElementById('adminUtenteRuolo').value = u.ruolo;
            document.getElementById('adminUtenteStato').value = u.stato;
            
            document.getElementById('permCreateShipments').checked = p.can_create_shipments;
            document.getElementById('permViewAllShipments').checked = p.can_view_all_shipments;
            document.getElementById('permManageDistinte').checked = p.can_manage_distinte;
            document.getElementById('permViewContrassegni').checked = p.can_view_contrassegni;
            document.getElementById('permViewReports').checked = p.can_view_reports;
            document.getElementById('permViewCosts').checked = p.can_view_costs;
            document.getElementById('permAccessShopify').checked = p.can_access_shopify;
            
            document.getElementById('modalAdminUtenteTitle').textContent = 'Modifica Utente';
            
            await caricaCorrieriCheckboxes(p.couriers || []);
            await caricaListiniCheckboxes(p.listini ? p.listini.map(l => l.id) : []);
            
            new bootstrap.Modal(document.getElementById('modalAdminUtente')).show();
        }
    } catch (error) {
        console.error('Error loading user:', error);
        alert('Errore nel caricamento utente');
    }
}

async function salvaAdminUtente() {
    const id = document.getElementById('adminUtenteId').value;
    const userData = {
        nome: document.getElementById('adminUtenteNome').value,
        email: document.getElementById('adminUtenteEmail').value,
        azienda: document.getElementById('adminUtenteAzienda').value,
        telefono: document.getElementById('adminUtenteTelefono').value,
        ruolo: document.getElementById('adminUtenteRuolo').value,
        stato: document.getElementById('adminUtenteStato').value
    };
    
    const password = document.getElementById('adminUtentePassword').value;
    if (password) {
        userData.password = password;
    }
    
    try {
        let response;
        if (id) {
            response = await fetch(`/api/admin/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
        } else {
            if (!password) {
                alert('La password è obbligatoria per i nuovi utenti');
                return;
            }
            response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
        }
        
        const data = await response.json();
        
        if (data.success) {
            const userId = id || data.userId;
            
            const permissions = {
                can_create_shipments: document.getElementById('permCreateShipments').checked,
                can_view_all_shipments: document.getElementById('permViewAllShipments').checked,
                can_manage_distinte: document.getElementById('permManageDistinte').checked,
                can_view_contrassegni: document.getElementById('permViewContrassegni').checked,
                can_view_reports: document.getElementById('permViewReports').checked,
                can_view_costs: document.getElementById('permViewCosts').checked,
                can_access_shopify: document.getElementById('permAccessShopify').checked,
                couriers: getSelectedCouriers(),
                listini: getSelectedListini()
            };
            
            await fetch(`/api/admin/users/${userId}/permissions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(permissions)
            });
            
            bootstrap.Modal.getInstance(document.getElementById('modalAdminUtente')).hide();
            caricaUtenti();
            alert(id ? 'Utente aggiornato' : 'Utente creato');
        } else {
            alert(data.message || 'Errore nel salvataggio');
        }
    } catch (error) {
        console.error('Error saving user:', error);
        alert('Errore di connessione');
    }
}

async function eliminaUtente(id) {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;
    
    try {
        const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            caricaUtenti();
            alert('Utente eliminato');
        } else {
            alert(data.message || 'Errore nell\'eliminazione');
        }
    } catch (error) {
        alert('Errore di connessione');
    }
}

async function caricaCorrieriCheckboxes(selected = []) {
    const container = document.getElementById('corrieriCheckboxes');
    if (!container) return;
    
    const corrieri = ['BRT', 'GLS', 'SDA', 'DHL', 'UPS', 'FedEx', 'TNT', 'Poste Italiane'];
    
    container.innerHTML = corrieri.map(c => `
        <div class="col-md-4">
            <div class="form-check">
                <input class="form-check-input courier-checkbox" type="checkbox" value="${c}" id="courier_${c}" 
                    ${selected.includes(c) ? 'checked' : ''}>
                <label class="form-check-label" for="courier_${c}">${c}</label>
            </div>
        </div>
    `).join('');
}

async function caricaListiniCheckboxes(selected = []) {
    const container = document.getElementById('listiniCheckboxes');
    if (!container) return;
    
    try {
        const response = await fetch('/api/admin/listini');
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            container.innerHTML = data.data.map(l => `
                <div class="col-md-6">
                    <div class="form-check">
                        <input class="form-check-input listino-checkbox" type="checkbox" value="${l.id}" id="listino_${l.id}"
                            ${selected.includes(l.id) ? 'checked' : ''}>
                        <label class="form-check-label" for="listino_${l.id}">
                            <strong>${l.nome}</strong> <small class="text-muted">(${l.corriere})</small>
                        </label>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted">Nessun listino disponibile</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="text-danger">Errore nel caricamento listini</p>';
    }
}

function getSelectedCouriers() {
    return Array.from(document.querySelectorAll('.courier-checkbox:checked')).map(cb => cb.value);
}

function getSelectedListini() {
    return Array.from(document.querySelectorAll('.listino-checkbox:checked')).map(cb => parseInt(cb.value));
}

// ============================================
// ADMIN: GESTIONE LISTINI
// ============================================

async function caricaListiniAdmin() {
    try {
        const response = await fetch('/api/admin/listini');
        const data = await response.json();
        
        if (data.success) {
            renderListiniGrid(data.data);
        }
    } catch (error) {
        console.error('Error loading listini:', error);
    }
}

function renderListiniGrid(listini) {
    const container = document.getElementById('listiniGrid');
    if (!container) return;
    
    if (!listini || listini.length === 0) {
        container.innerHTML = '<div class="col-12 text-center py-4">Nessun listino presente. Crea il primo!</div>';
        return;
    }
    
    container.innerHTML = listini.map(l => `
        <div class="col-md-4">
            <div class="card h-100 shadow-sm">
                <div class="card-header bg-${l.attivo ? 'success' : 'secondary'} text-white">
                    <h6 class="mb-0"><i class="bi bi-tag"></i> ${l.nome}</h6>
                </div>
                <div class="card-body">
                    <p class="mb-2"><strong>Corriere:</strong> ${l.corriere}</p>
                    <p class="mb-2 text-muted">${l.descrizione || 'Nessuna descrizione'}</p>
                    <p class="mb-0"><small><i class="bi bi-list"></i> ${l.num_voci || 0} voci</small></p>
                </div>
                <div class="card-footer bg-white">
                    <div class="btn-group btn-group-sm w-100">
                        <button class="btn btn-outline-primary" onclick="modificaListino(${l.id})">
                            <i class="bi bi-pencil"></i> Modifica
                        </button>
                        <button class="btn btn-outline-danger" onclick="eliminaListino(${l.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function apriModalNuovoListino() {
    document.getElementById('adminListinoId').value = '';
    document.getElementById('adminListinoNome').value = '';
    document.getElementById('adminListinoCorriere').value = '';
    document.getElementById('adminListinoDescrizione').value = '';
    
    const tbody = document.getElementById('listinoVociBody');
    if (tbody) tbody.innerHTML = '';
    
    aggiungiVoceListino();
    
    document.getElementById('modalAdminListinoTitle').textContent = 'Nuovo Listino';
    new bootstrap.Modal(document.getElementById('modalAdminListino')).show();
}

async function modificaListino(id) {
    try {
        const response = await fetch(`/api/admin/listini/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const l = data.listino;
            
            document.getElementById('adminListinoId').value = l.id;
            document.getElementById('adminListinoNome').value = l.nome;
            document.getElementById('adminListinoCorriere').value = l.corriere;
            document.getElementById('adminListinoDescrizione').value = l.descrizione || '';
            
            const tbody = document.getElementById('listinoVociBody');
            if (tbody) tbody.innerHTML = '';
            
            if (l.voci && l.voci.length > 0) {
                l.voci.forEach(v => aggiungiVoceListino(v));
            } else {
                aggiungiVoceListino();
            }
            
            document.getElementById('modalAdminListinoTitle').textContent = 'Modifica Listino';
            new bootstrap.Modal(document.getElementById('modalAdminListino')).show();
        }
    } catch (error) {
        alert('Errore nel caricamento listino');
    }
}

function aggiungiVoceListino(voce = {}) {
    const tbody = document.getElementById('listinoVociBody');
    if (!tbody) return;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="form-control form-control-sm voce-zona" value="${voce.zona || ''}" placeholder="es. Italia Nord"></td>
        <td><input type="number" class="form-control form-control-sm voce-peso-da" value="${voce.peso_da || 0}" step="0.1" min="0"></td>
        <td><input type="number" class="form-control form-control-sm voce-peso-a" value="${voce.peso_a || ''}" step="0.1" min="0" required></td>
        <td><input type="number" class="form-control form-control-sm voce-prezzo" value="${voce.prezzo || ''}" step="0.01" min="0" required></td>
        <td><input type="number" class="form-control form-control-sm voce-carburante" value="${voce.supplemento_carburante || 0}" step="0.01" min="0"></td>
        <td><input type="number" class="form-control form-control-sm voce-contrassegno" value="${voce.supplemento_contrassegno || 0}" step="0.01" min="0"></td>
        <td><input type="number" class="form-control form-control-sm voce-assicurazione" value="${voce.supplemento_assicurazione || 0}" step="0.01" min="0"></td>
        <td><button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('tr').remove()"><i class="bi bi-x"></i></button></td>
    `;
    tbody.appendChild(row);
}

async function salvaAdminListino() {
    const id = document.getElementById('adminListinoId').value;
    
    const voci = [];
    document.querySelectorAll('#listinoVociBody tr').forEach(row => {
        const zona = row.querySelector('.voce-zona').value;
        const peso_a = row.querySelector('.voce-peso-a').value;
        const prezzo = row.querySelector('.voce-prezzo').value;
        
        if (zona && peso_a && prezzo) {
            voci.push({
                zona: zona,
                peso_da: parseFloat(row.querySelector('.voce-peso-da').value) || 0,
                peso_a: parseFloat(peso_a),
                prezzo: parseFloat(prezzo),
                supplemento_carburante: parseFloat(row.querySelector('.voce-carburante').value) || 0,
                supplemento_contrassegno: parseFloat(row.querySelector('.voce-contrassegno').value) || 0,
                supplemento_assicurazione: parseFloat(row.querySelector('.voce-assicurazione').value) || 0
            });
        }
    });
    
    const listinoData = {
        nome: document.getElementById('adminListinoNome').value,
        corriere: document.getElementById('adminListinoCorriere').value,
        descrizione: document.getElementById('adminListinoDescrizione').value,
        attivo: true,
        voci: voci
    };
    
    if (!listinoData.nome || !listinoData.corriere) {
        alert('Nome e corriere sono obbligatori');
        return;
    }
    
    try {
        let response;
        if (id) {
            response = await fetch(`/api/admin/listini/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(listinoData)
            });
        } else {
            response = await fetch('/api/admin/listini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(listinoData)
            });
        }
        
        const data = await response.json();
        
        if (data.success) {
            bootstrap.Modal.getInstance(document.getElementById('modalAdminListino')).hide();
            caricaListiniAdmin();
            alert(id ? 'Listino aggiornato' : 'Listino creato');
        } else {
            alert(data.message || 'Errore nel salvataggio');
        }
    } catch (error) {
        alert('Errore di connessione');
    }
}

async function eliminaListino(id) {
    if (!confirm('Sei sicuro di voler eliminare questo listino?')) return;
    
    try {
        const response = await fetch(`/api/admin/listini/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            caricaListiniAdmin();
            alert('Listino eliminato');
        } else {
            alert(data.message || 'Errore nell\'eliminazione');
        }
    } catch (error) {
        alert('Errore di connessione');
    }
}

// ============================================
// ADMIN: TARIFFE
// ============================================

async function caricaTariffe() {
    try {
        const response = await fetch('/api/admin/tariffe');
        const data = await response.json();
        
        if (data.success) {
            renderTariffeTable(data.data);
        }
    } catch (error) {
        console.error('Error loading tariffe:', error);
    }
}

function renderTariffeTable(tariffe) {
    const tbody = document.getElementById('tariffeTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = tariffe.map(t => `
        <tr>
            <td><strong>${t.corriere}</strong></td>
            <td><input type="number" class="form-control form-control-sm" id="tariffa_base_${t.corriere.replace(/ /g,'_')}" value="${t.tariffa_base}" step="0.01"></td>
            <td><input type="number" class="form-control form-control-sm" id="costo_kg_${t.corriere.replace(/ /g,'_')}" value="${t.costo_kg}" step="0.01"></td>
            <td><input type="number" class="form-control form-control-sm" id="costo_contrassegno_${t.corriere.replace(/ /g,'_')}" value="${t.costo_contrassegno}" step="0.01"></td>
            <td><input type="number" class="form-control form-control-sm" id="costo_assicurazione_${t.corriere.replace(/ /g,'_')}" value="${t.costo_assicurazione}" step="0.01"></td>
            <td><input type="number" class="form-control form-control-sm" id="costo_express_${t.corriere.replace(/ /g,'_')}" value="${t.costo_express}" step="0.01"></td>
            <td>
                <div class="form-check">
                    <input type="checkbox" class="form-check-input" id="attivo_${t.corriere.replace(/ /g,'_')}" ${t.attivo ? 'checked' : ''}>
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="salvaTariffa('${t.corriere}')">
                    <i class="bi bi-check"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function salvaTariffa(corriere) {
    const c = corriere.replace(/ /g,'_');
    const tariffaData = {
        tariffa_base: parseFloat(document.getElementById(`tariffa_base_${c}`).value),
        costo_kg: parseFloat(document.getElementById(`costo_kg_${c}`).value),
        costo_contrassegno: parseFloat(document.getElementById(`costo_contrassegno_${c}`).value),
        costo_assicurazione: parseFloat(document.getElementById(`costo_assicurazione_${c}`).value),
        costo_express: parseFloat(document.getElementById(`costo_express_${c}`).value),
        attivo: document.getElementById(`attivo_${c}`).checked
    };
    
    try {
        const response = await fetch(`/api/admin/tariffe/${encodeURIComponent(corriere)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tariffaData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Tariffa ${corriere} aggiornata`);
        } else {
            alert('Errore nel salvataggio');
        }
    } catch (error) {
        alert('Errore di connessione');
    }
}

// ============================================
// ADMIN: LOG ATTIVITÀ
// ============================================

async function caricaActivityLog() {
    try {
        const response = await fetch('/api/admin/activity-log?limit=100');
        const data = await response.json();
        
        if (data.success) {
            renderActivityLog(data.data);
        }
    } catch (error) {
        console.error('Error loading activity log:', error);
    }
}

function renderActivityLog(logs) {
    const tbody = document.getElementById('activityLogBody');
    if (!tbody) return;
    
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Nessuna attività registrata</td></tr>';
        return;
    }
    
    tbody.innerHTML = logs.map(log => `
        <tr>
            <td><small>${new Date(log.created_at).toLocaleString('it-IT')}</small></td>
            <td>${log.user_nome || 'Sistema'}</td>
            <td><span class="badge bg-secondary">${log.action}</span></td>
            <td>${log.entity_type ? `${log.entity_type} #${log.entity_id}` : '-'}</td>
            <td><small class="text-muted">${log.ip_address || '-'}</small></td>
        </tr>
    `).join('');
}

// ============================================
// USER: I MIEI LISTINI
// ============================================

async function caricaMyListini() {
    try {
        const response = await fetch('/api/my/listini');
        const data = await response.json();
        
        if (data.success) {
            renderMyListiniGrid(data.data);
        }
    } catch (error) {
        console.error('Error loading my listini:', error);
    }
}

function renderMyListiniGrid(listini) {
    const container = document.getElementById('myListiniGrid');
    if (!container) return;
    
    if (!listini || listini.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">
                    <i class="bi bi-info-circle"></i> Non hai listini assegnati. Contatta l'amministratore.
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = listini.map(l => `
        <div class="col-md-4">
            <div class="card h-100 shadow-sm">
                <div class="card-header bg-primary text-white">
                    <h6 class="mb-0"><i class="bi bi-tag"></i> ${l.nome}</h6>
                </div>
                <div class="card-body">
                    <p class="mb-2"><strong>Corriere:</strong> ${l.corriere}</p>
                    <p class="mb-0 text-muted">${l.descrizione || ''}</p>
                </div>
                <div class="card-footer bg-white">
                    <button class="btn btn-sm btn-primary w-100" onclick="vediDettaglioListino(${l.id})">
                        <i class="bi bi-eye"></i> Vedi Prezzi
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function vediDettaglioListino(id) {
    try {
        const response = await fetch(`/api/my/listini/${id}`);
        const data = await response.json();
        
        if (data.success) {
            const l = data.listino;
            
            document.getElementById('dettaglioListinoTitle').textContent = l.nome;
            
            let html = `
                <p><strong>Corriere:</strong> ${l.corriere}</p>
                ${l.descrizione ? `<p class="text-muted">${l.descrizione}</p>` : ''}
                <hr>
                <div class="table-responsive">
                    <table class="table table-sm table-striped">
                        <thead class="bg-light">
                            <tr>
                                <th>Zona</th>
                                <th>Peso (kg)</th>
                                <th>Prezzo</th>
                                <th>Suppl. Carburante</th>
                                <th>Suppl. Contrassegno</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            if (l.voci && l.voci.length > 0) {
                html += l.voci.map(v => `
                    <tr>
                        <td>${v.zona}</td>
                        <td>${v.peso_da} - ${v.peso_a}</td>
                        <td><strong>€${v.prezzo.toFixed(2)}</strong></td>
                        <td>€${(v.supplemento_carburante || 0).toFixed(2)}</td>
                        <td>€${(v.supplemento_contrassegno || 0).toFixed(2)}</td>
                    </tr>
                `).join('');
            } else {
                html += '<tr><td colspan="5" class="text-center">Nessuna voce</td></tr>';
            }
            
            html += '</tbody></table></div>';
            
            document.getElementById('dettaglioListinoContent').innerHTML = html;
            new bootstrap.Modal(document.getElementById('modalDettaglioListino')).show();
        }
    } catch (error) {
        alert('Errore nel caricamento listino');
    }
}

// ============================================
// INTEGRAZIONE CON showPage ESISTENTE
// ============================================

// Salva riferimento alla funzione originale
if (typeof window.showPage === 'function') {
    window.showPageOriginal = window.showPage;
}

// Override showPage per caricare dati admin
window.showPage = function(pageId, param) {
    // Nascondi tutte le pagine
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
    
    // Mostra pagina richiesta
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    }
    
    // Carica dati specifici per pagine admin
    switch(pageId) {
        case 'view-admin-users':
            caricaUtenti();
            break;
        case 'view-admin-listini':
            caricaListiniAdmin();
            break;
        case 'view-admin-tariffe':
            caricaTariffe();
            break;
        case 'view-admin-activity':
            caricaActivityLog();
            break;
        case 'view-my-listini':
            caricaMyListini();
            break;
        default:
            // Per altre pagine, chiama la funzione originale se esiste
            if (typeof window.showPageOriginal === 'function') {
                window.showPageOriginal(pageId, param);
            }
    }
};
