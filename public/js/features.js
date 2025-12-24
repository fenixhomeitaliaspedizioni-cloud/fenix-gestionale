/* ========================================
   FENIX HOME ITALIA - Features JS
   features.js - Funzionalità Aggiuntive
   Export CSV, Gestione Giacenze, Stampa
   ======================================== */

// Variabile globale per le spedizioni filtrate correnti
let spedizioniFiltrateCorrente = [];

// ============================================
// RENDER TABELLA SPEDIZIONI (con tracking)
// ============================================

function renderSpedizioniTable(spedizioni, isGiacenze = false) {
    const tbody = document.querySelector('#mainTable tbody');
    if (!tbody) return;
    
    spedizioniFiltrateCorrente = spedizioni; // Salva per export
    
    if (!spedizioni || spedizioni.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4">Nessuna spedizione trovata</td></tr>';
        return;
    }
    
    tbody.innerHTML = spedizioni.map(s => {
        const statoBadge = getStatoBadge(s.stato);
        const trackingDisplay = s.tracking ? 
            `<a href="#" onclick="cercaTracking('${s.tracking}')" class="text-decoration-none"><code>${s.tracking}</code></a>` : 
            '<span class="text-muted">-</span>';
        
        // Pulsante extra per giacenze
        const giacenzaBtn = (s.stato === 'Giacenza' || isGiacenze) ? 
            `<button class="btn btn-warning btn-sm me-1" onclick="apriModalGiacenza(${s.id})" title="Risolvi Pratica"><i class="bi bi-tools"></i></button>` : '';
        
        return `
            <tr>
                <td><input type="checkbox" class="spedizione-check" value="${s.id}" onchange="updateBulkActions()"></td>
                <td><strong>#${s.id}</strong></td>
                <td>${s.data}</td>
                <td><span class="badge bg-secondary">${s.corriere}</span></td>
                <td>${trackingDisplay}</td>
                <td>${s.destinatario?.nome || '-'}</td>
                <td>${s.destinatario?.citta || '-'} (${s.destinatario?.prov || ''})</td>
                <td>${s.dettagli?.contrassegno > 0 ? `<span class="text-success fw-bold">€${s.dettagli.contrassegno.toFixed(2)}</span>` : '-'}</td>
                <td>${statoBadge}</td>
                <td class="text-end">
                    ${giacenzaBtn}
                    <button class="btn btn-outline-primary btn-sm me-1" onclick="dettaglioSpedizione(${s.id})" title="Dettagli"><i class="bi bi-eye"></i></button>
                    <button class="btn btn-outline-dark btn-sm me-1" onclick="stampaEtichetta(${s.id})" title="Stampa"><i class="bi bi-printer"></i></button>
                    <button class="btn btn-outline-danger btn-sm" onclick="eliminaSpedizione(${s.id})" title="Elimina"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatoBadge(stato) {
    const badges = {
        'In Lavorazione': 'bg-secondary',
        'Spedito': 'bg-info',
        'In Transito': 'bg-primary',
        'In Consegna': 'bg-info',
        'Consegnato': 'bg-success',
        'Giacenza': 'bg-warning text-dark',
        'Reso': 'bg-danger',
        'Svincolo': 'bg-secondary',
        'Distrutto': 'bg-dark',
        'Cancellata': 'bg-danger'
    };
    return `<span class="badge ${badges[stato] || 'bg-secondary'}">${stato}</span>`;
}

// ============================================
// STAMPA ETICHETTA
// ============================================

function stampaEtichetta(id) {
    // Apre il PDF dell'etichetta in una nuova scheda
    window.open(`/api/etichetta/${id}`, '_blank');
}

function stampaMassiva() {
    const selezionate = Array.from(document.querySelectorAll('.spedizione-check:checked')).map(cb => cb.value);
    
    if (selezionate.length === 0) {
        alert('Seleziona almeno una spedizione');
        return;
    }
    
    // Stampa ogni etichetta in sequenza
    selezionate.forEach((id, index) => {
        setTimeout(() => {
            window.open(`/api/etichetta/${id}`, '_blank');
        }, index * 500); // Delay per evitare blocco popup
    });
}

// ============================================
// EXPORT CSV
// ============================================

function esportaCSV() {
    // Usa i filtri correnti
    const corriere = document.getElementById('filterCorriere')?.value || '';
    const stato = document.getElementById('filterStato')?.value || '';
    const dataDa = document.getElementById('filterDataDa')?.value || '';
    const dataA = document.getElementById('filterDataA')?.value || '';
    
    let url = '/api/export/spedizioni/csv?';
    if (corriere) url += `corriere=${encodeURIComponent(corriere)}&`;
    if (stato) url += `stato=${encodeURIComponent(stato)}&`;
    if (dataDa) url += `dataDa=${dataDa}&`;
    if (dataA) url += `dataA=${dataA}&`;
    
    window.location.href = url;
}

function esportaExcel() {
    // Per ora usa lo stesso endpoint CSV (Excel legge CSV)
    esportaCSV();
}

// ============================================
// EXPORT REPORT
// ============================================

function esportaReportSpedizioniCSV() {
    const dataDa = document.getElementById('reportDataDa')?.value || '';
    const dataA = document.getElementById('reportDataA')?.value || '';
    const corriere = document.getElementById('reportCorriere')?.value || '';
    
    let url = '/api/export/spedizioni/csv?';
    if (dataDa) url += `dataDa=${dataDa}&`;
    if (dataA) url += `dataA=${dataA}&`;
    if (corriere) url += `corriere=${encodeURIComponent(corriere)}&`;
    
    window.location.href = url;
}

function esportaReportFinanziarioCSV() {
    const dataDa = document.getElementById('reportDataDa')?.value || '';
    const dataA = document.getElementById('reportDataA')?.value || '';
    
    let url = '/api/export/finanziario/csv?';
    if (dataDa) url += `dataDa=${dataDa}&`;
    if (dataA) url += `dataA=${dataA}&`;
    
    window.location.href = url;
}

function esportaReportContrassegniCSV() {
    const dataDa = document.getElementById('reportDataDa')?.value || '';
    const dataA = document.getElementById('reportDataA')?.value || '';
    
    let url = '/api/export/contrassegni/csv?';
    if (dataDa) url += `dataDa=${dataDa}&`;
    if (dataA) url += `dataA=${dataA}&`;
    
    window.location.href = url;
}

function esportaReportPDF() {
    alert('Funzionalità PDF in sviluppo. Per ora usa l\'export CSV.');
    // In futuro: chiamare API che genera PDF con pdfkit
}

// ============================================
// GESTIONE GIACENZE
// ============================================

function apriModalGiacenza(id) {
    // Trova la spedizione
    fetch(`/api/spedizione/${id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.spedizione) {
                const s = data.spedizione;
                
                // Popola modal
                document.getElementById('giacenzaSpedizioneId').value = s.id;
                document.getElementById('giacenzaIdDisplay').textContent = s.id;
                document.getElementById('giacenzaDestinatario').textContent = s.destinatario?.nome || '-';
                document.getElementById('giacenzaIndirizzo').textContent = 
                    `${s.destinatario?.indirizzo || ''}, ${s.destinatario?.cap || ''} ${s.destinatario?.citta || ''}`;
                document.getElementById('giacenzaCorriere').textContent = s.corriere;
                
                // Reset form
                document.getElementById('giacenzaAzione').value = '';
                document.getElementById('giacenzaNote').value = '';
                document.getElementById('giacenzaPreavviso').checked = false;
                document.getElementById('giacenzaFascia').checked = false;
                document.getElementById('giacenzaAnnullaContrassegno').checked = false;
                document.getElementById('giacenzaUrgente').checked = false;
                
                // Nascondi campi cambio indirizzo
                document.getElementById('campiCambioIndirizzo').style.display = 'none';
                
                // Pre-popola campi nuovo indirizzo con dati attuali
                document.getElementById('giacenzaNuovoNome').value = s.destinatario?.nome || '';
                document.getElementById('giacenzaNuovoIndirizzo').value = s.destinatario?.indirizzo || '';
                document.getElementById('giacenzaNuovoTelefono').value = s.destinatario?.telefono || '';
                document.getElementById('giacenzaNuovoCap').value = s.destinatario?.cap || '';
                document.getElementById('giacenzaNuovoCitta').value = s.destinatario?.citta || '';
                document.getElementById('giacenzaNuovoProv').value = s.destinatario?.prov || '';
                
                // Apri modal
                new bootstrap.Modal(document.getElementById('modalGiacenza')).show();
            }
        })
        .catch(err => {
            console.error('Errore caricamento spedizione:', err);
            alert('Errore nel caricamento della spedizione');
        });
}

