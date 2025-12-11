/* ========================================
   FENIX HOME ITALIA - GESTIONALE SPEDIZIONI
   Script.js - Logica JavaScript Completa
   ======================================== */

let table;
let currentFilter = 'attive';
let selectedShipments = [];
let chartAndamento, chartCorrieri, chartRegioni;

// Dati Demo
let spedizioni = [
    { id: 1, data: '21/11/2025', corriere: 'BRT', destinatario: { nome: 'Mario Rossi', indirizzo: 'Via Roma 123', cap: '00100', citta: 'Roma', prov: 'RM', telefono: '3331234567', email: 'mario@email.it' }, dettagli: { colli: 2, peso: 5.5, volume: 0.03, contrassegno: 150, assicurazione: false, note: '' }, stato: 'In Transito', tracking: 'BRT123456789' },
    { id: 2, data: '21/11/2025', corriere: 'GLS', destinatario: { nome: 'Luigi Verdi', indirizzo: 'Via Milano 45', cap: '20100', citta: 'Milano', prov: 'MI', telefono: '3339876543', email: '' }, dettagli: { colli: 1, peso: 2.3, volume: 0.01, contrassegno: 0, assicurazione: true, note: 'Fragile' }, stato: 'Spedito', tracking: 'GLS987654321' },
    { id: 3, data: '20/11/2025', corriere: 'SDA', destinatario: { nome: 'Anna Bianchi', indirizzo: 'Corso Italia 78', cap: '10100', citta: 'Torino', prov: 'TO', telefono: '3355556666', email: 'anna@mail.com' }, dettagli: { colli: 3, peso: 12, volume: 0.08, contrassegno: 89.90, assicurazione: false, note: '' }, stato: 'Consegnato', tracking: 'SDA456789123' },
    { id: 4, data: '20/11/2025', corriere: 'DHL', destinatario: { nome: 'Francesco Neri', indirizzo: 'Via Napoli 12', cap: '80100', citta: 'Napoli', prov: 'NA', telefono: '3312223333', email: '' }, dettagli: { colli: 1, peso: 1.5, volume: 0.005, contrassegno: 0, assicurazione: false, note: '' }, stato: 'In Consegna', tracking: 'DHL111222333' },
    { id: 5, data: '19/11/2025', corriere: 'BRT', destinatario: { nome: 'Giulia Marrone', indirizzo: 'Via Firenze 90', cap: '50100', citta: 'Firenze', prov: 'FI', telefono: '3344445555', email: 'giulia@test.it' }, dettagli: { colli: 2, peso: 8, volume: 0.05, contrassegno: 250, assicurazione: true, note: 'Chiamare prima' }, stato: 'Giacenza', tracking: 'BRT555666777' },
    { id: 6, data: '19/11/2025', corriere: 'Poste Italiane', destinatario: { nome: 'Roberto Gialli', indirizzo: 'Via Bologna 34', cap: '40100', citta: 'Bologna', prov: 'BO', telefono: '3398887777', email: '' }, dettagli: { colli: 1, peso: 0.5, volume: 0.002, contrassegno: 0, assicurazione: false, note: '' }, stato: 'Consegnato', tracking: 'POSTE123456' },
    { id: 7, data: '18/11/2025', corriere: 'UPS', destinatario: { nome: 'Chiara Viola', indirizzo: 'Via Genova 56', cap: '16100', citta: 'Genova', prov: 'GE', telefono: '3366667777', email: 'chiara@email.com' }, dettagli: { colli: 4, peso: 25, volume: 0.15, contrassegno: 450, assicurazione: true, note: 'Consegna piano terra' }, stato: 'In Transito', tracking: 'UPS999888777' },
    { id: 8, data: '18/11/2025', corriere: 'GLS', destinatario: { nome: 'Marco Arancio', indirizzo: 'Via Venezia 23', cap: '30100', citta: 'Venezia', prov: 'VE', telefono: '3377778888', email: '' }, dettagli: { colli: 1, peso: 3, volume: 0.02, contrassegno: 75, assicurazione: false, note: '' }, stato: 'Cancellata', tracking: '' },
    { id: 9, data: '17/11/2025', corriere: 'BRT', destinatario: { nome: 'Sara Celeste', indirizzo: 'Via Palermo 67', cap: '90100', citta: 'Palermo', prov: 'PA', telefono: '3388889999', email: 'sara@test.com' }, dettagli: { colli: 2, peso: 6, volume: 0.04, contrassegno: 0, assicurazione: false, note: '' }, stato: 'Consegnato', tracking: 'BRT333444555' },
    { id: 10, data: '17/11/2025', corriere: 'SDA', destinatario: { nome: 'Andrea Grigio', indirizzo: 'Via Bari 89', cap: '70100', citta: 'Bari', prov: 'BA', telefono: '3399990000', email: '' }, dettagli: { colli: 1, peso: 4, volume: 0.03, contrassegno: 120, assicurazione: false, note: '' }, stato: 'In Transito', tracking: 'SDA666777888' },
];

let rubrica = [
    { id: 1, nome: 'Mario Rossi', indirizzo: 'Via Roma 123', cap: '00100', citta: 'Roma', prov: 'RM', telefono: '3331234567', email: 'mario@email.it', spedizioni: 15 },
    { id: 2, nome: 'Luigi Verdi', indirizzo: 'Via Milano 45', cap: '20100', citta: 'Milano', prov: 'MI', telefono: '3339876543', email: '', spedizioni: 8 },
    { id: 3, nome: 'Anna Bianchi', indirizzo: 'Corso Italia 78', cap: '10100', citta: 'Torino', prov: 'TO', telefono: '3355556666', email: 'anna@mail.com', spedizioni: 22 },
];

let distinte = [
    { id: 1, numero: 'DIST-2025-001', data: '21/11/2025', corriere: 'BRT', numSpedizioni: 4, colli: 8, peso: 23.5, stato: 'Chiusa' },
    { id: 2, numero: 'DIST-2025-002', data: '20/11/2025', corriere: 'GLS', numSpedizioni: 2, colli: 3, peso: 8.3, stato: 'Chiusa' },
];

const tariffe = {
    'BRT': { base: 6.50, perKg: 0.50, contrassegno: 2.50, express: 5.00 },
    'GLS': { base: 6.00, perKg: 0.45, contrassegno: 2.00, express: 4.50 },
    'SDA': { base: 5.50, perKg: 0.55, contrassegno: 2.50, express: 5.50 },
    'DHL': { base: 8.00, perKg: 0.60, contrassegno: 3.00, express: 0 },
    'Poste Italiane': { base: 5.00, perKg: 0.40, contrassegno: 2.00, express: 4.00 },
    'UPS': { base: 9.00, perKg: 0.65, contrassegno: 3.50, express: 0 },
};

// INIZIALIZZAZIONE
$(document).ready(function() {
    initDataTable();
    initFormValidation();
    initEventHandlers();
    initAutocomplete();
    loadDashboard();
    setCurrentDate();
    showPage('view-dashboard');
});

function setCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('it-IT', options);
    $('#currentDate').text(today.charAt(0).toUpperCase() + today.slice(1));
    $('#distintaData').val(new Date().toISOString().split('T')[0]);
}

