/* ========================================
   FENIX HOME ITALIA - GESTIONALE SPEDIZIONI
   server.js - Backend Express.js v3.0
   Con supporto completo per tutte le feature
   INTEGRAZIONE SHOPIFY + SISTEMA AUTENTICAZIONE
   ======================================== */

const express = require('express');
const app = express();
const path = require('path');
const PDFDocument = require('pdfkit');
const cookieParser = require('cookie-parser');

// === IMPORTS ===
const { ShopifyIntegration, CARRIER_MAPPING, getTrackingUrl } = require('./shopify-integration');
const shopifyConfig = require('./shopify-config');
const { router: authRoutes, requireAuth, requireAdmin, requireOperator } = require('./auth-routes');
const db = require('./database');

// === MIDDLEWARE ===
app.use(express.json());
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// === AUTH ROUTES ===
app.use('/api', authRoutes);

// === MIDDLEWARE PROTEZIONE PAGINE ===
// Pagina login sempre accessibile
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// API check auth per frontend
app.get('/api/check-auth', (req, res) => {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    if (!sessionId) {
        return res.json({ authenticated: false });
    }
    const session = db.getSession(sessionId);
    if (!session) {
        return res.json({ authenticated: false });
    }
    res.json({ 
        authenticated: true, 
        user: {
            id: session.user_id,
            nome: session.nome,
            email: session.email,
            ruolo: session.ruolo,
            azienda: session.azienda
        }
    });
});

// Middleware per proteggere pagine HTML (escluso login e API)
app.use((req, res, next) => {
    // Skip per API, login e file statici
    if (req.path.startsWith('/api') || 
        req.path === '/login' || 
        req.path === '/login.html' ||
        req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        return next();
    }
    
    // Verifica sessione per altre pagine
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) {
        return res.redirect('/login');
    }
    
    const session = db.getSession(sessionId);
    if (!session) {
        res.clearCookie('sessionId');
        return res.redirect('/login');
    }
    
    // Aggiungi user alla request per eventuali usi
    req.user = {
        id: session.user_id,
        nome: session.nome,
        email: session.email,
        ruolo: session.ruolo,
        azienda: session.azienda
    };
    
    next();
});

// === INIZIALIZZAZIONE SHOPIFY ===
let shopifyClient = null;
let shopifyLocations = [];
let shopifySyncInterval = null;

// Inizializza client Shopify se configurato
if (shopifyConfig.shopify.enabled && shopifyConfig.shopify.accessToken) {
    shopifyClient = new ShopifyIntegration({
        shopDomain: shopifyConfig.shopify.shopDomain,
        accessToken: shopifyConfig.shopify.accessToken,
        apiVersion: shopifyConfig.shopify.apiVersion
    });
    console.log('✅ Client Shopify inizializzato');
}

// ============================================
// DATABASE SIMULATO
// ============================================

// Contatori ID
let contatoreSpedizioni = 1010;
let contatoreDistinte = 1;
let contatoreClienti = 100;

// === ARCHIVIO SPEDIZIONI ===
let archivioSpedizioni = [
    {
        id: 1001,
        data: "2025-11-15",
        dataObj: new Date("2025-11-15"),
        corriere: "BRT",
        stato: "Consegnato",
        mittente: {
            nome: "Fenix Home Italia",
            indirizzo: "Via Esempio 1",
            cap: "20100",
            citta: "Milano",
            provincia: "MI"
        },
        destinatario: {
            nome: "Luca Verdi",
            indirizzo: "Via Roma 45",
            cap: "00100",
            citta: "Roma",
            prov: "RM",
            telefono: "3331234567",
            email: "luca.verdi@email.it"
        },
        dettagli: {
            colli: 1,
            peso: 5,
            volume: 0.02,
            contrassegno: 0,
            assicurazione: false,
            note: ""
        },
        tracking: "BRT999ABC123",
        statoIncasso: null,
        costo: 7.50,
        distinaId: null
    },
    {
        id: 1002,
        data: "2025-11-18",
        dataObj: new Date("2025-11-18"),
        corriere: "SDA",
        stato: "In Transito",
        mittente: {
            nome: "Fenix Home Italia",
            indirizzo: "Via Esempio 1",
            cap: "20100",
            citta: "Milano",
            provincia: "MI"
        },
        destinatario: {
            nome: "Mario Rossi",
            indirizzo: "Corso Napoli 78",
            cap: "80100",
            citta: "Napoli",
            prov: "NA",
            telefono: "3339876543",
            email: ""
        },
        dettagli: {
            colli: 2,
            peso: 3.5,
            volume: 0,
            contrassegno: 89.90,
            assicurazione: true,
            note: "Fragile"
        },
        tracking: "SDA001XYZ789",
        statoIncasso: "In Attesa",
        costo: 9.80,
        distinaId: null
    },
    {
        id: 1003,
        data: "2025-11-20",
        dataObj: new Date("2025-11-20"),
        corriere: "GLS",
        stato: "Giacenza",
        mittente: {
            nome: "Fenix Home Italia",
            indirizzo: "Via Esempio 1",
            cap: "20100",
            citta: "Milano",
            provincia: "MI"
        },
        destinatario: {
            nome: "Giulia Bianchi",
            indirizzo: "Via Torino 12",
            cap: "50100",
            citta: "Firenze",
            prov: "FI",
            telefono: "3335556677",
            email: "giulia@test.com"
        },
        dettagli: {
            colli: 1,
            peso: 1.2,
            volume: 0.01,
            contrassegno: 45.00,
            assicurazione: false,
            note: "Consegnare entro venerdì"
        },
        tracking: "GLS777DEF456",
        statoIncasso: "In Attesa",
        costo: 6.50,
        distinaId: null
    },
    {
        id: 1004,
        data: "2025-11-19",
        dataObj: new Date("2025-11-19"),
        corriere: "DHL",
        stato: "Consegnato",
        mittente: {
            nome: "Fenix Home Italia",
            indirizzo: "Via Esempio 1",
            cap: "20100",
            citta: "Milano",
            provincia: "MI"
        },
        destinatario: {
            nome: "Alessandro Conti",
            indirizzo: "Via Milano 55",
            cap: "10100",
            citta: "Torino",
            prov: "TO",
            telefono: "3331112233",
            email: "alex.conti@email.it"
        },
        dettagli: {
            colli: 1,
            peso: 2.5,
            volume: 0.03,
            contrassegno: 120.00,
            assicurazione: true,
            note: ""
        },
        tracking: "DHL888GHI321",
        statoIncasso: "Incassato",
        dataIncasso: "2025-11-20",
        costo: 12.50,
        distinaId: null
    },
    {
        id: 1005,
        data: "2025-11-21",
        dataObj: new Date("2025-11-21"),
        corriere: "BRT",
        stato: "In Lavorazione",
        mittente: {
            nome: "Fenix Home Italia",
            indirizzo: "Via Esempio 1",
            cap: "20100",
            citta: "Milano",
            provincia: "MI"
        },
        destinatario: {
            nome: "Sara Mancini",
            indirizzo: "Via Garibaldi 100",
            cap: "40100",
            citta: "Bologna",
            prov: "BO",
            telefono: "3334445566",
            email: "sara.m@email.it"
        },
        dettagli: {
            colli: 3,
            peso: 8.5,
            volume: 0.1,
            contrassegno: 0,
            assicurazione: false,
            note: ""
        },
        tracking: "",
        statoIncasso: null,
        costo: 11.00,
        distinaId: null
    },
    {
        id: 1006,
        data: "2025-11-21",
        dataObj: new Date("2025-11-21"),
        corriere: "GLS",
        stato: "In Lavorazione",
        mittente: {
            nome: "Fenix Home Italia",
            indirizzo: "Via Esempio 1",
            cap: "20100",
            citta: "Milano",
            provincia: "MI"
        },
        destinatario: {
            nome: "Paolo Ricci",
            indirizzo: "Corso Vittorio 22",
            cap: "16100",
            citta: "Genova",
            prov: "GE",
            telefono: "3337778899",
            email: ""
        },
        dettagli: {
            colli: 1,
            peso: 4.0,
            volume: 0.05,
            contrassegno: 55.50,
            assicurazione: false,
            note: "Chiamare prima"
        },
        tracking: "",
        statoIncasso: "In Attesa",
        costo: 8.20,
        distinaId: null
    }
];

// === ARCHIVIO DISTINTE ===
let archivioDistinte = [];

// === ARCHIVIO RUBRICA CLIENTI ===
let archivioRubrica = [
    {
        id: 1,
        nome: "Luca Verdi",
        indirizzo: "Via Roma 45",
        cap: "00100",
        citta: "Roma",
        prov: "RM",
        telefono: "3331234567",
        email: "luca.verdi@email.it",
        spedizioni: 5,
        ultimaSpedizione: "2025-11-15"
    },
    {
        id: 2,
        nome: "Mario Rossi",
        indirizzo: "Corso Napoli 78",
        cap: "80100",
        citta: "Napoli",
        prov: "NA",
        telefono: "3339876543",
        email: "mario.rossi@email.it",
        spedizioni: 3,
        ultimaSpedizione: "2025-11-18"
    },
    {
        id: 3,
        nome: "Giulia Bianchi",
        indirizzo: "Via Torino 12",
        cap: "50100",
        citta: "Firenze",
        prov: "FI",
        telefono: "3335556677",
        email: "giulia@test.com",
        spedizioni: 8,
        ultimaSpedizione: "2025-11-20"
    },
    {
        id: 4,
        nome: "Alessandro Conti",
        indirizzo: "Via Milano 55",
        cap: "10100",
        citta: "Torino",
        prov: "TO",
        telefono: "3331112233",
        email: "alex.conti@email.it",
        spedizioni: 2,
        ultimaSpedizione: "2025-11-19"
    },
    {
        id: 5,
        nome: "Sara Mancini",
        indirizzo: "Via Garibaldi 100",
        cap: "40100",
        citta: "Bologna",
        prov: "BO",
        telefono: "3334445566",
        email: "sara.m@email.it",
        spedizioni: 1,
        ultimaSpedizione: "2025-11-21"
    }
];