function toggleGiacenzaCampi() {
    const azione = document.getElementById('giacenzaAzione').value;
    const campiIndirizzo = document.getElementById('campiCambioIndirizzo');
    
    if (azione === 'cambio_indirizzo') {
        campiIndirizzo.style.display = 'block';
    } else {
        campiIndirizzo.style.display = 'none';
    }
}

async function salvaRisoluzioneGiacenza() {
    const id = document.getElementById('giacenzaSpedizioneId').value;
    const azione = document.getElementById('giacenzaAzione').value;
    
    if (!azione) {
        alert('Seleziona un\'azione da eseguire');
        return;
    }
    
    const payload = {
        azione: azione,
        note: document.getElementById('giacenzaNote').value,
        preavvisoTelefonico: document.getElementById('giacenzaPreavviso').checked,
        consegnaAppuntamento: document.getElementById('giacenzaFascia').checked,
        annullaContrassegno: document.getElementById('giacenzaAnnullaContrassegno').checked,
        urgente: document.getElementById('giacenzaUrgente').checked
    };
    
    // Se cambio indirizzo, aggiungi i nuovi dati
    if (azione === 'cambio_indirizzo') {
        payload.nuovoIndirizzo = {
            nome: document.getElementById('giacenzaNuovoNome').value,
            indirizzo: document.getElementById('giacenzaNuovoIndirizzo').value,
            telefono: document.getElementById('giacenzaNuovoTelefono').value,
            cap: document.getElementById('giacenzaNuovoCap').value,
            citta: document.getElementById('giacenzaNuovoCitta').value,
            prov: document.getElementById('giacenzaNuovoProv').value
        };
        
        // Validazione campi obbligatori
        if (!payload.nuovoIndirizzo.indirizzo || !payload.nuovoIndirizzo.cap || !payload.nuovoIndirizzo.citta) {
            alert('Compila indirizzo, CAP e città per il cambio indirizzo');
            return;
        }
    }
    
    try {
        const response = await fetch(`/api/giacenza/${id}/risolvi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(data.message);
            bootstrap.Modal.getInstance(document.getElementById('modalGiacenza')).hide();
            
            // Ricarica la lista
            if (typeof caricaSpedizioni === 'function') {
                caricaSpedizioni();
            } else {
                location.reload();
            }
        } else {
            alert(data.message || 'Errore nella risoluzione della pratica');
        }
    } catch (error) {
        console.error('Errore:', error);
        alert('Errore di connessione');
    }
}

// ============================================
// REPORT E STATISTICHE
// ============================================

async function aggiornaReport() {
    const dataDa = document.getElementById('reportDataDa')?.value || '';
    const dataA = document.getElementById('reportDataA')?.value || '';
    const corriere = document.getElementById('reportCorriere')?.value || '';
    
    try {
        let url = '/api/report/statistiche?';
        if (dataDa) url += `dataDa=${dataDa}&`;
        if (dataA) url += `dataA=${dataA}&`;
        if (corriere) url += `corriere=${encodeURIComponent(corriere)}&`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            const d = result.data;
            
            // Aggiorna KPI
            document.getElementById('reportTotaleSpedizioni').textContent = d.totale;
            document.getElementById('reportConsegnate').textContent = d.consegnate;
            document.getElementById('reportGiacenze').textContent = d.giacenze;
            document.getElementById('reportCostoTotale').textContent = d.costoTotale;
            document.getElementById('reportSuccessRate').textContent = d.successRate;
            
            // Aggiorna dati finanziari
            const totIncassi = document.getElementById('reportTotaleIncassi');
            if (totIncassi) totIncassi.textContent = d.contrassegniIncassati;
            
            const totPendenti = document.getElementById('reportTotalePendenti');
            if (totPendenti) totPendenti.textContent = d.contrassegniPendenti;
            
            const totCosti = document.getElementById('reportTotaleCosti');
            if (totCosti) totCosti.textContent = d.costoTotale;
            
            const margine = document.getElementById('reportMargine');
            if (margine) margine.textContent = d.margine;
        }
    } catch (error) {
        console.error('Errore aggiornamento report:', error);
    }
}

// ============================================
// UTILITY
// ============================================

function updateBulkActions() {
    const selezionate = document.querySelectorAll('.spedizione-check:checked').length;
    const bulkActions = document.getElementById('bulkActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (bulkActions) {
        bulkActions.style.display = selezionate > 0 ? 'block' : 'none';
    }
    if (selectedCount) {
        selectedCount.textContent = selezionate;
    }
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.spedizione-check');
    
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
    updateBulkActions();
}

// Inizializzazione date report
document.addEventListener('DOMContentLoaded', function() {
    // Imposta date default per i filtri report (ultimo mese)
    const oggi = new Date();
    const unMeseFa = new Date();
    unMeseFa.setMonth(unMeseFa.getMonth() - 1);
    
    const reportDataDa = document.getElementById('reportDataDa');
    const reportDataA = document.getElementById('reportDataA');
    
    if (reportDataDa) reportDataDa.value = unMeseFa.toISOString().split('T')[0];
    if (reportDataA) reportDataA.value = oggi.toISOString().split('T')[0];
});