// TOAST NOTIFICHE
function showToast(message, type = 'info', duration = 4000) {
    const icons = { 'success': 'bi-check-circle-fill', 'error': 'bi-x-circle-fill', 'warning': 'bi-exclamation-triangle-fill', 'info': 'bi-info-circle-fill' };
    const bgColors = { 'success': 'bg-success', 'error': 'bg-danger', 'warning': 'bg-warning text-dark', 'info': 'bg-info' };
    const toastId = 'toast-' + Date.now();
    const toastHtml = '<div id="'+toastId+'" class="toast align-items-center text-white '+bgColors[type]+' border-0" role="alert"><div class="d-flex"><div class="toast-body"><i class="bi '+icons[type]+' me-2"></i>'+message+'</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>';
    $('#toastContainer').append(toastHtml);
    const toast = new bootstrap.Toast(document.getElementById(toastId), { delay: duration });
    toast.show();
    document.getElementById(toastId).addEventListener('hidden.bs.toast', function() { this.remove(); });
}

// DASHBOARD
function loadDashboard() {
    const spedizioniOggi = spedizioni.filter(s => s.data === '21/11/2025' && s.stato !== 'Cancellata').length;
    const inTransito = spedizioni.filter(s => ['In Transito', 'Spedito', 'In Consegna'].includes(s.stato)).length;
    const consegnate = spedizioni.filter(s => s.stato === 'Consegnato').length;
    const giacenze = spedizioni.filter(s => s.stato === 'Giacenza').length;
    const contrassegniAttesa = spedizioni.filter(s => s.dettagli.contrassegno > 0 && s.stato !== 'Consegnato' && s.stato !== 'Cancellata').reduce((sum, s) => sum + s.dettagli.contrassegno, 0);
    
    $('#kpiOggi').text(spedizioniOggi);
    $('#kpiTransito').text(inTransito);
    $('#kpiConsegnate').text(consegnate);
    $('#kpiGiacenze').text(giacenze);
    $('#kpiContrassegni').text(contrassegniAttesa.toFixed(2));
    $('#kpiSettimana').text(spedizioni.filter(s => s.stato !== 'Cancellata').length);
    $('#kpiMese').text(spedizioni.filter(s => s.stato !== 'Cancellata').length + 45);
    $('#kpiTempoMedio').text('2.3');
    $('#kpiSuccessRate').text(Math.round((consegnate / (consegnate + giacenze || 1)) * 100));
    
    loadCharts();
    loadRecentShipments();
    loadRecentContrassegni();
    loadAlerts();
}