// === ARCHIVIO NOTIFICHE ===
let archivioNotifiche = [
    {
        id: 1,
        tipo: "giacenza",
        icon: "bi-exclamation-triangle",
        color: "warning",
        messaggio: "Nuova giacenza per spedizione #1003",
        timestamp: new Date(),
        letta: false
    },
    {
        id: 2,
        tipo: "contrassegno",
        icon: "bi-cash-coin",
        color: "success",
        messaggio: "Contrassegno incassato #1004 - €120.00",
        timestamp: new Date(Date.now() - 3600000),
        letta: false
    }
];

// === IMPOSTAZIONI ===
let impostazioni = {
    mittente: {
        nome: "Fenix Home Italia",
        piva: "",
        indirizzo: "Via Esempio 1",
        cap: "20100",
        citta: "Milano",
        prov: "MI",
        telefono: "",
        email: "info@fenixhome.it"
    },
    tariffe: {
        BRT: { base: 5.50, pesoKg: 0.80, contrassegno: 2.50, assicurazione: 1.5, express: 5.00 },
        GLS: { base: 5.80, pesoKg: 0.75, contrassegno: 2.80, assicurazione: 1.8, express: 4.50 },
        SDA: { base: 5.20, pesoKg: 0.85, contrassegno: 2.30, assicurazione: 1.6, express: 5.50 },
        DHL: { base: 8.50, pesoKg: 1.20, contrassegno: 3.50, assicurazione: 2.0, express: 8.00 },
        UPS: { base: 9.00, pesoKg: 1.30, contrassegno: 3.80, assicurazione: 2.2, express: 9.00 },
        'Poste Italiane': { base: 4.50, pesoKg: 0.60, contrassegno: 2.00, assicurazione: 1.2, express: 3.50 }
    }
};

// ============================================
// API SPEDIZIONI
// ============================================

// Lista tutte le spedizioni
app.get('/api/spedizioni', (req, res) => {
    res.json({ 
        success: true,
        data: archivioSpedizioni 
    });
});

// Dettaglio singola spedizione
app.get('/api/spedizione/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const spedizione = archivioSpedizioni.find(s => s.id === id);

    if (spedizione) {
        res.json({ success: true, spedizione });
    } else {
        res.status(404).json({ success: false, message: "Spedizione non trovata" });
    }
});

// Crea nuova spedizione
app.post('/api/crea-spedizione', (req, res) => {
    const dati = req.body;

    if (!dati.destinatario || !dati.destinatario.nome || !dati.dettagli) {
        return res.status(400).json({
            success: false,
            message: "Dati incompleti"
        });
    }

    const corriere = dati.dettagli.corriere || "N.D.";
    const peso = parseFloat(dati.dettagli.peso) || 1;
    const contrassegno = parseFloat(dati.dettagli.contrassegno) || 0;
    
    // Calcola costo
    const tariffa = impostazioni.tariffe[corriere];
    let costo = tariffa ? (tariffa.base + peso * tariffa.pesoKg) : 7.00;
    if (contrassegno > 0 && tariffa) costo += tariffa.contrassegno;
    if (dati.dettagli.assicurazione && tariffa) costo += costo * (tariffa.assicurazione / 100);

    const nuova = {
        id: contatoreSpedizioni++,
        data: new Date().toISOString().split('T')[0],
        dataObj: new Date(),
        corriere: corriere,
        stato: "In Lavorazione",
        mittente: dati.mittente || impostazioni.mittente,
        destinatario: dati.destinatario,
        dettagli: {
            colli: parseInt(dati.dettagli.colli) || 1,
            peso: peso,
            volume: parseFloat(dati.dettagli.volume) || 0,
            contrassegno: contrassegno,
            assicurazione: dati.dettagli.assicurazione || false,
            note: dati.dettagli.note || ""
        },
        tracking: "",
        statoIncasso: contrassegno > 0 ? "In Attesa" : null,
        costo: parseFloat(costo.toFixed(2)),
        distinaId: null
    };

    archivioSpedizioni.push(nuova);

    // Aggiungi notifica
    archivioNotifiche.unshift({
        id: archivioNotifiche.length + 1,
        tipo: "spedizione",
        icon: "bi-box-seam",
        color: "primary",
        messaggio: `Nuova spedizione #${nuova.id} creata`,
        timestamp: new Date(),
        letta: false
    });

    res.json({
        success: true,
        id: nuova.id,
        costo: nuova.costo,
        message: "Spedizione creata con successo"
    });
});

// Modifica spedizione
app.put('/api/spedizione/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const spedizione = archivioSpedizioni.find(s => s.id === id);

    if (!spedizione) {
        return res.status(404).json({ success: false, message: "Spedizione non trovata" });
    }

    const dati = req.body;
    
    if (dati.stato) spedizione.stato = dati.stato;
    if (dati.corriere) spedizione.corriere = dati.corriere;
    if (dati.tracking) spedizione.tracking = dati.tracking;
    if (dati.destinatario) Object.assign(spedizione.destinatario, dati.destinatario);
    if (dati.dettagli) Object.assign(spedizione.dettagli, dati.dettagli);

    res.json({ success: true, spedizione, message: "Spedizione aggiornata" });
});

// Cancella spedizione (soft delete)
app.delete('/api/spedizione/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const spedizione = archivioSpedizioni.find(s => s.id === id);

    if (spedizione) {
        spedizione.stato = "Cancellata";
        res.json({ success: true, message: "Spedizione spostata nel cestino" });
    } else {
        res.status(404).json({ success: false, message: "Spedizione non trovata" });
    }
});

// Ripristina spedizione dal cestino
app.post('/api/spedizione/:id/ripristina', (req, res) => {
    const id = parseInt(req.params.id);
    const spedizione = archivioSpedizioni.find(s => s.id === id);

    if (spedizione && spedizione.stato === "Cancellata") {
        spedizione.stato = "In Lavorazione";
        res.json({ success: true, message: "Spedizione ripristinata" });
    } else {
        res.status(404).json({ success: false, message: "Spedizione non trovata o non cancellata" });
    }
});

// Svuota cestino
app.post('/api/svuota-cestino', (req, res) => {
    const eliminati = archivioSpedizioni.filter(s => s.stato === 'Cancellata').length;
    archivioSpedizioni = archivioSpedizioni.filter(s => s.stato !== 'Cancellata');

    res.json({
        success: true,
        message: `Eliminati ${eliminati} elementi`,
        count: eliminati
    });
});

// Elimina multiple spedizioni
app.post('/api/spedizioni/elimina-multiple', (req, res) => {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ success: false, message: "IDs non validi" });
    }

    let count = 0;
    ids.forEach(id => {
        const spedizione = archivioSpedizioni.find(s => s.id === id);
        if (spedizione) {
            spedizione.stato = "Cancellata";
            count++;
        }
    });

    res.json({ success: true, count, message: `${count} spedizioni eliminate` });
});

// ============================================
// API TRACKING
// ============================================

// Cerca tracking
app.get('/api/tracking/:code', (req, res) => {
    const code = req.params.code;
    
    let spedizione = archivioSpedizioni.find(s => 
        s.tracking && s.tracking.toLowerCase() === code.toLowerCase()
    );
    
    if (!spedizione && code.startsWith('#')) {
        const id = parseInt(code.substring(1));
        spedizione = archivioSpedizioni.find(s => s.id === id);
    }
    
    if (!spedizione) {
        spedizione = archivioSpedizioni.find(s => s.id === parseInt(code));
    }

    if (spedizione) {
        // Genera eventi tracking
        const eventi = generaEventiTracking(spedizione);
        res.json({ 
            success: true, 
            spedizione,
            eventi 
        });
    } else {
        res.status(404).json({ success: false, message: "Tracking non trovato" });
    }
});

// Tracking live - spedizioni in transito
app.get('/api/tracking/live', (req, res) => {
    const inTransito = archivioSpedizioni.filter(s => 
        ['Spedito', 'In Transito', 'In Consegna'].includes(s.stato)
    );

    res.json({ success: true, data: inTransito });
});

// Funzione helper per generare eventi tracking
function generaEventiTracking(spedizione) {
    const eventi = [];
    const dataBase = new Date(spedizione.dataObj || spedizione.data);
    
    eventi.push({ 
        data: dataBase.toISOString(), 
        descrizione: 'Spedizione creata', 
        luogo: 'Milano',
        stato: 'Inserito'
    });
    
    if (['Spedito', 'In Transito', 'In Consegna', 'Consegnato'].includes(spedizione.stato)) {
        const d1 = new Date(dataBase);
        d1.setHours(d1.getHours() + 4);
        eventi.push({ 
            data: d1.toISOString(), 
            descrizione: 'Pacco ritirato dal corriere', 
            luogo: 'Hub Milano',
            stato: 'Spedito'
        });
    }
    
    if (['In Transito', 'In Consegna', 'Consegnato'].includes(spedizione.stato)) {
        const d2 = new Date(dataBase);
        d2.setDate(d2.getDate() + 1);
        eventi.push({ 
            data: d2.toISOString(), 
            descrizione: 'In transito verso destinazione', 
            luogo: 'Hub Centrale',
            stato: 'In Transito'
        });
    }
    
    if (['In Consegna', 'Consegnato'].includes(spedizione.stato)) {
        const d3 = new Date(dataBase);
        d3.setDate(d3.getDate() + 2);
        d3.setHours(8, 0, 0);
        eventi.push({ 
            data: d3.toISOString(), 
            descrizione: 'In consegna oggi', 
            luogo: spedizione.destinatario.citta,
            stato: 'In Consegna'
        });
    }
    
    if (spedizione.stato === 'Consegnato') {
        const d4 = new Date(dataBase);
        d4.setDate(d4.getDate() + 2);
        d4.setHours(14, 30, 0);
        eventi.push({ 
            data: d4.toISOString(), 
            descrizione: 'Consegnato', 
            luogo: spedizione.destinatario.citta,
            stato: 'Consegnato'
        });
    }
    
    if (spedizione.stato === 'Giacenza') {
        const d5 = new Date(dataBase);
        d5.setDate(d5.getDate() + 2);
        eventi.push({ 
            data: d5.toISOString(), 
            descrizione: 'Tentativo di consegna fallito - Destinatario assente', 
            luogo: spedizione.destinatario.citta,
            stato: 'Giacenza'
        });
    }
    
    return eventi.reverse();
}

// ============================================
// API DISTINTE
// ============================================

// Lista distinte
app.get('/api/distinte', (req, res) => {
    res.json({ success: true, data: archivioDistinte });
});

// Dettaglio distinta
app.get('/api/distinta/:id', (req, res) => {
    const id = req.params.id;
    const distinta = archivioDistinte.find(d => d.id === id);

    if (distinta) {
        const spedizioni = archivioSpedizioni.filter(s => s.distinaId === id);
        res.json({ success: true, distinta, spedizioni });
    } else {
        res.status(404).json({ success: false, message: "Distinta non trovata" });
    }
});

// Crea distinta
app.post('/api/distinta', (req, res) => {
    const { corriere, spedizioniIds, note, dataRitiro } = req.body;

    if (!corriere || !spedizioniIds || spedizioniIds.length === 0) {
        return res.status(400).json({ success: false, message: "Dati incompleti" });
    }

    let colli = 0, peso = 0;
    
    spedizioniIds.forEach(id => {
        const spedizione = archivioSpedizioni.find(s => s.id === id);
        if (spedizione && spedizione.stato === 'In Lavorazione') {
            colli += spedizione.dettagli.colli;
            peso += spedizione.dettagli.peso;
        }
    });

    const distintaId = `DST-${String(contatoreDistinte++).padStart(5, '0')}`;

    const distinta = {
        id: distintaId,
        data: new Date().toISOString().split('T')[0],
        dataRitiro: dataRitiro || new Date().toISOString().split('T')[0],
        corriere: corriere,
        numSpedizioni: spedizioniIds.length,
        colli: colli,
        pesoTotale: parseFloat(peso.toFixed(1)),
        stato: "In Attesa Ritiro",
        note: note || ""
    };

    archivioDistinte.push(distinta);

    // Aggiorna spedizioni
    spedizioniIds.forEach(id => {
        const spedizione = archivioSpedizioni.find(s => s.id === id);
        if (spedizione) {
            spedizione.stato = "Spedito";
            spedizione.distinaId = distintaId;
            spedizione.tracking = `${corriere.substring(0, 3).toUpperCase()}${Date.now().toString().slice(-6)}${id}`;
        }
    });

    // Notifica
    archivioNotifiche.unshift({
        id: archivioNotifiche.length + 1,
        tipo: "distinta",
        icon: "bi-file-earmark-check",
        color: "info",
        messaggio: `Distinta ${distintaId} creata con ${spedizioniIds.length} spedizioni`,
        timestamp: new Date(),
        letta: false
    });

    res.json({ 
        success: true, 
        distinta,
        message: `Distinta ${distintaId} creata con successo`
    });
});

// Aggiorna stato distinta
app.put('/api/distinta/:id', (req, res) => {
    const id = req.params.id;
    const distinta = archivioDistinte.find(d => d.id === id);

    if (!distinta) {
        return res.status(404).json({ success: false, message: "Distinta non trovata" });
    }

    const { stato } = req.body;
    if (stato) {
        distinta.stato = stato;
        
        // Se ritirata, aggiorna stato spedizioni
        if (stato === "Ritirata") {
            archivioSpedizioni.filter(s => s.distinaId === id).forEach(s => {
                s.stato = "In Transito";
            });
        }
    }

    res.json({ success: true, distinta });
});

// Spedizioni disponibili per distinta (per corriere)
app.get('/api/distinte/spedizioni-disponibili/:corriere', (req, res) => {
    const corriere = req.params.corriere;
    const disponibili = archivioSpedizioni.filter(s => 
        s.corriere === corriere && s.stato === 'In Lavorazione' && !s.distinaId
    );

    res.json({ success: true, data: disponibili });
});

// ============================================
// API CONTRASSEGNI
// ============================================

// Lista contrassegni
app.get('/api/contrassegni', (req, res) => {
    const { filtro } = req.query;
    
    let contrassegni = archivioSpedizioni.filter(s => s.dettagli.contrassegno > 0);

    if (filtro === 'attesa') {
        contrassegni = contrassegni.filter(s => s.statoIncasso === 'In Attesa');
    } else if (filtro === 'incassati') {
        contrassegni = contrassegni.filter(s => s.statoIncasso === 'Incassato');
    } else if (filtro === 'scaduti') {
        const oggi = new Date();
        contrassegni = contrassegni.filter(s => {
            if (s.statoIncasso !== 'In Attesa') return false;
            const dataSpedizione = new Date(s.dataObj || s.data);
            const diffDays = Math.floor((oggi - dataSpedizione) / (1000 * 60 * 60 * 24));
            return diffDays > 10;
        });
    }

    // Calcola totali
    const daIncassare = archivioSpedizioni.filter(s => s.dettagli.contrassegno > 0 && s.statoIncasso === 'In Attesa');
    const incassati = archivioSpedizioni.filter(s => s.dettagli.contrassegno > 0 && s.statoIncasso === 'Incassato');
    
    const stats = {
        daIncassare: {
            totale: daIncassare.reduce((sum, s) => sum + s.dettagli.contrassegno, 0),
            count: daIncassare.length
        },
        incassati: {
            totale: incassati.reduce((sum, s) => sum + s.dettagli.contrassegno, 0),
            count: incassati.length
        }
    };

    res.json({ success: true, data: contrassegni, stats });
});

// Conferma incasso
app.post('/api/contrassegno/:id/incassa', (req, res) => {
    const id = parseInt(req.params.id);
    const spedizione = archivioSpedizioni.find(s => s.id === id);

    if (!spedizione) {
        return res.status(404).json({ success: false, message: "Spedizione non trovata" });
    }

    if (spedizione.dettagli.contrassegno <= 0) {
        return res.status(400).json({ success: false, message: "Spedizione senza contrassegno" });
    }

    const { dataIncasso, note } = req.body;

    spedizione.statoIncasso = "Incassato";
    spedizione.dataIncasso = dataIncasso || new Date().toISOString().split('T')[0];
    spedizione.noteIncasso = note || "";

    // Notifica
    archivioNotifiche.unshift({
        id: archivioNotifiche.length + 1,
        tipo: "contrassegno",
        icon: "bi-cash-coin",
        color: "success",
        messaggio: `Incassato contrassegno #${id} - €${spedizione.dettagli.contrassegno.toFixed(2)}`,
        timestamp: new Date(),
        letta: false
    });

    res.json({ 
        success: true, 
        message: `Incasso di €${spedizione.dettagli.contrassegno.toFixed(2)} confermato`,
        spedizione
    });
});

// ============================================
// API RUBRICA
// ============================================

// Lista clienti
app.get('/api/rubrica', (req, res) => {
    const { search, sort } = req.query;
    
    let clienti = [...archivioRubrica];

    if (search) {
        const s = search.toLowerCase();
        clienti = clienti.filter(c => 
            c.nome.toLowerCase().includes(s) ||
            c.citta.toLowerCase().includes(s) ||
            c.telefono.includes(s)
        );
    }

    if (sort === 'frequenti') {
        clienti.sort((a, b) => b.spedizioni - a.spedizioni);
    } else if (sort === 'recenti') {
        clienti.sort((a, b) => new Date(b.ultimaSpedizione) - new Date(a.ultimaSpedizione));
    }

    res.json({ success: true, data: clienti });
});