function loadCharts() {
    const ctxAndamento = document.getElementById('chartAndamento');
    if (ctxAndamento) {
        if (chartAndamento) chartAndamento.destroy();
        const labels = [], dataSpedite = [], dataConsegnate = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            labels.push(d.getDate() + '/' + (d.getMonth() + 1));
            dataSpedite.push(Math.floor(Math.random() * 15) + 5);
            dataConsegnate.push(Math.floor(Math.random() * 12) + 3);
        }
        chartAndamento = new Chart(ctxAndamento, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Spedite', data: dataSpedite, borderColor: '#d32f2f', backgroundColor: 'rgba(211,47,47,0.1)', fill: true, tension: 0.4 }, { label: 'Consegnate', data: dataConsegnate, borderColor: '#4caf50', backgroundColor: 'rgba(76,175,80,0.1)', fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
        });
    }
    
    const ctxCorrieri = document.getElementById('chartCorrieri');
    if (ctxCorrieri) {
        if (chartCorrieri) chartCorrieri.destroy();
        const corrieriCount = {};
        spedizioni.filter(s => s.stato !== 'Cancellata').forEach(s => { corrieriCount[s.corriere] = (corrieriCount[s.corriere] || 0) + 1; });
        chartCorrieri = new Chart(ctxCorrieri, {
            type: 'doughnut',
            data: { labels: Object.keys(corrieriCount), datasets: [{ data: Object.values(corrieriCount), backgroundColor: ['#E3001B', '#002D72', '#00549F', '#FFCC00', '#003F87', '#351C15'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }
    
    const ctxRegioni = document.getElementById('chartRegioni');
    if (ctxRegioni) {
        if (chartRegioni) chartRegioni.destroy();
        chartRegioni = new Chart(ctxRegioni, {
            type: 'bar',
            data: { labels: ['Lombardia', 'Lazio', 'Campania', 'Piemonte', 'Veneto', 'Toscana', 'Sicilia', 'Emilia-R.'], datasets: [{ label: 'Spedizioni', data: [45, 38, 32, 28, 25, 22, 18, 15], backgroundColor: '#d32f2f' }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }
        });
    }
}

function loadRecentShipments() {
    const recent = spedizioni.filter(s => s.stato !== 'Cancellata').slice(0, 5);
    let html = '';
    recent.forEach(s => {
        html += '<tr onclick="visualizzaDettaglio('+s.id+')" style="cursor:pointer"><td><strong>#'+s.id+'</strong></td><td><span class="badge-courier '+getBadgeClass(s.corriere)+'">'+s.corriere+'</span></td><td>'+s.destinatario.nome+'</td><td><span class="badge '+getStatoClass(s.stato)+'">'+s.stato+'</span></td></tr>';
    });
    $('#recentShipments tbody').html(html);
}

function loadRecentContrassegni() {
    const contrassegni = spedizioni.filter(s => s.dettagli.contrassegno > 0 && s.stato !== 'Cancellata').slice(0, 5);
    let html = '';
    contrassegni.forEach(s => {
        const statoIncasso = s.stato === 'Consegnato' ? '<span class="badge bg-success">Incassato</span>' : '<span class="badge bg-warning text-dark">In Attesa</span>';
        html += '<tr><td><strong>#'+s.id+'</strong></td><td>'+s.destinatario.nome+'</td><td class="fw-bold text-success">€ '+s.dettagli.contrassegno.toFixed(2)+'</td><td>'+statoIncasso+'</td></tr>';
    });
    $('#recentContrassegni tbody').html(html || '<tr><td colspan="4" class="text-center text-muted py-3">Nessun contrassegno</td></tr>');
}

function loadAlerts() {
    const giacenze = spedizioni.filter(s => s.stato === 'Giacenza');
    let html = '';
    if (giacenze.length > 0) {
        html += '<a href="#" class="list-group-item list-group-item-action list-group-item-warning" onclick="showPage(\'view-elenco-spedizioni\', \'giacenze\')"><i class="bi bi-exclamation-triangle me-2"></i>'+giacenze.length+' spedizioni in giacenza</a>';
    }
    const scaduti = spedizioni.filter(s => s.dettagli.contrassegno > 200 && s.stato === 'Consegnato');
    if (scaduti.length > 0) {
        html += '<a href="#" class="list-group-item list-group-item-action list-group-item-danger" onclick="showPage(\'view-contrassegni\')"><i class="bi bi-cash-coin me-2"></i>'+scaduti.length+' contrassegni da verificare</a>';
    }
    if (!html) html = '<div class="list-group-item text-center py-4 text-muted"><i class="bi bi-check-circle fs-3 text-success"></i><br>Nessun problema rilevato</div>';
    $('#alertList').html(html);
}

// NAVIGAZIONE
function showPage(pageId, filterType = null) {
    $('.page-view').removeClass('active');
    $('#' + pageId).addClass('active');
    $('.nav-link').removeClass('active');
    
    if (pageId === 'view-elenco-spedizioni' && filterType) {
        currentFilter = filterType;
        let title = '<i class="bi bi-table"></i> Elenco Spedizioni';
        if (filterType === 'cancellate') title = '<i class="bi bi-trash"></i> Cestino Spedizioni';
        else if (filterType === 'giacenze') title = '<i class="bi bi-exclamation-triangle text-warning"></i> Gestione Giacenze';
        $('#pageTitle').html(title);
        if (table) table.ajax.reload();
    }
    
    if (pageId === 'view-dashboard') loadDashboard();
    else if (pageId === 'view-contrassegni') loadContrassegni();
    else if (pageId === 'view-rubrica') loadRubrica();
    else if (pageId === 'view-lista-distinte') loadDistinte();
    else if (pageId === 'view-report') loadReport();
    else if (pageId === 'view-tracking') loadTrackingStats();
    else if (pageId === 'view-shopify') loadShopifyStatus();
}

// DATATABLE
function initDataTable() {
    table = $('#mainTable').DataTable({
        data: getFilteredData(),
        language: { url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/it-IT.json', emptyTable: "Nessuna spedizione trovata" },
        order: [[1, 'desc']],
        columns: [
            { data: null, orderable: false, render: (d,t,row) => '<input type="checkbox" class="shipment-checkbox" value="'+row.id+'" onchange="updateSelection()">' },
            { data: 'id', render: d => '<strong>#'+d+'</strong>' },
            { data: 'data' },
            { data: 'corriere', render: d => '<span class="badge-courier '+getBadgeClass(d)+'">'+d+'</span>' },
            { data: 'destinatario.nome' },
            { data: 'destinatario.citta' },
            { data: 'dettagli.contrassegno', render: d => d > 0 ? '<span class="badge bg-warning text-dark">€ '+parseFloat(d).toFixed(2)+'</span>' : '<span class="text-muted">-</span>' },
            { data: 'stato', render: d => '<span class="badge '+getStatoClass(d)+'">'+d+'</span>' },
            { data: null, className: "text-end", orderable: false, render: (d,t,row) => currentFilter === 'cancellate' ? '<button class="btn btn-sm btn-outline-success" onclick="ripristinaSpedizione('+row.id+')"><i class="bi bi-arrow-counterclockwise"></i></button>' : '<div class="btn-group"><button class="btn btn-sm btn-outline-primary" onclick="visualizzaDettaglio('+row.id+')"><i class="bi bi-eye"></i></button><button class="btn btn-sm btn-outline-dark" onclick="stampaEtichetta('+row.id+')"><i class="bi bi-printer-fill"></i></button><button class="btn btn-sm btn-outline-danger" onclick="eliminaSpedizione('+row.id+')"><i class="bi bi-trash"></i></button></div>' }
        ],
        ajax: (data, callback) => callback({ data: getFilteredData() })
    });
}

function getFilteredData() {
    return spedizioni.filter(row => {
        if (currentFilter === 'cancellate') return row.stato === 'Cancellata';
        if (currentFilter === 'giacenze') return row.stato === 'Giacenza';
        return row.stato !== 'Cancellata';
    });
}

function getBadgeClass(corriere) {
    const c = corriere.toLowerCase().replace(/\s/g, '');
    if (c.includes('brt')) return 'badge-brt';
    if (c.includes('sda')) return 'badge-sda';
    if (c.includes('dhl')) return 'badge-dhl';
    if (c.includes('gls')) return 'badge-gls';
    if (c.includes('poste')) return 'badge-poste';
    if (c.includes('ups')) return 'badge-ups';
    return 'bg-dark';
}

function getStatoClass(stato) {
    const map = { 'Consegnato': 'bg-success', 'In Transito': 'bg-info', 'Spedito': 'bg-primary', 'In Consegna': 'bg-primary', 'Giacenza': 'bg-warning text-dark', 'Cancellata': 'bg-danger', 'In Lavorazione': 'bg-secondary' };
    return map[stato] || 'bg-secondary';
}

// SELEZIONE MULTIPLA
function toggleSelectAll() {
    const checked = $('#selectAll').prop('checked');
    $('.shipment-checkbox').prop('checked', checked);
    updateSelection();
}

function updateSelection() {
    selectedShipments = [];
    $('.shipment-checkbox:checked').each(function() { selectedShipments.push(parseInt($(this).val())); });
    if (selectedShipments.length > 0) { $('#bulkActions').show(); $('#selectedCount').text(selectedShipments.length); } 
    else { $('#bulkActions').hide(); }
}

function stampaMassiva() {
    if (selectedShipments.length === 0) return;
    showToast('Stampa '+selectedShipments.length+' etichette in corso...', 'info');
    setTimeout(() => showToast('Etichette generate!', 'success'), 1500);
}

function eliminaMassiva() {
    if (selectedShipments.length === 0 || !confirm('Eliminare '+selectedShipments.length+' spedizioni?')) return;
    selectedShipments.forEach(id => { const idx = spedizioni.findIndex(s => s.id === id); if (idx > -1) spedizioni[idx].stato = 'Cancellata'; });
    table.ajax.reload(); selectedShipments = []; $('#bulkActions').hide();
    showToast('Spedizioni eliminate', 'success');
}

// FORM SPEDIZIONE
function initFormValidation() {
    const form = document.getElementById('formCompletoSpedizione');
    if (!form) return;
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        let isValid = true;
        const cap = form.querySelector('[name="dest_cap"]');
        if (cap && cap.value && !/^\d{5}$/.test(cap.value)) { cap.classList.add('is-invalid'); isValid = false; }
        const prov = form.querySelector('[name="dest_prov"]');
        if (prov && prov.value && !/^[A-Za-z]{2}$/.test(prov.value)) { prov.classList.add('is-invalid'); isValid = false; }
        if (!form.checkValidity()) isValid = false;
        form.classList.add('was-validated');
        if (isValid) inviaSpedizione();
        else showToast('Compila tutti i campi obbligatori', 'error');
    });
}

function initEventHandlers() {
    $(document).on('input', '[name="dest_prov"]', function() { this.value = this.value.toUpperCase(); });
    $(document).on('input', '[name="dest_cap"]', function() { this.value = this.value.replace(/\D/g, '').substring(0, 5); });
}

function inviaSpedizione() {
    const form = document.getElementById('formCompletoSpedizione');
    const formData = new FormData(form);
    const newId = Math.max(...spedizioni.map(s => s.id)) + 1;
    const nuovaSpedizione = {
        id: newId,
        data: new Date().toLocaleDateString('it-IT'),
        corriere: formData.get('corriere'),
        destinatario: {
            nome: formData.get('dest_nome'),
            indirizzo: formData.get('dest_indirizzo'),
            cap: formData.get('dest_cap'),
            citta: formData.get('dest_citta'),
            prov: formData.get('dest_prov'),
            telefono: formData.get('dest_telefono'),
            email: formData.get('dest_email') || ''
        },
        dettagli: {
            colli: parseInt(formData.get('num_colli')),
            peso: parseFloat(formData.get('peso_totale')),
            volume: parseFloat(formData.get('volume')) || 0,
            contrassegno: parseFloat(formData.get('contrassegno')) || 0,
            assicurazione: formData.get('assicurazione') === 'on',
            note: formData.get('note') || ''
        },
        stato: 'In Lavorazione',
        tracking: ''
    };
    
    if (formData.get('salva_rubrica') === 'on') {
        rubrica.push({
            id: rubrica.length + 1,
            ...nuovaSpedizione.destinatario,
            spedizioni: 1
        });
    }
    
    spedizioni.unshift(nuovaSpedizione);
    form.reset();
    form.classList.remove('was-validated');
    showToast('Spedizione #'+newId+' creata con successo!', 'success');
    showPage('view-elenco-spedizioni', 'attive');
}

// DETTAGLIO SPEDIZIONE
function visualizzaDettaglio(id) {
    const s = spedizioni.find(sp => sp.id === id);
    if (!s) return;
    
    const modalHtml = `
        <div class="modal fade" id="modalDettaglio" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title"><i class="bi bi-info-circle"></i> Spedizione #${s.id}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6 class="text-primary fw-bold border-bottom pb-2"><i class="bi bi-person"></i> DESTINATARIO</h6>
                                <p class="mb-1"><strong>Nome:</strong> ${s.destinatario.nome}</p>
                                <p class="mb-1"><strong>Indirizzo:</strong> ${s.destinatario.indirizzo}</p>
                                <p class="mb-1"><strong>CAP/Città:</strong> ${s.destinatario.cap} ${s.destinatario.citta} (${s.destinatario.prov})</p>
                                <p class="mb-1"><strong>Telefono:</strong> ${s.destinatario.telefono}</p>
                                ${s.destinatario.email ? '<p class="mb-1"><strong>Email:</strong> '+s.destinatario.email+'</p>' : ''}
                            </div>
                            <div class="col-md-6">
                                <h6 class="text-warning fw-bold border-bottom pb-2"><i class="bi bi-box"></i> DETTAGLI</h6>
                                <p class="mb-1"><strong>Corriere:</strong> <span class="badge-courier ${getBadgeClass(s.corriere)}">${s.corriere}</span></p>
                                <p class="mb-1"><strong>Colli:</strong> ${s.dettagli.colli} - <strong>Peso:</strong> ${s.dettagli.peso} Kg</p>
                                <p class="mb-1"><strong>Contrassegno:</strong> ${s.dettagli.contrassegno > 0 ? '€ '+s.dettagli.contrassegno.toFixed(2) : 'No'}</p>
                                <p class="mb-1"><strong>Stato:</strong> <span class="badge ${getStatoClass(s.stato)}">${s.stato}</span></p>
                                <p class="mb-1"><strong>Tracking:</strong> <code>${s.tracking || 'Non disponibile'}</code></p>
                            </div>
                        </div>
                        ${s.tracking ? '<hr><h6>Timeline Tracking</h6>'+getTrackingTimeline(s)+'</div>' : ''}
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-dark" onclick="stampaEtichetta(${s.id})"><i class="bi bi-printer"></i> Stampa</button>
                        <button class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
                    </div>
                </div>
            </div>
        </div>`;
    
    $('#modalDettaglio').remove();
    $('body').append(modalHtml);
    new bootstrap.Modal(document.getElementById('modalDettaglio')).show();
}

function getTrackingTimeline(s) {
    const steps = [
        { stato: 'In Lavorazione', icon: 'bi-box', label: 'Ordine Ricevuto' },
        { stato: 'Spedito', icon: 'bi-truck', label: 'Spedito' },
        { stato: 'In Transito', icon: 'bi-geo-alt', label: 'In Transito' },
        { stato: 'In Consegna', icon: 'bi-house', label: 'In Consegna' },
        { stato: 'Consegnato', icon: 'bi-check-circle', label: 'Consegnato' }
    ];
    const currentIdx = steps.findIndex(st => st.stato === s.stato);
    let html = '<div class="d-flex justify-content-between mt-3">';
    steps.forEach((step, i) => {
        const active = i <= currentIdx ? 'text-success' : 'text-muted';
        html += '<div class="text-center"><i class="bi '+step.icon+' fs-4 '+active+'"></i><br><small class="'+active+'">'+step.label+'</small></div>';
    });
    return html + '</div>';
}

function eliminaSpedizione(id) {
    if (!confirm('Confermi eliminazione spedizione #'+id+'?')) return;
    const idx = spedizioni.findIndex(s => s.id === id);
    if (idx > -1) { spedizioni[idx].stato = 'Cancellata'; table.ajax.reload(); showToast('Spedizione eliminata', 'success'); }
}

function ripristinaSpedizione(id) {
    const idx = spedizioni.findIndex(s => s.id === id);
    if (idx > -1) { spedizioni[idx].stato = 'In Lavorazione'; table.ajax.reload(); showToast('Spedizione ripristinata', 'success'); }
}

function stampaEtichetta(id) {
    showToast('Generazione etichetta #'+id+'...', 'info');
    setTimeout(() => showToast('Etichetta pronta!', 'success'), 1000);
}

// AUTOCOMPLETE RUBRICA
function initAutocomplete() {
    $('#dest_nome').on('input', function() {
        const val = $(this).val().toLowerCase();
        if (val.length < 2) { $('#autocompleteDropdown').hide(); return; }
        const matches = rubrica.filter(c => c.nome.toLowerCase().includes(val));
        if (matches.length === 0) { $('#autocompleteDropdown').hide(); return; }
        let html = '';
        matches.forEach(c => { html += '<div class="autocomplete-item" onclick="selezionaCliente('+c.id+')"><strong>'+c.nome+'</strong><br><small class="text-muted">'+c.indirizzo+', '+c.citta+'</small></div>'; });
        $('#autocompleteDropdown').html(html).show();
    });
    $(document).on('click', function(e) { if (!$(e.target).closest('#dest_nome, #autocompleteDropdown').length) $('#autocompleteDropdown').hide(); });
}

function selezionaCliente(id) {
    const c = rubrica.find(r => r.id === id);
    if (!c) return;
    $('#dest_nome').val(c.nome);
    $('#dest_indirizzo').val(c.indirizzo);
    $('#dest_cap').val(c.cap);
    $('#dest_citta').val(c.citta);
    $('#dest_prov').val(c.prov);
    $('#dest_telefono').val(c.telefono);
    $('#dest_email').val(c.email);
    $('#autocompleteDropdown').hide();
    showToast('Cliente caricato dalla rubrica', 'info');
}

function apriRubrica() {
    let html = '';
    rubrica.forEach(c => { html += '<tr><td>'+c.nome+'</td><td>'+c.indirizzo+'</td><td>'+c.citta+'</td><td><button class="btn btn-sm btn-primary" onclick="selezionaCliente('+c.id+');bootstrap.Modal.getInstance(document.getElementById(\'modalRubrica\')).hide();">Seleziona</button></td></tr>'; });
    $('#rubricaModalBody').html(html);
    new bootstrap.Modal(document.getElementById('modalRubrica')).show();
}

// RUBRICA
function loadRubrica() {
    let html = '';
    rubrica.forEach(c => {
        html += '<tr><td><strong>'+c.nome+'</strong></td><td>'+c.indirizzo+'</td><td>'+c.citta+' ('+c.prov+')</td><td>'+c.telefono+'</td><td>'+(c.email||'-')+'</td><td><span class="badge bg-info">'+c.spedizioni+'</span></td><td class="text-end"><button class="btn btn-sm btn-outline-primary" onclick="modificaCliente('+c.id+')"><i class="bi bi-pencil"></i></button> <button class="btn btn-sm btn-outline-danger" onclick="eliminaCliente('+c.id+')"><i class="bi bi-trash"></i></button></td></tr>';
    });
    $('#rubricaBody').html(html || '<tr><td colspan="7" class="text-center py-3 text-muted">Nessun cliente in rubrica</td></tr>');
}

function nuovoCliente() { new bootstrap.Modal(document.getElementById('modalNuovoCliente')).show(); }

function salvaCliente() {
    const form = document.getElementById('formNuovoCliente');
    const formData = new FormData(form);
    rubrica.push({
        id: rubrica.length + 1,
        nome: formData.get('cliente_nome'),
        indirizzo: formData.get('cliente_indirizzo'),
        cap: formData.get('cliente_cap'),
        citta: formData.get('cliente_citta'),
        prov: formData.get('cliente_prov'),
        telefono: formData.get('cliente_telefono'),
        email: formData.get('cliente_email') || '',
        spedizioni: 0
    });
    bootstrap.Modal.getInstance(document.getElementById('modalNuovoCliente')).hide();
    form.reset();
    loadRubrica();
    showToast('Cliente aggiunto alla rubrica', 'success');
}

function eliminaCliente(id) {
    if (!confirm('Eliminare questo cliente dalla rubrica?')) return;
    rubrica = rubrica.filter(c => c.id !== id);
    loadRubrica();
    showToast('Cliente eliminato', 'success');
}

// CONTRASSEGNI
function loadContrassegni() {
    const contr = spedizioni.filter(s => s.dettagli.contrassegno > 0 && s.stato !== 'Cancellata');
    const daIncassare = contr.filter(s => s.stato !== 'Consegnato').reduce((sum, s) => sum + s.dettagli.contrassegno, 0);
    const inTransito = contr.filter(s => ['In Transito', 'Spedito'].includes(s.stato)).reduce((sum, s) => sum + s.dettagli.contrassegno, 0);
    const incassati = contr.filter(s => s.stato === 'Consegnato').reduce((sum, s) => sum + s.dettagli.contrassegno, 0);
    
    $('#contrassegniDaIncassare').text(daIncassare.toFixed(2));
    $('#contrassegniDaIncassareCount').text(contr.filter(s => s.stato !== 'Consegnato').length);
    $('#contrassegniInTransito').text(inTransito.toFixed(2));
    $('#contrassegniInTransitoCount').text(contr.filter(s => ['In Transito', 'Spedito'].includes(s.stato)).length);
    $('#contrassegniIncassati').text(incassati.toFixed(2));
    $('#contrassegniIncassatiCount').text(contr.filter(s => s.stato === 'Consegnato').length);
    
    let html = '';
    contr.forEach(s => {
        const statoIncasso = s.stato === 'Consegnato' ? '<span class="badge bg-success">Incassato</span>' : '<span class="badge bg-warning text-dark">In Attesa</span>';
        html += '<tr><td><strong>#'+s.id+'</strong></td><td>'+s.data+'</td><td>'+s.destinatario.nome+'</td><td><span class="badge-courier '+getBadgeClass(s.corriere)+'">'+s.corriere+'</span></td><td class="fw-bold">€ '+s.dettagli.contrassegno.toFixed(2)+'</td><td><span class="badge '+getStatoClass(s.stato)+'">'+s.stato+'</span></td><td>'+statoIncasso+'</td><td class="text-end"><button class="btn btn-sm btn-outline-primary" onclick="visualizzaDettaglio('+s.id+')"><i class="bi bi-eye"></i></button></td></tr>';
    });
    $('#contrassegniBody').html(html || '<tr><td colspan="8" class="text-center py-3 text-muted">Nessun contrassegno</td></tr>');
}

// DISTINTE
function loadDistinte() {
    let html = '';
    distinte.forEach(d => {
        html += '<tr><td><strong>'+d.numero+'</strong></td><td>'+d.data+'</td><td><span class="badge-courier '+getBadgeClass(d.corriere)+'">'+d.corriere+'</span></td><td>'+d.numSpedizioni+'</td><td>'+d.colli+'</td><td>'+d.peso+' Kg</td><td><span class="badge '+(d.stato==='Chiusa'?'bg-success':'bg-warning')+'">'+d.stato+'</span></td><td class="text-end"><button class="btn btn-sm btn-outline-primary"><i class="bi bi-eye"></i></button> <button class="btn btn-sm btn-outline-dark"><i class="bi bi-printer"></i></button> <button class="btn btn-sm btn-outline-success"><i class="bi bi-file-earmark-pdf"></i></button></td></tr>';
    });
    $('#distintaArchivioBody').html(html || '<tr><td colspan="8" class="text-center py-3 text-muted">Nessuna distinta</td></tr>');
}

function caricaSpedizioniDistinta() {
    const corriere = $('#distintaCorriere').val();
    if (!corriere) { $('#distintaTable tbody').html('<tr><td colspan="6" class="text-center py-4 text-muted">Seleziona un corriere</td></tr>'); return; }
    const disponibili = spedizioni.filter(s => s.corriere === corriere && s.stato === 'In Lavorazione');
    let html = '';
    disponibili.forEach(s => {
        html += '<tr><td><input type="checkbox" class="distinta-checkbox" value="'+s.id+'" onchange="aggiornaDistintaTotali()"></td><td>#'+s.id+'</td><td>'+s.destinatario.nome+'</td><td>'+s.destinatario.citta+'</td><td>'+s.dettagli.colli+'</td><td>'+s.dettagli.peso+' Kg</td></tr>';
    });
    $('#distintaTable tbody').html(html || '<tr><td colspan="6" class="text-center py-4 text-muted">Nessuna spedizione disponibile per questo corriere</td></tr>');
}

function aggiornaDistintaTotali() {
    let count = 0, colli = 0, peso = 0;
    $('.distinta-checkbox:checked').each(function() {
        const s = spedizioni.find(sp => sp.id === parseInt($(this).val()));
        if (s) { count++; colli += s.dettagli.colli; peso += s.dettagli.peso; }
    });
    $('#distintaCount').text(count);
    $('#distintaColli').text(colli);
    $('#distintaPeso').text(peso.toFixed(1) + ' Kg');
    $('#btnGeneraDistinta').prop('disabled', count === 0);
}

function generaDistinta() {
    const corriere = $('#distintaCorriere').val();
    const ids = [];
    $('.distinta-checkbox:checked').each(function() { ids.push(parseInt($(this).val())); });
    if (ids.length === 0) return;
    
    const nuovaDistinta = {
        id: distinte.length + 1,
        numero: 'DIST-2025-' + String(distinte.length + 1).padStart(3, '0'),
        data: new Date().toLocaleDateString('it-IT'),
        corriere: corriere,
        numSpedizioni: ids.length,
        colli: parseInt($('#distintaColli').text()),
        peso: parseFloat($('#distintaPeso').text()),
        stato: 'Chiusa'
    };
    
    ids.forEach(id => {
        const idx = spedizioni.findIndex(s => s.id === id);
        if (idx > -1) spedizioni[idx].stato = 'Spedito';
    });
    
    distinte.push(nuovaDistinta);
    showToast('Distinta '+nuovaDistinta.numero+' creata!', 'success');
    showPage('view-lista-distinte');
}

// PREVENTIVATORE
function calcolaPreventivo() {
    const corriere = $('[name="corriere"]').val();
    const peso = parseFloat($('[name="peso_totale"]').val()) || 0;
    const colli = parseInt($('[name="num_colli"]').val()) || 1;
    if (!corriere || peso === 0) { $('#stimaCosto').hide(); return; }
    const t = tariffe[corriere];
    if (!t) return;
    const costo = t.base + (peso * t.perKg) + ((colli - 1) * 2);
    $('#costoStimato').text('€ ' + costo.toFixed(2));
    $('#stimaCosto').show();
}

function calcolaPreventivi() {
    const peso = parseFloat($('#prevPeso').val()) || 0;
    const colli = parseInt($('#prevColli').val()) || 1;
    const contrassegno = parseFloat($('#prevContrassegno').val()) || 0;
    const express = $('#prevExpress').prop('checked');
    
    if (peso === 0) { showToast('Inserisci il peso', 'warning'); return; }
    
    let html = '<div class="table-responsive"><table class="table"><thead><tr><th>Corriere</th><th>Tariffa Base</th><th>Supplementi</th><th>Totale</th><th></th></tr></thead><tbody>';
    
    Object.keys(tariffe).forEach(corriere => {
        const t = tariffe[corriere];
        const base = t.base + (peso * t.perKg);
        let supplementi = 0;
        if (contrassegno > 0) supplementi += t.contrassegno;
        if (express && t.express > 0) supplementi += t.express;
        const totale = base + supplementi;
        
        html += '<tr><td><span class="badge-courier '+getBadgeClass(corriere)+'">'+corriere+'</span></td><td>€ '+base.toFixed(2)+'</td><td>€ '+supplementi.toFixed(2)+'</td><td class="fw-bold text-success">€ '+totale.toFixed(2)+'</td><td><button class="btn btn-sm btn-outline-danger" onclick="usaCorriere(\''+corriere+'\')">Usa</button></td></tr>';
    });
    
    html += '</tbody></table></div>';
    $('#preventiviResult').html(html);
}

function usaCorriere(corriere) {
    showPage('view-nuova-spedizione');
    $('[name="corriere"]').val(corriere);
    showToast('Corriere '+corriere+' selezionato', 'info');
}

// REPORT
function loadReport() {
    const totale = spedizioni.filter(s => s.stato !== 'Cancellata').length;
    const consegnate = spedizioni.filter(s => s.stato === 'Consegnato').length;
    const giacenze = spedizioni.filter(s => s.stato === 'Giacenza').length;
    
    $('#reportTotaleSpedizioni').text(totale);
    $('#reportConsegnate').text(consegnate);
    $('#reportGiacenze').text(giacenze);
    $('#reportTempoMedio').text('2.3');
    $('#reportCostoTotale').text((totale * 7.5).toFixed(0));
    $('#reportSuccessRate').text(Math.round((consegnate / (consegnate + giacenze || 1)) * 100));
    
    // Top destinazioni
    const destinazioni = {};
    spedizioni.filter(s => s.stato !== 'Cancellata').forEach(s => {
        const key = s.destinatario.citta;
        destinazioni[key] = (destinazioni[key] || 0) + 1;
    });
    const sorted = Object.entries(destinazioni).sort((a, b) => b[1] - a[1]).slice(0, 10);
    let html = '';
    sorted.forEach((d, i) => { html += '<tr><td>'+(i+1)+'</td><td>'+d[0]+'</td><td>-</td><td class="text-end">'+d[1]+'</td></tr>'; });
    $('#reportTopDestinazioni').html(html);
}

function cambiaReportPeriodo(periodo) {
    $('.btn-group .btn').removeClass('active');
    $(event.target).addClass('active');
    if (periodo === 'custom') $('#customDateRange').show();
    else $('#customDateRange').hide();
    showToast('Periodo: '+periodo, 'info');
}

// TRACKING
function loadTrackingStats() {
    $('#trackInTransito').text(spedizioni.filter(s => s.stato === 'In Transito').length);
    $('#trackInConsegna').text(spedizioni.filter(s => s.stato === 'In Consegna').length);
    $('#trackConsegnate').text(spedizioni.filter(s => s.stato === 'Consegnato').length);
    $('#trackProblemi').text(spedizioni.filter(s => s.stato === 'Giacenza').length);
    
    let html = '';
    spedizioni.filter(s => s.tracking && s.stato !== 'Cancellata').slice(0, 10).forEach(s => {
        html += '<tr><td>#'+s.id+'</td><td><code>'+s.tracking+'</code></td><td><span class="badge-courier '+getBadgeClass(s.corriere)+'">'+s.corriere+'</span></td><td>'+s.destinatario.nome+'</td><td>'+s.data+'</td><td><span class="badge '+getStatoClass(s.stato)+'">'+s.stato+'</span></td></tr>';
    });
    $('#liveTrackingTable tbody').html(html || '<tr><td colspan="6" class="text-center py-3 text-muted">Nessun tracking disponibile</td></tr>');
}

function cercaTracking() {
    const query = $('#trackingInput').val().trim();
    if (!query) return;
    
    let s = spedizioni.find(sp => sp.tracking === query || sp.id === parseInt(query.replace('#', '')));
    if (s) {
        $('#trackingResult').html('<div class="alert alert-success"><strong>Spedizione trovata!</strong></div>'+getTrackingTimeline(s)+'<hr><p><strong>Destinatario:</strong> '+s.destinatario.nome+'<br><strong>Stato:</strong> <span class="badge '+getStatoClass(s.stato)+'">'+s.stato+'</span></p>');
    } else {
        $('#trackingResult').html('<div class="alert alert-warning">Nessuna spedizione trovata per "'+query+'"</div>');
    }
}

// IMPOSTAZIONI
function showSettingsTab(tab) {
    $('.settings-tab').hide();
    $('#settings-'+tab).show();
    $('.list-group-item').removeClass('active');
    $(event.target).addClass('active');
}

// IMPORT E-COMMERCE
function importaOrdini(piattaforma) {
    showToast('Importazione da '+piattaforma+' in corso...', 'info');
    setTimeout(() => {
        const nuovi = Math.floor(Math.random() * 5) + 1;
        showToast(nuovi+' ordini importati da '+piattaforma+'!', 'success');
    }, 2000);
}

// EXPORT
function esportaExcel() { showToast('Export Excel in corso...', 'info'); setTimeout(() => showToast('File Excel generato!', 'success'), 1500); }
function esportaRubrica() { showToast('Export rubrica in corso...', 'info'); }
function esportaContrassegni() { showToast('Export contrassegni in corso...', 'info'); }
function esportaReportExcel() { showToast('Export report Excel...', 'info'); }
function esportaReportPDF() { showToast('Export report PDF...', 'info'); }
function esportaReportCSV() { showToast('Export report CSV...', 'info'); }

// UTILITIES
function applicaFiltri() { if (table) table.ajax.reload(); }
function resetFiltri() { $('#filterCorriere, #filterStato, #filterDataDa, #filterDataA, #filterSearch').val(''); applicaFiltri(); }
function cercaGlobale() { const q = $('#globalSearch').val(); if (q) { showPage('view-elenco-spedizioni', 'attive'); $('#filterSearch').val(q); applicaFiltri(); } }
function cercaRubrica() { loadRubrica(); }
function filterContrassegni(tipo) { $('#contrassegniTabs .nav-link').removeClass('active'); $(event.target).addClass('active'); loadContrassegni(); }
function riconciliaContrassegni() { showToast('Riconciliazione avviata...', 'info'); }
function selezionaTutte() { $('.distinta-checkbox').prop('checked', true); aggiornaDistintaTotali(); }
function toggleSelectAllDistinta() { const checked = $('#selectAllDistinta').prop('checked'); $('.distinta-checkbox').prop('checked', checked); aggiornaDistintaTotali(); }
function aggiornaTrackingLive() { loadTrackingStats(); showToast('Tracking aggiornato', 'success'); }
function eseguiBackup() { showToast('Backup in corso...', 'info'); setTimeout(() => showToast('Backup completato!', 'success'), 2000); }
function ripristinaBackup() { showToast('Questa funzione richiede conferma aggiuntiva', 'warning'); }
function nuovoUtente() { showToast('Funzione disponibile in versione Pro', 'info'); }
function inviaReportEmail() { showToast('Report inviato via email', 'success'); }
function importaRubrica() { showToast('Seleziona file CSV...', 'info'); }

// ============================================
// SHOPIFY INTEGRATION FUNCTIONS
// ============================================

let shopifyOrders = [];

// Carica stato Shopify
async function loadShopifyStatus() {
    try {
        const response = await fetch('/api/shopify/status');
        const data = await response.json();
        
        const statusCard = document.getElementById('shopifyStatusCard');
        const statusLoader = document.getElementById('shopifyStatusLoader');
        const statusContent = document.getElementById('shopifyStatusContent');
        const statusIcon = document.getElementById('shopifyStatusIcon');
        const statusText = document.getElementById('shopifyStatusText');
        
        if (statusLoader) statusLoader.style.display = 'none';
        if (statusContent) statusContent.style.display = 'block';
        
        if (data.enabled && data.configured) {
            if (statusIcon) statusIcon.className = 'bi bi-check-circle fs-1 text-success mb-2';
            if (statusText) statusText.textContent = 'Connesso';
            if (statusCard) statusCard.classList.add('border-success');
        } else {
            if (statusIcon) statusIcon.className = 'bi bi-x-circle fs-1 text-danger mb-2';
            if (statusText) statusText.textContent = 'Non configurato';
            if (statusCard) statusCard.classList.add('border-danger');
        }
        
        updateShopifyCounters();
        
    } catch (error) {
        console.error('Errore caricamento status Shopify:', error);
    }
}

// Testa connessione Shopify
async function testaConnessioneShopify() {
    const resultDiv = document.getElementById('shopifyTestResult');
    resultDiv.innerHTML = '<div class="alert alert-info"><i class="bi bi-hourglass-split"></i> Test in corso...</div>';
    resultDiv.style.display = 'block';
    
    try {
        const response = await fetch('/api/shopify/test-connection', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle"></i> <strong>Successo!</strong><br>
                    Connesso a: <strong>${data.shop?.name || 'Shopify Store'}</strong><br>
                    ${data.shop?.email ? 'Email: ' + data.shop.email + '<br>' : ''}
                    ${data.locations ? 'Locations: ' + data.locations.length : ''}
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-x-circle"></i> <strong>Errore!</strong><br>
                    ${data.message}
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-x-circle"></i> <strong>Errore di rete</strong><br>
                ${error.message}
            </div>
        `;
    }
}

// Carica ordini da Shopify
async function caricaOrdiniShopify() {
    const loadingDiv = document.getElementById('shopifyLoadingOrders');
    const tableDiv = document.getElementById('shopifyOrdersTable');
    const noOrdersDiv = document.getElementById('shopifyNoOrders');
    
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (tableDiv) tableDiv.style.display = 'none';
    if (noOrdersDiv) noOrdersDiv.style.display = 'none';
    
    try {
        const response = await fetch('/api/shopify/orders?limit=50');
        const data = await response.json();
        
        if (data.success && data.orders && data.orders.length > 0) {
            shopifyOrders = data.orders;
            renderShopifyOrders();
            if (tableDiv) tableDiv.style.display = 'block';
        } else {
            if (noOrdersDiv) noOrdersDiv.style.display = 'block';
        }
    } catch (error) {
        showToast('Errore caricamento ordini: ' + error.message, 'error');
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

// Renderizza ordini Shopify
function renderShopifyOrders() {
    const tbody = document.getElementById('shopifyOrdersBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    shopifyOrders.forEach(order => {
        const addr = order.shipping_address || {};
        const peso = order.line_items?.reduce((sum, item) => sum + (item.grams || 0), 0) / 1000;
        
        const row = `
            <tr>
                <td><input type="checkbox" class="shopify-order-checkbox" value="${order.id}"></td>
                <td><strong>${order.name}</strong></td>
                <td>${new Date(order.created_at).toLocaleDateString('it-IT')}</td>
                <td>${order.customer?.first_name || ''} ${order.customer?.last_name || ''}</td>
                <td>${addr.city || ''} (${addr.province_code || ''})</td>
                <td><strong>€${parseFloat(order.total_price).toFixed(2)}</strong></td>
                <td><span class="badge ${order.gateway === 'cash_on_delivery' ? 'bg-warning' : 'bg-success'}">
                    ${order.gateway === 'cash_on_delivery' ? 'Contrassegno' : 'Pagato'}
                </span></td>
                <td>${peso.toFixed(1)} kg</td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
}

// Import ordini selezionati
async function importaOrdiniSelezionatiShopify() {
    const checkboxes = document.querySelectorAll('.shopify-order-checkbox:checked');
    const orderIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (orderIds.length === 0) {
        showToast('Seleziona almeno un ordine', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/shopify/import-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIds })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            caricaOrdiniShopify();
            updateShopifyCounters();
            showPage('view-elenco-spedizioni', 'attive');
        } else {
            showToast('Errore: ' + data.message, 'error');
        }
    } catch (error) {
        showToast('Errore import: ' + error.message, 'error');
    }
}

// Toggle select all
function toggleSelectAllShopify() {
    const selectAll = document.getElementById('selectAllShopifyOrders');
    const checkboxes = document.querySelectorAll('.shopify-order-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
}

// Aggiorna contatori
function updateShopifyCounters() {
    const importati = spedizioni.filter(s => s.shopifyOrderId).length;
    const evasi = spedizioni.filter(s => s.shopifyOrderId && s.shopifyFulfillmentStatus === 'fulfilled').length;
    const attesa = importati - evasi;
    
    const elImportati = document.getElementById('shopifyOrdiniImportati');
    const elEvasi = document.getElementById('shopifyOrdiniEvasi');
    const elAttesa = document.getElementById('shopifyOrdiniAttesa');
    
    if (elImportati) elImportati.textContent = importati;
    if (elEvasi) elEvasi.textContent = evasi;
    if (elAttesa) elAttesa.textContent = attesa;
}

// Mostra tab Shopify
function showShopifyTab(tabName) {
    document.querySelectorAll('.shopify-tab').forEach(tab => tab.style.display = 'none');
    document.querySelectorAll('#shopifyTabs .nav-link').forEach(link => link.classList.remove('active'));
    
    const tabEl = document.getElementById(`shopify-tab-${tabName}`);
    if (tabEl) tabEl.style.display = 'block';
    if (event && event.target) event.target.classList.add('active');
    
    if (tabName === 'import') {
        caricaOrdiniShopify();
    } else if (tabName === 'ordini') {
        loadOrdiniImportati();
    }
}

// Carica ordini importati
function loadOrdiniImportati() {
    const tbody = document.getElementById('shopifyOrdiniImportatiBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const ordiniShopify = spedizioni.filter(s => s.shopifyOrderId);
    
    ordiniShopify.forEach(s => {
        const row = `
            <tr>
                <td>#${s.id}</td>
                <td><strong>${s.shopifyOrderNumber || ''}</strong></td>
                <td>${s.destinatario?.nome || ''}</td>
                <td>${s.corriere || '<span class="text-muted">-</span>'}</td>
                <td>${s.tracking || '<span class="text-muted">-</span>'}</td>
                <td><span class="badge ${getStatoClass(s.stato)}">${s.stato}</span></td>
                <td>
                    ${s.shopifyFulfillmentStatus === 'fulfilled' 
                        ? '<span class="badge bg-success">Evaso</span>' 
                        : '<span class="badge bg-warning">In Attesa</span>'}
                </td>
                <td>
                    ${s.tracking && !s.shopifyFulfillmentId 
                        ? `<button class="btn btn-sm btn-success" onclick="fulfillShopifyOrder(${s.id})">
                              <i class="bi bi-check"></i> Evadi
                           </button>` 
                        : ''}
                </td>
            </tr>
        `;
        tbody.innerHTML += row;
    });
    
    if (ordiniShopify.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">Nessun ordine Shopify importato</td></tr>';
    }
}

// Fulfill singolo ordine
async function fulfillShopifyOrder(spedizioneId) {
    if (!confirm('Confermi di voler marcare questo ordine come evaso su Shopify?')) return;
    
    try {
        const response = await fetch(`/api/shopify/fulfill/${spedizioneId}`, { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            showToast('Ordine marcato come evaso su Shopify', 'success');
            loadOrdiniImportati();
            updateShopifyCounters();
        } else {
            showToast('Errore: ' + data.message, 'error');
        }
    } catch (error) {
        showToast('Errore: ' + error.message, 'error');
    }
}

// Toggle visibilità token
function toggleTokenVisibility() {
    const input = document.getElementById('shopifyToken');
    const icon = document.getElementById('tokenEye');
    
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'bi bi-eye-slash';
    } else {
        input.type = 'password';
        if (icon) icon.className = 'bi bi-eye';
    }
}

// Toggle auto sync
async function toggleAutoSync() {
    const enabled = document.getElementById('autoSyncEnabled').checked;
    const statusDiv = document.getElementById('syncStatus');
    
    try {
        const endpoint = enabled ? '/api/shopify/sync/start' : '/api/shopify/sync/stop';
        const response = await fetch(endpoint, { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            if (statusDiv) {
                statusDiv.className = enabled ? 'alert alert-success' : 'alert alert-secondary';
                statusDiv.innerHTML = `<i class="bi bi-${enabled ? 'check-circle' : 'info-circle'}"></i> ${data.message}`;
            }
            showToast(data.message, 'success');
        } else {
            showToast(data.message, 'warning');
            document.getElementById('autoSyncEnabled').checked = !enabled;
        }
    } catch (error) {
        showToast('Errore: ' + error.message, 'error');
        document.getElementById('autoSyncEnabled').checked = !enabled;
    }
}

// Setup webhooks
async function setupWebhooks() {
    showToast('Configurazione webhook in corso...', 'info');
    
    try {
        const topics = ['orders/create', 'orders/updated', 'orders/cancelled'];
        let created = 0;
        
        for (const topic of topics) {
            const response = await fetch('/api/shopify/webhooks/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic })
            });
            const data = await response.json();
            if (data.success) created++;
        }
        
        showToast(`${created} webhook configurati con successo`, 'success');
    } catch (error) {
        showToast('Errore configurazione webhook: ' + error.message, 'error');
    }
}

// Lista webhooks
async function listaWebhooks() {
    try {
        const response = await fetch('/api/shopify/webhooks');
        const data = await response.json();
        
        if (data.success && data.webhooks) {
            let msg = `Webhook attivi: ${data.webhooks.length}`;
            data.webhooks.forEach(w => {
                msg += `\n- ${w.topic}`;
            });
            alert(msg);
        } else {
            showToast('Nessun webhook configurato', 'info');
        }
    } catch (error) {
        showToast('Errore: ' + error.message, 'error');
    }
}

// ============================================
// FUNZIONI IMPOSTAZIONI E API
// ============================================

// Test connessione API corrieri
function testAPIConnection(corriere) {
    showToast('Test connessione ' + corriere + ' in corso...', 'info');
    setTimeout(() => {
        // Simulazione - in produzione chiamerebbe l'API reale
        if (Math.random() > 0.3) {
            showToast('Connessione ' + corriere + ' riuscita!', 'success');
        } else {
            showToast('Errore connessione ' + corriere + '. Verifica le credenziali.', 'error');
        }
    }, 1500);
}

// Salva configurazione corrieri
function salvaConfigCorrieri() {
    showToast('Salvataggio configurazioni corrieri...', 'info');
    setTimeout(() => {
        showToast('Configurazioni corrieri salvate!', 'success');
    }, 1000);
}

// Salva configurazione e-commerce
function salvaConfigEcommerce() {
    showToast('Salvataggio configurazioni e-commerce...', 'info');
    setTimeout(() => {
        showToast('Configurazioni e-commerce salvate!', 'success');
    }, 1000);
}

// Salva configurazione Shopify da impostazioni
function salvaConfigShopify() {
    const domain = document.getElementById('shopify_settings_domain')?.value;
    const token = document.getElementById('shopify_settings_token')?.value;
    
    if (!domain || !token) {
        showToast('Inserisci dominio e token Shopify', 'warning');
        return;
    }
    
    showToast('Salvataggio configurazione Shopify...', 'info');
    
    fetch('/api/shopify/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            shopDomain: domain,
            accessToken: token,
            enabled: document.getElementById('shopify_settings_enabled')?.checked || false
        })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            showToast('Configurazione Shopify salvata! ' + data.message, 'success');
        } else {
            showToast('Errore: ' + data.message, 'error');
        }
    })
    .catch(err => {
        showToast('Errore salvataggio: ' + err.message, 'error');
    });
}

// Test connessione Shopify da impostazioni
function testaConnessioneShopifySettings() {
    const resultDiv = document.getElementById('shopify_settings_result');
    if (resultDiv) {
        resultDiv.innerHTML = '<div class="alert alert-info mt-3"><i class="bi bi-hourglass-split"></i> Test in corso...</div>';
    }
    
    fetch('/api/shopify/test-connection', { method: 'POST' })
    .then(r => r.json())
    .then(data => {
        if (resultDiv) {
            if (data.success) {
                resultDiv.innerHTML = `
                    <div class="alert alert-success mt-3">
                        <i class="bi bi-check-circle"></i> <strong>Connessione riuscita!</strong><br>
                        Shop: ${data.shop?.name || 'N/D'}<br>
                        ${data.shop?.email ? 'Email: ' + data.shop.email : ''}
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger mt-3">
                        <i class="bi bi-x-circle"></i> <strong>Errore!</strong><br>
                        ${data.message}
                    </div>
                `;
            }
        }
    })
    .catch(err => {
        if (resultDiv) {
            resultDiv.innerHTML = `
                <div class="alert alert-danger mt-3">
                    <i class="bi bi-x-circle"></i> Errore di rete: ${err.message}
                </div>
            `;
        }
    });
}

// Toggle visibilità password
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

// Conferma incasso contrassegno
function confermaIncasso() {
    const spedId = document.getElementById('incassoSpedId')?.textContent;
    const data = document.getElementById('incassoData')?.value;
    const note = document.getElementById('incassoNote')?.value;
    
    showToast('Incasso confermato per spedizione ' + spedId, 'success');
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalIncasso'));
    if (modal) modal.hide();
}

// Crea distinta da selezione
function creaDistintaDaSelezione() {
    if (selectedShipments.length === 0) {
        showToast('Seleziona almeno una spedizione', 'warning');
        return;
    }
    showToast('Creazione distinta per ' + selectedShipments.length + ' spedizioni...', 'info');
    showPage('view-crea-distinta');
}

// Modifica cliente
function modificaCliente(id) {
    const cliente = rubrica.find(c => c.id === id);
    if (!cliente) return;
    
    showToast('Modifica cliente: ' + cliente.nome, 'info');
    // In produzione aprirebbe un modal di modifica
}