// Dettaglio cliente
app.get('/api/rubrica/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const cliente = archivioRubrica.find(c => c.id === id);

    if (cliente) {
        // Trova spedizioni del cliente
        const spedizioni = archivioSpedizioni.filter(s => 
            s.destinatario.nome === cliente.nome && 
            s.destinatario.telefono === cliente.telefono
        );
        res.json({ success: true, cliente, spedizioni });
    } else {
        res.status(404).json({ success: false, message: "Cliente non trovato" });
    }
});

// Aggiungi cliente
app.post('/api/rubrica', (req, res) => {
    const dati = req.body;

    if (!dati.nome || !dati.indirizzo || !dati.citta || !dati.telefono) {
        return res.status(400).json({ success: false, message: "Dati incompleti" });
    }

    const nuovo = {
        id: contatoreClienti++,
        nome: dati.nome,
        indirizzo: dati.indirizzo,
        cap: dati.cap || "",
        citta: dati.citta,
        prov: dati.prov || "",
        telefono: dati.telefono,
        email: dati.email || "",
        spedizioni: 0,
        ultimaSpedizione: null
    };

    archivioRubrica.push(nuovo);

    res.json({ success: true, cliente: nuovo, message: "Cliente aggiunto" });
});

// Modifica cliente
app.put('/api/rubrica/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const cliente = archivioRubrica.find(c => c.id === id);

    if (!cliente) {
        return res.status(404).json({ success: false, message: "Cliente non trovato" });
    }

    const dati = req.body;
    Object.assign(cliente, dati);

    res.json({ success: true, cliente, message: "Cliente aggiornato" });
});

// Elimina cliente
app.delete('/api/rubrica/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = archivioRubrica.findIndex(c => c.id === id);

    if (index !== -1) {
        archivioRubrica.splice(index, 1);
        res.json({ success: true, message: "Cliente eliminato" });
    } else {
        res.status(404).json({ success: false, message: "Cliente non trovato" });
    }
});

// ============================================
// API PREVENTIVATORE
// ============================================

app.post('/api/preventivo', (req, res) => {
    const { peso, colli, contrassegno, assicurazione, express } = req.body;

    if (!peso || peso <= 0) {
        return res.status(400).json({ success: false, message: "Peso non valido" });
    }

    const preventivi = [];

    Object.entries(impostazioni.tariffe).forEach(([corriere, tariffa]) => {
        let costo = tariffa.base + (peso * tariffa.pesoKg);
        
        if (contrassegno > 0) costo += tariffa.contrassegno;
        if (assicurazione) costo += costo * (tariffa.assicurazione / 100);
        if (express) costo += tariffa.express;
        
        costo *= (colli || 1);

        preventivi.push({
            corriere: corriere,
            costo: parseFloat(costo.toFixed(2)),
            tempoConsegna: express ? '24h' : (corriere === 'DHL' || corriere === 'UPS' ? '24-48h' : '48-72h')
        });
    });

    preventivi.sort((a, b) => a.costo - b.costo);

    res.json({ success: true, preventivi });
});

// ============================================
// API REPORT E STATISTICHE
// ============================================

app.get('/api/report', (req, res) => {
    const { periodo, dataInizio, dataFine } = req.query;
    
    const oggi = new Date();
    let filtroDataInizio;

    switch (periodo) {
        case 'settimana':
            filtroDataInizio = new Date(oggi);
            filtroDataInizio.setDate(oggi.getDate() - 7);
            break;
        case 'mese':
            filtroDataInizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
            break;
        case 'anno':
            filtroDataInizio = new Date(oggi.getFullYear(), 0, 1);
            break;
        case 'custom':
            filtroDataInizio = dataInizio ? new Date(dataInizio) : new Date(oggi.getFullYear(), oggi.getMonth(), 1);
            break;
        default:
            filtroDataInizio = new Date(oggi);
            filtroDataInizio.setDate(oggi.getDate() - 30);
    }

    const spedizioniFiltrate = archivioSpedizioni.filter(s => {
        const dataSpedizione = new Date(s.dataObj || s.data);
        return dataSpedizione >= filtroDataInizio && s.stato !== 'Cancellata';
    });

    const consegnate = spedizioniFiltrate.filter(s => s.stato === 'Consegnato').length;
    const totale = spedizioniFiltrate.length;

    // Statistiche per corriere
    const perCorriere = {};
    spedizioniFiltrate.forEach(s => {
        perCorriere[s.corriere] = (perCorriere[s.corriere] || 0) + 1;
    });

    // Top destinazioni
    const perCitta = {};
    spedizioniFiltrate.forEach(s => {
        const key = `${s.destinatario.citta}|${s.destinatario.prov}`;
        perCitta[key] = (perCitta[key] || 0) + 1;
    });
    const topDestinazioni = Object.entries(perCitta)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, count]) => {
            const [citta, prov] = key.split('|');
            return { citta, prov, count };
        });

    // Andamento giornaliero
    const andamento = {};
    spedizioniFiltrate.forEach(s => {
        const data = s.data;
        andamento[data] = (andamento[data] || 0) + 1;
    });

    const report = {
        totaleSpedizioni: totale,
        consegnate: consegnate,
        giacenze: spedizioniFiltrate.filter(s => s.stato === 'Giacenza').length,
        successRate: totale > 0 ? Math.round((consegnate / totale) * 100) : 0,
        costoTotale: spedizioniFiltrate.reduce((sum, s) => sum + (s.costo || 0), 0),
        tempoMedio: 2.3,
        perCorriere,
        topDestinazioni,
        andamento
    };

    res.json({ success: true, report });
});

// Dashboard KPI
app.get('/api/dashboard', (req, res) => {
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);

    const spedizioniOggi = archivioSpedizioni.filter(s => {
        const dataSpedizione = new Date(s.dataObj || s.data);
        dataSpedizione.setHours(0, 0, 0, 0);
        return dataSpedizione.getTime() === oggi.getTime() && s.stato !== 'Cancellata';
    }).length;

    const inTransito = archivioSpedizioni.filter(s => 
        ['Spedito', 'In Transito', 'In Consegna'].includes(s.stato)
    ).length;

    const inizioMese = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
    const consegnateMese = archivioSpedizioni.filter(s => {
        const dataSpedizione = new Date(s.dataObj || s.data);
        return s.stato === 'Consegnato' && dataSpedizione >= inizioMese;
    }).length;

    const giacenze = archivioSpedizioni.filter(s => s.stato === 'Giacenza').length;

    const contrassegniDaIncassare = archivioSpedizioni
        .filter(s => s.dettagli.contrassegno > 0 && s.statoIncasso === 'In Attesa')
        .reduce((sum, s) => sum + s.dettagli.contrassegno, 0);

    const inizioSettimana = new Date(oggi);
    inizioSettimana.setDate(oggi.getDate() - oggi.getDay() + 1);
    const spedizioniSettimana = archivioSpedizioni.filter(s => {
        const dataSpedizione = new Date(s.dataObj || s.data);
        return dataSpedizione >= inizioSettimana && s.stato !== 'Cancellata';
    }).length;

    const spedizioniMese = archivioSpedizioni.filter(s => {
        const dataSpedizione = new Date(s.dataObj || s.data);
        return dataSpedizione >= inizioMese && s.stato !== 'Cancellata';
    }).length;

    res.json({
        success: true,
        kpi: {
            spedizioniOggi,
            inTransito,
            consegnateMese,
            giacenze,
            contrassegniDaIncassare,
            spedizioniSettimana,
            spedizioniMese,
            tempoMedio: 2.3
        }
    });
});

// ============================================
// API NOTIFICHE
// ============================================

app.get('/api/notifiche', (req, res) => {
    res.json({ success: true, data: archivioNotifiche });
});

app.post('/api/notifiche/segna-lette', (req, res) => {
    archivioNotifiche.forEach(n => n.letta = true);
    res.json({ success: true, message: "Tutte le notifiche segnate come lette" });
});

app.delete('/api/notifica/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = archivioNotifiche.findIndex(n => n.id === id);
    
    if (index !== -1) {
        archivioNotifiche.splice(index, 1);
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

// ============================================
// API IMPOSTAZIONI
// ============================================

app.get('/api/impostazioni', (req, res) => {
    res.json({ success: true, impostazioni });
});

app.put('/api/impostazioni/mittente', (req, res) => {
    Object.assign(impostazioni.mittente, req.body);
    res.json({ success: true, mittente: impostazioni.mittente });
});

app.put('/api/impostazioni/tariffe', (req, res) => {
    Object.assign(impostazioni.tariffe, req.body);
    res.json({ success: true, tariffe: impostazioni.tariffe });
});

// ============================================
// API IMPORT E-COMMERCE
// ============================================

// Import Shopify (simulato)
app.post('/api/importa-shopify', (req, res) => {
    const ordiniShopify = [
        {
            order_number: Date.now(),
            shipping_address: {
                first_name: "Cliente",
                last_name: `Shopify ${Math.floor(Math.random() * 1000)}`,
                address1: "Via Test " + Math.floor(Math.random() * 100),
                city: ["Milano", "Roma", "Napoli", "Torino"][Math.floor(Math.random() * 4)],
                zip: String(Math.floor(Math.random() * 90000) + 10000),
                province_code: ["MI", "RM", "NA", "TO"][Math.floor(Math.random() * 4)],
                phone: "333" + Math.floor(Math.random() * 9000000 + 1000000)
            },
            customer: { email: "cliente@shopify.com" },
            line_items: [{ grams: Math.floor(Math.random() * 5000) + 500 }]
        }
    ];

    let contatore = 0;

    ordiniShopify.forEach(ordine => {
        const nuova = {
            id: contatoreSpedizioni++,
            data: new Date().toISOString().split('T')[0],
            dataObj: new Date(),
            corriere: "",
            stato: "In Lavorazione",
            mittente: impostazioni.mittente,
            destinatario: {
                nome: `${ordine.shipping_address.first_name} ${ordine.shipping_address.last_name}`,
                indirizzo: ordine.shipping_address.address1,
                cap: ordine.shipping_address.zip,
                citta: ordine.shipping_address.city,
                prov: ordine.shipping_address.province_code,
                telefono: ordine.shipping_address.phone,
                email: ordine.customer.email
            },
            dettagli: {
                colli: 1,
                peso: parseFloat((ordine.line_items[0].grams / 1000).toFixed(1)),
                volume: 0,
                contrassegno: 0,
                assicurazione: false,
                note: `Importato da Shopify #${ordine.order_number}`
            },
            tracking: "",
            statoIncasso: null,
            costo: 0,
            distinaId: null
        };

        archivioSpedizioni.push(nuova);
        contatore++;
    });

    archivioNotifiche.unshift({
        id: archivioNotifiche.length + 1,
        tipo: "ecommerce",
        icon: "bi-bag",
        color: "success",
        messaggio: `${contatore} ordini importati da Shopify`,
        timestamp: new Date(),
        letta: false
    });

    setTimeout(() => {
        res.json({
            success: true,
            message: `Importazione completata`,
            count: contatore
        });
    }, 500);
});

// Import WooCommerce (simulato)
app.post('/api/importa-woocommerce', (req, res) => {
    const contatore = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < contatore; i++) {
        const nuova = {
            id: contatoreSpedizioni++,
            data: new Date().toISOString().split('T')[0],
            dataObj: new Date(),
            corriere: "",
            stato: "In Lavorazione",
            mittente: impostazioni.mittente,
            destinatario: {
                nome: `Cliente WooCommerce ${Math.floor(Math.random() * 1000)}`,
                indirizzo: "Via WooCommerce " + Math.floor(Math.random() * 100),
                cap: String(Math.floor(Math.random() * 90000) + 10000),
                citta: ["Milano", "Roma", "Napoli", "Firenze"][Math.floor(Math.random() * 4)],
                prov: ["MI", "RM", "NA", "FI"][Math.floor(Math.random() * 4)],
                telefono: "333" + Math.floor(Math.random() * 9000000 + 1000000),
                email: "cliente@woocommerce.it"
            },
            dettagli: {
                colli: 1,
                peso: parseFloat((Math.random() * 5 + 0.5).toFixed(1)),
                volume: 0,
                contrassegno: Math.random() < 0.3 ? parseFloat((Math.random() * 100 + 20).toFixed(2)) : 0,
                assicurazione: false,
                note: "Importato da WooCommerce"
            },
            tracking: "",
            statoIncasso: null,
            costo: 0,
            distinaId: null
        };

        if (nuova.dettagli.contrassegno > 0) {
            nuova.statoIncasso = "In Attesa";
        }

        archivioSpedizioni.push(nuova);
    }

    archivioNotifiche.unshift({
        id: archivioNotifiche.length + 1,
        tipo: "ecommerce",
        icon: "bi-wordpress",
        color: "primary",
        messaggio: `${contatore} ordini importati da WooCommerce`,
        timestamp: new Date(),
        letta: false
    });

    res.json({ success: true, message: "Importazione completata", count: contatore });
});

// Import Amazon (simulato)
app.post('/api/importa-amazon', (req, res) => {
    const contatore = Math.floor(Math.random() * 2) + 1;
    
    for (let i = 0; i < contatore; i++) {
        const nuova = {
            id: contatoreSpedizioni++,
            data: new Date().toISOString().split('T')[0],
            dataObj: new Date(),
            corriere: "",
            stato: "In Lavorazione",
            mittente: impostazioni.mittente,
            destinatario: {
                nome: `Cliente Amazon ${Math.floor(Math.random() * 1000)}`,
                indirizzo: "Via Amazon " + Math.floor(Math.random() * 100),
                cap: String(Math.floor(Math.random() * 90000) + 10000),
                citta: ["Milano", "Roma", "Bologna", "Venezia"][Math.floor(Math.random() * 4)],
                prov: ["MI", "RM", "BO", "VE"][Math.floor(Math.random() * 4)],
                telefono: "333" + Math.floor(Math.random() * 9000000 + 1000000),
                email: "cliente@amazon.it"
            },
            dettagli: {
                colli: 1,
                peso: parseFloat((Math.random() * 3 + 0.3).toFixed(1)),
                volume: 0,
                contrassegno: 0,
                assicurazione: false,
                note: "Importato da Amazon"
            },
            tracking: "",
            statoIncasso: null,
            costo: 0,
            distinaId: null
        };

        archivioSpedizioni.push(nuova);
    }

    archivioNotifiche.unshift({
        id: archivioNotifiche.length + 1,
        tipo: "ecommerce",
        icon: "bi-box",
        color: "warning",
        messaggio: `${contatore} ordini importati da Amazon`,
        timestamp: new Date(),
        letta: false
    });

    res.json({ success: true, message: "Importazione completata", count: contatore });
});

// ============================================
// API GENERA ETICHETTA PDF
// ============================================

app.get('/api/etichetta/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const spedizione = archivioSpedizioni.find(s => s.id === id);

    if (!spedizione) {
        return res.status(404).send("Spedizione non trovata");
    }

    const doc = new PDFDocument({ size: 'A6', margin: 20 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=LDV-${id}.pdf`);

    doc.pipe(res);

    // === INTESTAZIONE ===
    doc.fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#d32f2f')
        .text('FENIX HOME ITALIA', { align: 'center' });

    doc.fontSize(8)
        .font('Helvetica')
        .fillColor('#000000')
        .text('Servizio Logistico', { align: 'center' });

    doc.moveDown(0.5);
    doc.lineWidth(2).moveTo(20, 60).lineTo(270, 60).stroke();

    // === TRACKING BARCODE ===
    doc.moveDown(1);
    const trackingCode = spedizione.tracking || `TRK-${id}-${Date.now().toString().slice(-4)}`;

    doc.rect(40, 70, 200, 30).fill('#000000');
    doc.fill('#FFFFFF')
        .fontSize(10)
        .text(trackingCode, 40, 78, { width: 200, align: 'center' });
    doc.fill('#000000');

    // === CORRIERE ===
    doc.moveDown(2.5);
    doc.fontSize(12)
        .font('Helvetica-Bold')
        .text(`Corriere: ${spedizione.corriere || 'N.D.'}`, { align: 'center' });

    // === DESTINATARIO ===
    doc.moveDown(1);
    doc.fontSize(9).font('Helvetica').text('DESTINATARIO:', { underline: true });
    doc.fontSize(14).font('Helvetica-Bold').text(spedizione.destinatario.nome);
    doc.fontSize(11).font('Helvetica').text(spedizione.destinatario.indirizzo || "");
    doc.text(`${spedizione.destinatario.cap || ''} - ${spedizione.destinatario.citta} (${spedizione.destinatario.prov || ''})`);
    doc.fontSize(9).text(`Tel: ${spedizione.destinatario.telefono || 'N/D'}`);

    // === MITTENTE ===
    doc.moveDown(1);
    doc.fontSize(8).font('Helvetica').text('MITTENTE:', { underline: true });
    doc.text(`${spedizione.mittente.nome}`);
    doc.text(`${spedizione.mittente.indirizzo}, ${spedizione.mittente.cap} ${spedizione.mittente.citta}`);

    // === DETTAGLI PACCO ===
    doc.rect(20, 320, 250, 60).stroke();
    doc.fontSize(10).font('Helvetica-Bold').text(`Colli: ${spedizione.dettagli.colli}`, 30, 330);
    doc.text(`Peso: ${spedizione.dettagli.peso} kg`, 150, 330);
    doc.fontSize(9).font('Helvetica').text(`Data: ${spedizione.data}`, 30, 350);

    if (spedizione.dettagli.contrassegno > 0) {
        doc.fontSize(11)
            .font('Helvetica-Bold')
            .fillColor('#d32f2f')
            .text(`CONTRASSEGNO: € ${spedizione.dettagli.contrassegno.toFixed(2)}`, 30, 365);
        doc.fillColor('#000000');
    }

    // === FOOTER ===
    doc.fontSize(7)
        .font('Helvetica')
        .fillColor('#666666')
        .text('Generato da Fenix Gestionale v2.0', 20, 395, { align: 'center' });

    doc.end();
});

// Stampa multipla etichette
app.post('/api/etichette-multiple', (req, res) => {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: "IDs non validi" });
    }

    // In produzione, genererebbe un PDF con tutte le etichette
    res.json({ 
        success: true, 
        message: `Preparate ${ids.length} etichette per la stampa`,
        url: `/api/etichette-batch?ids=${ids.join(',')}`
    });
});

// ============================================
// API BACKUP
// ============================================

app.get('/api/backup', (req, res) => {
    const backup = {
        exportDate: new Date().toISOString(),
        version: "2.0",
        data: {
            spedizioni: archivioSpedizioni,
            distinte: archivioDistinte,
            rubrica: archivioRubrica,
            impostazioni: impostazioni
        }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=fenix_backup_${new Date().toISOString().split('T')[0]}.json`);
    res.json(backup);
});

app.post('/api/restore', (req, res) => {
    const { data } = req.body;

    if (!data) {
        return res.status(400).json({ success: false, message: "Dati backup non validi" });
    }

    try {
        if (data.spedizioni) archivioSpedizioni = data.spedizioni;
        if (data.distinte) archivioDistinte = data.distinte;
        if (data.rubrica) archivioRubrica = data.rubrica;
        if (data.impostazioni) Object.assign(impostazioni, data.impostazioni);

        res.json({ success: true, message: "Backup ripristinato con successo" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Errore nel ripristino" });
    }
});

// ============================================
// API SHOPIFY - CONFIGURAZIONE E TEST
// ============================================

app.get('/api/shopify/status', (req, res) => {
    res.json({
        success: true,
        enabled: shopifyConfig.shopify.enabled,
        configured: !!shopifyClient,
        shopDomain: shopifyConfig.shopify.shopDomain,
        autoSync: shopifyConfig.shopify.sync.autoImport
    });
});

app.post('/api/shopify/test-connection', async (req, res) => {
    if (!shopifyClient) {
        return res.status(400).json({
            success: false,
            message: 'Shopify non configurato. Configura accessToken in shopify-config.js'
        });
    }

    const result = await shopifyClient.testConnection();
    
    if (result.success) {
        const locationsResp = await shopifyClient.getLocations();
        if (locationsResp.success && locationsResp.locations.length > 0) {
            shopifyLocations = locationsResp.locations;
            result.locations = shopifyLocations;
        }
    }
    
    res.json(result);
});

app.post('/api/shopify/configure', (req, res) => {
    const { shopDomain, accessToken, enabled } = req.body;

    if (!shopDomain || !accessToken) {
        return res.status(400).json({
            success: false,
            message: 'Shop domain e access token richiesti'
        });
    }

    shopifyConfig.shopify.shopDomain = shopDomain;
    shopifyConfig.shopify.accessToken = accessToken;
    shopifyConfig.shopify.enabled = enabled !== false;

    shopifyClient = new ShopifyIntegration({
        shopDomain: shopDomain,
        accessToken: accessToken,
        apiVersion: shopifyConfig.shopify.apiVersion
    });

    res.json({
        success: true,
        message: 'Configurazione Shopify aggiornata. Riavvia il server per applicare.'
    });
});

// ============================================
// API SHOPIFY - IMPORT ORDINI
// ============================================

app.get('/api/shopify/orders', async (req, res) => {
    if (!shopifyClient) {
        return res.status(400).json({
            success: false,
            message: 'Shopify non configurato'
        });
    }

    const { limit, fulfillmentStatus } = req.query;

    const result = await shopifyClient.getUnfulfilledOrders({
        limit: parseInt(limit) || 50,
        fulfillmentStatus: fulfillmentStatus || 'unfulfilled'
    });

    res.json(result);
});

app.post('/api/shopify/import-orders', async (req, res) => {
    if (!shopifyClient) {
        return res.status(400).json({
            success: false,
            message: 'Shopify non configurato'
        });
    }

    try {
        const { orderIds } = req.body;
        let ordersToImport = [];

        if (orderIds && orderIds.length > 0) {
            for (const orderId of orderIds) {
                const result = await shopifyClient.getOrder(orderId);
                if (result.success) {
                    ordersToImport.push(result.order);
                }
            }
        } else {
            const result = await shopifyClient.getUnfulfilledOrders({ limit: 50 });
            if (!result.success) {
                return res.status(500).json(result);
            }
            ordersToImport = result.orders;
        }

        let importati = 0;
        let duplicati = 0;

        for (const order of ordersToImport) {
            const esistente = archivioSpedizioni.find(s => s.shopifyOrderId === order.id);

            if (esistente) {
                duplicati++;
                continue;
            }

            const spedizione = shopifyClient.convertOrderToShipment(order, impostazioni.mittente);
            spedizione.id = contatoreSpedizioni++;
            
            if (shopifyConfig.rules.autoAssignCarrier.enabled) {
                spedizione.corriere = applicaRegoleCorriere(order, spedizione);
            }

            archivioSpedizioni.push(spedizione);
            
            if (shopifyConfig.shopify.fulfillment.addTags) {
                await shopifyClient.addOrderTags(order.id, 'Importato Fenix');
            }
            
            importati++;
        }

        if (importati > 0) {
            archivioNotifiche.unshift({
                id: archivioNotifiche.length + 1,
                tipo: 'shopify',
                icon: 'bi-bag-check',
                color: 'success',
                messaggio: `Importati ${importati} ordini da Shopify`,
                timestamp: new Date(),
                letta: false
            });
        }

        res.json({
            success: true,
            importati: importati,
            duplicati: duplicati,
            totale: ordersToImport.length,
            message: `Importati ${importati} ordini${duplicati > 0 ? ` (${duplicati} già presenti)` : ''}`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Errore import: ${error.message}`
        });
    }
});

// ============================================
// API SHOPIFY - FULFILLMENT
// ============================================

app.post('/api/shopify/fulfill/:spedizioneId', async (req, res) => {
    if (!shopifyClient) {
        return res.status(400).json({
            success: false,
            message: 'Shopify non configurato'
        });
    }

    const spedizioneId = parseInt(req.params.spedizioneId);
    const spedizione = archivioSpedizioni.find(s => s.id === spedizioneId);

    if (!spedizione || !spedizione.shopifyOrderId) {
        return res.status(404).json({
            success: false,
            message: 'Spedizione non trovata o non collegata a Shopify'
        });
    }

    if (!spedizione.tracking) {
        return res.status(400).json({
            success: false,
            message: 'Tracking number mancante. Assegna prima un tracking.'
        });
    }

    try {
        const trackingCompany = CARRIER_MAPPING[spedizione.corriere] || spedizione.corriere;
        const trackingUrl = getTrackingUrl(spedizione.corriere, spedizione.tracking);

        const result = await shopifyClient.createFulfillment(spedizione.shopifyOrderId, {
            trackingNumber: spedizione.tracking,
            corriere: trackingCompany,
            trackingUrl: trackingUrl,
            notifyCustomer: shopifyConfig.shopify.fulfillment.notifyCustomer,
            locationId: shopifyLocations[0]?.id || null
        });

        if (result.success) {
            spedizione.shopifyFulfillmentId = result.fulfillment.id;
            spedizione.shopifyFulfillmentStatus = 'fulfilled';
            
            if (shopifyConfig.shopify.fulfillment.addTags) {
                await shopifyClient.addOrderTags(
                    spedizione.shopifyOrderId,
                    shopifyConfig.shopify.fulfillment.tagsToAdd
                );
            }

            archivioNotifiche.unshift({
                id: archivioNotifiche.length + 1,
                tipo: 'shopify',
                icon: 'bi-check-circle',
                color: 'success',
                messaggio: `Ordine Shopify ${spedizione.shopifyOrderNumber} marcato come evaso`,
                timestamp: new Date(),
                letta: false
            });
        }

        res.json(result);

    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Errore fulfillment: ${error.message}`
        });
    }
});

app.post('/api/shopify/fulfill-distinta/:distintaId', async (req, res) => {
    if (!shopifyClient) {
        return res.status(400).json({
            success: false,
            message: 'Shopify non configurato'
        });
    }

    const distintaId = req.params.distintaId;
    const distinta = archivioDistinte.find(d => d.id === distintaId);

    if (!distinta) {
        return res.status(404).json({
            success: false,
            message: 'Distinta non trovata'
        });
    }

    const spedizioniShopify = archivioSpedizioni.filter(s => 
        s.distinaId === distintaId && s.shopifyOrderId && s.tracking
    );

    if (spedizioniShopify.length === 0) {
        return res.json({
            success: true,
            message: 'Nessun ordine Shopify in questa distinta',
            fulfilled: 0
        });
    }

    let fulfilled = 0;
    let errors = [];

    for (const spedizione of spedizioniShopify) {
        try {
            const trackingCompany = CARRIER_MAPPING[spedizione.corriere] || spedizione.corriere;
            const trackingUrl = getTrackingUrl(spedizione.corriere, spedizione.tracking);

            const result = await shopifyClient.createFulfillment(spedizione.shopifyOrderId, {
                trackingNumber: spedizione.tracking,
                corriere: trackingCompany,
                trackingUrl: trackingUrl,
                notifyCustomer: shopifyConfig.shopify.fulfillment.notifyCustomer,
                locationId: shopifyLocations[0]?.id || null
            });

            if (result.success) {
                spedizione.shopifyFulfillmentId = result.fulfillment.id;
                spedizione.shopifyFulfillmentStatus = 'fulfilled';
                fulfilled++;
                
                if (shopifyConfig.shopify.fulfillment.addTags) {
                    await shopifyClient.addOrderTags(
                        spedizione.shopifyOrderId,
                        shopifyConfig.shopify.fulfillment.tagsToAdd
                    );
                }
            } else {
                errors.push(`${spedizione.shopifyOrderNumber}: ${result.message}`);
            }

        } catch (error) {
            errors.push(`${spedizione.shopifyOrderNumber}: ${error.message}`);
        }
    }

    if (fulfilled > 0) {
        archivioNotifiche.unshift({
            id: archivioNotifiche.length + 1,
            tipo: 'shopify',
            icon: 'bi-bag-check',
            color: 'success',
            messaggio: `${fulfilled} ordini Shopify marcati come evasi (distinta ${distintaId})`,
            timestamp: new Date(),
            letta: false
        });
    }

    res.json({
        success: true,
        fulfilled: fulfilled,
        total: spedizioniShopify.length,
        errors: errors.length > 0 ? errors : null,
        message: `${fulfilled}/${spedizioniShopify.length} ordini evasi${errors.length > 0 ? ` (${errors.length} errori)` : ''}`
    });
});

// ============================================
// API SHOPIFY - WEBHOOKS
// ============================================

app.post('/api/shopify/webhooks/create', async (req, res) => {
    if (!shopifyClient) {
        return res.status(400).json({
            success: false,
            message: 'Shopify non configurato'
        });
    }

    const { topic } = req.body;
    const webhookUrl = `${req.protocol}://${req.get('host')}/api/shopify/webhook`;

    const result = await shopifyClient.createWebhook(topic, webhookUrl);
    res.json(result);
});

app.get('/api/shopify/webhooks', async (req, res) => {
    if (!shopifyClient) {
        return res.status(400).json({
            success: false,
            message: 'Shopify non configurato'
        });
    }

    const result = await shopifyClient.listWebhooks();
    res.json(result);
});

app.post('/api/shopify/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const topic = req.get('X-Shopify-Topic');
    const shopDomain = req.get('X-Shopify-Shop-Domain');
    
    console.log(`📥 Webhook ricevuto: ${topic} da ${shopDomain}`);

    try {
        const data = JSON.parse(req.body);

        switch (topic) {
            case 'orders/create':
                if (shopifyConfig.shopify.sync.autoImport) {
                    const spedizione = shopifyClient.convertOrderToShipment(data, impostazioni.mittente);
                    spedizione.id = contatoreSpedizioni++;
                    archivioSpedizioni.push(spedizione);
                    
                    archivioNotifiche.unshift({
                        id: archivioNotifiche.length + 1,
                        tipo: 'shopify',
                        icon: 'bi-cart-plus',
                        color: 'info',
                        messaggio: `Nuovo ordine Shopify ${data.name} importato automaticamente`,
                        timestamp: new Date(),
                        letta: false
                    });
                }
                break;

            case 'orders/updated':
                const spedizioneAggiornata = archivioSpedizioni.find(s => s.shopifyOrderId === data.id);
                if (spedizioneAggiornata) {
                    console.log(`Ordine ${data.name} aggiornato`);
                }
                break;

            case 'orders/cancelled':
                const spedizioneCancellata = archivioSpedizioni.find(s => s.shopifyOrderId === data.id);
                if (spedizioneCancellata && spedizioneCancellata.stato !== 'Spedito') {
                    spedizioneCancellata.stato = 'Cancellata';
                }
                break;
        }

        res.status(200).send('OK');

    } catch (error) {
        console.error('Errore processing webhook:', error);
        res.status(500).send('Error');
    }
});

// ============================================
// API SHOPIFY - SINCRONIZZAZIONE AUTOMATICA
// ============================================

app.post('/api/shopify/sync/start', (req, res) => {
    if (!shopifyClient) {
        return res.status(400).json({
            success: false,
            message: 'Shopify non configurato'
        });
    }

    if (shopifySyncInterval) {
        return res.json({
            success: false,
            message: 'Sincronizzazione già attiva'
        });
    }

    const intervalMs = shopifyConfig.shopify.sync.intervalMinutes * 60 * 1000;

    shopifySyncInterval = setInterval(async () => {
        console.log('🔄 Sincronizzazione automatica Shopify...');
        
        try {
            const result = await shopifyClient.getUnfulfilledOrders({
                limit: shopifyConfig.shopify.sync.maxOrdersPerSync
            });

            if (result.success && result.orders.length > 0) {
                let nuovi = 0;
                
                for (const order of result.orders) {
                    const esistente = archivioSpedizioni.find(s => s.shopifyOrderId === order.id);
                    if (!esistente) {
                        const spedizione = shopifyClient.convertOrderToShipment(order, impostazioni.mittente);
                        spedizione.id = contatoreSpedizioni++;
                        archivioSpedizioni.push(spedizione);
                        nuovi++;
                    }
                }

                if (nuovi > 0) {
                    console.log(`✅ Importati ${nuovi} nuovi ordini`);
                    archivioNotifiche.unshift({
                        id: archivioNotifiche.length + 1,
                        tipo: 'shopify',
                        icon: 'bi-arrow-repeat',
                        color: 'info',
                        messaggio: `Sync automatica: ${nuovi} nuovi ordini`,
                        timestamp: new Date(),
                        letta: false
                    });
                }
            }
        } catch (error) {
            console.error('Errore sync automatica:', error);
        }
    }, intervalMs);

    shopifyConfig.shopify.sync.autoImport = true;

    res.json({
        success: true,
        message: `Sincronizzazione automatica avviata (ogni ${shopifyConfig.shopify.sync.intervalMinutes} minuti)`
    });
});

app.post('/api/shopify/sync/stop', (req, res) => {
    if (!shopifySyncInterval) {
        return res.json({
            success: false,
            message: 'Sincronizzazione non attiva'
        });
    }

    clearInterval(shopifySyncInterval);
    shopifySyncInterval = null;
    shopifyConfig.shopify.sync.autoImport = false;

    res.json({
        success: true,
        message: 'Sincronizzazione automatica fermata'
    });
});

// ============================================
// HELPER FUNCTIONS SHOPIFY
// ============================================

function applicaRegoleCorriere(order, spedizione) {
    const rules = shopifyConfig.rules.autoAssignCarrier.rules;
    
    for (const rule of rules) {
        if (rule.condition === 'default') {
            return rule.carrier;
        }
        
        if (rule.condition === 'totalPrice') {
            const price = parseFloat(order.total_price);
            if (rule.operator === '>' && price > rule.value) return rule.carrier;
            if (rule.operator === '<' && price < rule.value) return rule.carrier;
        }
        
        if (rule.condition === 'province') {
            if (rule.operator === '==' && spedizione.destinatario.prov === rule.value) {
                return rule.carrier;
            }
        }
    }
    
    return '';
}

// ============================================
// API GESTIONE GIACENZE
// ============================================

// Risolvi pratica giacenza
app.post('/api/giacenza/:id/risolvi', (req, res) => {
    const id = parseInt(req.params.id);
    const spedizione = archivioSpedizioni.find(s => s.id === id);
    
    if (!spedizione) {
        return res.status(404).json({ success: false, message: 'Spedizione non trovata' });
    }
    
    const { 
        azione, 
        note, 
        nuovoIndirizzo, 
        preavvisoTelefonico, 
        consegnaAppuntamento, 
        annullaContrassegno,
        urgente 
    } = req.body;
    
    // Salva storico giacenza
    if (!spedizione.storicoGiacenze) {
        spedizione.storicoGiacenze = [];
    }
    
    spedizione.storicoGiacenze.push({
        data: new Date().toISOString(),
        azione: azione,
        note: note,
        statoPrec: spedizione.stato
    });
    
    // Applica azione
    switch(azione) {
        case 'riconsegna':
            spedizione.stato = 'In Lavorazione';
            spedizione.noteGiacenza = note;
            spedizione.preavvisoTelefonico = preavvisoTelefonico;
            break;
            
        case 'cambio_indirizzo':
            spedizione.stato = 'In Lavorazione';
            if (nuovoIndirizzo) {
                if (nuovoIndirizzo.nome) spedizione.destinatario.nome = nuovoIndirizzo.nome;
                if (nuovoIndirizzo.indirizzo) spedizione.destinatario.indirizzo = nuovoIndirizzo.indirizzo;
                if (nuovoIndirizzo.cap) spedizione.destinatario.cap = nuovoIndirizzo.cap;
                if (nuovoIndirizzo.citta) spedizione.destinatario.citta = nuovoIndirizzo.citta;
                if (nuovoIndirizzo.prov) spedizione.destinatario.prov = nuovoIndirizzo.prov;
                if (nuovoIndirizzo.telefono) spedizione.destinatario.telefono = nuovoIndirizzo.telefono;
            }
            spedizione.noteGiacenza = note;
            spedizione.preavvisoTelefonico = preavvisoTelefonico;
            break;
            
        case 'reso':
            spedizione.stato = 'Reso';
            spedizione.noteGiacenza = note;
            break;
            
        case 'svincolo':
            spedizione.stato = 'Svincolo';
            spedizione.noteGiacenza = note;
            break;
            
        case 'distruzione':
            spedizione.stato = 'Distrutto';
            spedizione.noteGiacenza = note;
            break;
    }
    
    // Applica opzioni extra
    if (annullaContrassegno && spedizione.dettagli) {
        spedizione.dettagli.contrassegnoOriginale = spedizione.dettagli.contrassegno;
        spedizione.dettagli.contrassegno = 0;
        spedizione.statoIncasso = 'Annullato';
    }
    
    if (urgente) {
        spedizione.priorita = 'urgente';
    }
    
    if (consegnaAppuntamento) {
        spedizione.consegnaAppuntamento = true;
    }
    
    // Aggiungi notifica
    archivioNotifiche.unshift({
        id: archivioNotifiche.length + 1,
        tipo: 'giacenza',
        icon: 'bi-check-circle',
        color: 'success',
        messaggio: `Giacenza #${id} risolta: ${azione}`,
        timestamp: new Date(),
        letta: false
    });
    
    res.json({ 
        success: true, 
        message: `Pratica giacenza risolta: ${azione}`,
        spedizione: spedizione
    });
});

// ============================================
// API EXPORT CSV
// ============================================

// Export spedizioni CSV
app.get('/api/export/spedizioni/csv', (req, res) => {
    const { stato, corriere, dataDa, dataA } = req.query;
    
    let spedizioni = archivioSpedizioni.filter(s => s.stato !== 'Cancellata');
    
    // Applica filtri
    if (stato) spedizioni = spedizioni.filter(s => s.stato === stato);
    if (corriere) spedizioni = spedizioni.filter(s => s.corriere === corriere);
    if (dataDa) spedizioni = spedizioni.filter(s => s.data >= dataDa);
    if (dataA) spedizioni = spedizioni.filter(s => s.data <= dataA);
    
    // Crea CSV
    const headers = ['ID', 'Data', 'Corriere', 'Tracking', 'Destinatario', 'Indirizzo', 'CAP', 'Città', 'Prov', 'Telefono', 'Colli', 'Peso', 'Contrassegno', 'Stato', 'Costo'];
    
    const rows = spedizioni.map(s => [
        s.id,
        s.data,
        s.corriere,
        s.tracking || '',
        s.destinatario?.nome || '',
        s.destinatario?.indirizzo || '',
        s.destinatario?.cap || '',
        s.destinatario?.citta || '',
        s.destinatario?.prov || '',
        s.destinatario?.telefono || '',
        s.dettagli?.colli || 1,
        s.dettagli?.peso || 0,
        s.dettagli?.contrassegno || 0,
        s.stato,
        s.costo || 0
    ]);
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=spedizioni_${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\ufeff' + csv); // BOM per Excel
});

// Export contrassegni CSV
app.get('/api/export/contrassegni/csv', (req, res) => {
    const { stato, dataDa, dataA } = req.query;
    
    let spedizioni = archivioSpedizioni.filter(s => 
        s.dettagli?.contrassegno > 0 && s.stato !== 'Cancellata'
    );
    
    if (stato) spedizioni = spedizioni.filter(s => s.statoIncasso === stato);
    if (dataDa) spedizioni = spedizioni.filter(s => s.data >= dataDa);
    if (dataA) spedizioni = spedizioni.filter(s => s.data <= dataA);
    
    const headers = ['ID', 'Data', 'Corriere', 'Tracking', 'Destinatario', 'Città', 'Importo', 'Stato Incasso', 'Data Incasso'];
    
    const rows = spedizioni.map(s => [
        s.id,
        s.data,
        s.corriere,
        s.tracking || '',
        s.destinatario?.nome || '',
        s.destinatario?.citta || '',
        s.dettagli?.contrassegno || 0,
        s.statoIncasso || 'In Attesa',
        s.dataIncasso || ''
    ]);
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=contrassegni_${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\ufeff' + csv);
});

// Export report finanziario CSV
app.get('/api/export/finanziario/csv', (req, res) => {
    const { dataDa, dataA } = req.query;
    
    let spedizioni = archivioSpedizioni.filter(s => s.stato !== 'Cancellata');
    
    if (dataDa) spedizioni = spedizioni.filter(s => s.data >= dataDa);
    if (dataA) spedizioni = spedizioni.filter(s => s.data <= dataA);
    
    // Calcola totali per corriere
    const totaliPerCorriere = {};
    spedizioni.forEach(s => {
        if (!totaliPerCorriere[s.corriere]) {
            totaliPerCorriere[s.corriere] = {
                spedizioni: 0,
                costi: 0,
                contrassegni: 0,
                contrassegniIncassati: 0
            };
        }
        totaliPerCorriere[s.corriere].spedizioni++;
        totaliPerCorriere[s.corriere].costi += s.costo || 0;
        totaliPerCorriere[s.corriere].contrassegni += s.dettagli?.contrassegno || 0;
        if (s.statoIncasso === 'Incassato') {
            totaliPerCorriere[s.corriere].contrassegniIncassati += s.dettagli?.contrassegno || 0;
        }
    });
    
    const headers = ['Corriere', 'Num. Spedizioni', 'Costi Totali', 'Contrassegni Totali', 'Contrassegni Incassati'];
    
    const rows = Object.entries(totaliPerCorriere).map(([corriere, dati]) => [
        corriere,
        dati.spedizioni,
        dati.costi.toFixed(2),
        dati.contrassegni.toFixed(2),
        dati.contrassegniIncassati.toFixed(2)
    ]);
    
    // Aggiungi riga totali
    const totali = Object.values(totaliPerCorriere).reduce((acc, d) => ({
        spedizioni: acc.spedizioni + d.spedizioni,
        costi: acc.costi + d.costi,
        contrassegni: acc.contrassegni + d.contrassegni,
        contrassegniIncassati: acc.contrassegniIncassati + d.contrassegniIncassati
    }), { spedizioni: 0, costi: 0, contrassegni: 0, contrassegniIncassati: 0 });
    
    rows.push(['TOTALE', totali.spedizioni, totali.costi.toFixed(2), totali.contrassegni.toFixed(2), totali.contrassegniIncassati.toFixed(2)]);
    
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=report_finanziario_${new Date().toISOString().split('T')[0]}.csv`);
    res.send('\ufeff' + csv);
});

// ============================================
// API REPORT AVANZATI
// ============================================

app.get('/api/report/statistiche', (req, res) => {
    const { dataDa, dataA, corriere } = req.query;
    
    let spedizioni = archivioSpedizioni.filter(s => s.stato !== 'Cancellata');
    
    if (dataDa) spedizioni = spedizioni.filter(s => s.data >= dataDa);
    if (dataA) spedizioni = spedizioni.filter(s => s.data <= dataA);
    if (corriere) spedizioni = spedizioni.filter(s => s.corriere === corriere);
    
    // Calcola statistiche
    const totale = spedizioni.length;
    const consegnate = spedizioni.filter(s => s.stato === 'Consegnato').length;
    const giacenze = spedizioni.filter(s => s.stato === 'Giacenza').length;
    const inTransito = spedizioni.filter(s => ['Spedito', 'In Transito', 'In Consegna'].includes(s.stato)).length;
    
    const costoTotale = spedizioni.reduce((sum, s) => sum + (s.costo || 0), 0);
    
    const contrassegniTotali = spedizioni.reduce((sum, s) => sum + (s.dettagli?.contrassegno || 0), 0);
    const contrassegniIncassati = spedizioni
        .filter(s => s.statoIncasso === 'Incassato')
        .reduce((sum, s) => sum + (s.dettagli?.contrassegno || 0), 0);
    const contrassegniPendenti = spedizioni
        .filter(s => s.statoIncasso === 'In Attesa')
        .reduce((sum, s) => sum + (s.dettagli?.contrassegno || 0), 0);
    
    // Statistiche per corriere
    const perCorriere = {};
    spedizioni.forEach(s => {
        if (!perCorriere[s.corriere]) {
            perCorriere[s.corriere] = { totale: 0, consegnate: 0, giacenze: 0, costi: 0 };
        }
        perCorriere[s.corriere].totale++;
        if (s.stato === 'Consegnato') perCorriere[s.corriere].consegnate++;
        if (s.stato === 'Giacenza') perCorriere[s.corriere].giacenze++;
        perCorriere[s.corriere].costi += s.costo || 0;
    });
    
    res.json({
        success: true,
        data: {
            totale,
            consegnate,
            giacenze,
            inTransito,
            successRate: totale > 0 ? Math.round((consegnate / totale) * 100) : 0,
            costoTotale: costoTotale.toFixed(2),
            contrassegniIncassati: contrassegniIncassati.toFixed(2),
            contrassegniPendenti: contrassegniPendenti.toFixed(2),
            contrassegniTotali: contrassegniTotali.toFixed(2),
            margine: (contrassegniIncassati - costoTotale).toFixed(2),
            perCorriere
        }
    });
});

// ============================================
// FALLBACK SPA
// ============================================

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// AVVIO SERVER
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   FENIX HOME ITALIA - GESTIONALE v3.0          ║');
    console.log('║   CON AUTENTICAZIONE E SHOPIFY                 ║');
    console.log('╠════════════════════════════════════════════════╣');
    console.log(`║  ✅ Server attivo: http://localhost:${PORT}         ║`);
    console.log(`║  📦 Spedizioni: ${archivioSpedizioni.length.toString().padEnd(30)}║`);
    console.log(`║  👥 Clienti: ${archivioRubrica.length.toString().padEnd(33)}║`);
    console.log(`║  📋 Distinte: ${archivioDistinte.length.toString().padEnd(32)}║`);
    console.log(`║  🛒 Shopify: ${shopifyClient ? 'Configurato' : 'Non configurato'}${' '.repeat(shopifyClient ? 23 : 19)}║`);
    console.log('╚════════════════════════════════════════════════╝');
    console.log('');
});
