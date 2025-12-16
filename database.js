/* ========================================
   FENIX HOME ITALIA - Database SQLite
   database.js - Persistenza dati v2.0
   CON SISTEMA UTENTI E PERMESSI
   ======================================== */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Percorso database
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'fenix.db');

// Crea cartella data se non esiste
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Inizializza database
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

console.log(`📦 Database SQLite: ${DB_PATH}`);

// ============================================
// UTILITY - HASH PASSWORD
// ============================================

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
}

// ============================================
// CREAZIONE TABELLE
// ============================================

db.exec(`
    -- Tabella Spedizioni
    CREATE TABLE IF NOT EXISTS spedizioni (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,
        corriere TEXT,
        stato TEXT DEFAULT 'In Lavorazione',
        
        mitt_nome TEXT,
        mitt_indirizzo TEXT,
        mitt_cap TEXT,
        mitt_citta TEXT,
        mitt_prov TEXT,
        mitt_telefono TEXT,
        mitt_email TEXT,
        
        dest_nome TEXT NOT NULL,
        dest_indirizzo TEXT,
        dest_cap TEXT,
        dest_citta TEXT,
        dest_prov TEXT,
        dest_telefono TEXT,
        dest_email TEXT,
        
        colli INTEGER DEFAULT 1,
        peso REAL DEFAULT 0,
        volume REAL DEFAULT 0,
        contrassegno REAL DEFAULT 0,
        assicurazione INTEGER DEFAULT 0,
        note TEXT,
        
        tracking TEXT,
        stato_incasso TEXT,
        data_incasso TEXT,
        note_incasso TEXT,
        costo REAL DEFAULT 0,
        distinta_id TEXT,
        
        shopify_order_id TEXT,
        shopify_order_number TEXT,
        shopify_order_name TEXT,
        shopify_fulfillment_id TEXT,
        shopify_fulfillment_status TEXT,
        shopify_customer_email TEXT,
        shopify_total_price REAL,
        shopify_line_items TEXT,
        
        ordini_unificati TEXT,
        prodotti_unificati TEXT,
        
        created_by INTEGER,
        cliente_id INTEGER,
        
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabella Distinte
    CREATE TABLE IF NOT EXISTS distinte (
        id TEXT PRIMARY KEY,
        data TEXT,
        data_ritiro TEXT,
        corriere TEXT NOT NULL,
        num_spedizioni INTEGER DEFAULT 0,
        colli_totali INTEGER DEFAULT 0,
        peso_totale REAL DEFAULT 0,
        stato TEXT DEFAULT 'In Attesa Ritiro',
        note TEXT,
        created_by INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabella Rubrica
    CREATE TABLE IF NOT EXISTS rubrica (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        indirizzo TEXT,
        cap TEXT,
        citta TEXT,
        prov TEXT,
        telefono TEXT,
        email TEXT,
        num_spedizioni INTEGER DEFAULT 0,
        ultima_spedizione TEXT,
        note TEXT,
        cliente_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Tabella Utenti (POTENZIATA)
    CREATE TABLE IF NOT EXISTS utenti (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        azienda TEXT,
        telefono TEXT,
        ruolo TEXT DEFAULT 'cliente',
        stato TEXT DEFAULT 'attivo',
        ultimo_accesso TEXT,
        note TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Tabella Permessi Utente
    CREATE TABLE IF NOT EXISTS user_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        can_create_shipments INTEGER DEFAULT 1,
        can_view_all_shipments INTEGER DEFAULT 0,
        can_manage_distinte INTEGER DEFAULT 0,
        can_view_contrassegni INTEGER DEFAULT 0,
        can_view_reports INTEGER DEFAULT 0,
        can_access_shopify INTEGER DEFAULT 0,
        can_view_costs INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES utenti(id) ON DELETE CASCADE
    );
    
    -- Tabella Corrieri assegnati a Utente
    CREATE TABLE IF NOT EXISTS user_couriers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        courier_code TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES utenti(id) ON DELETE CASCADE,
        UNIQUE(user_id, courier_code)
    );
    
    -- Tabella Listini Prezzo
    CREATE TABLE IF NOT EXISTS listini (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        corriere TEXT NOT NULL,
        descrizione TEXT,
        attivo INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Tabella Voci Listino
    CREATE TABLE IF NOT EXISTS listino_voci (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listino_id INTEGER NOT NULL,
        zona TEXT NOT NULL,
        peso_da REAL DEFAULT 0,
        peso_a REAL NOT NULL,
        prezzo REAL NOT NULL,
        supplemento_carburante REAL DEFAULT 0,
        supplemento_contrassegno REAL DEFAULT 0,
        supplemento_assicurazione REAL DEFAULT 0,
        FOREIGN KEY (listino_id) REFERENCES listini(id) ON DELETE CASCADE
    );
    
    -- Tabella Listini assegnati a Utente
    CREATE TABLE IF NOT EXISTS user_listini (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        listino_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES utenti(id) ON DELETE CASCADE,
        FOREIGN KEY (listino_id) REFERENCES listini(id) ON DELETE CASCADE,
        UNIQUE(user_id, listino_id)
    );

    -- Tabella Impostazioni
    CREATE TABLE IF NOT EXISTS impostazioni (
        chiave TEXT PRIMARY KEY,
        valore TEXT,
        tipo TEXT DEFAULT 'string'
    );

    -- Tabella Tariffe (base per admin)
    CREATE TABLE IF NOT EXISTS tariffe (
        corriere TEXT PRIMARY KEY,
        tariffa_base REAL DEFAULT 0,
        costo_kg REAL DEFAULT 0,
        costo_contrassegno REAL DEFAULT 0,
        costo_assicurazione REAL DEFAULT 0,
        costo_express REAL DEFAULT 0,
        attivo INTEGER DEFAULT 1
    );

    -- Tabella Notifiche
    CREATE TABLE IF NOT EXISTS notifiche (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT,
        icona TEXT,
        colore TEXT,
        messaggio TEXT,
        user_id INTEGER,
        letta INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    
    -- Tabella Sessioni
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        data TEXT,
        expires_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES utenti(id) ON DELETE CASCADE
    );
    
    -- Tabella Log Attività
    CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Indici
    CREATE INDEX IF NOT EXISTS idx_spedizioni_stato ON spedizioni(stato);
    CREATE INDEX IF NOT EXISTS idx_spedizioni_corriere ON spedizioni(corriere);
    CREATE INDEX IF NOT EXISTS idx_spedizioni_data ON spedizioni(data);
    CREATE INDEX IF NOT EXISTS idx_spedizioni_shopify ON spedizioni(shopify_order_id);
    CREATE INDEX IF NOT EXISTS idx_spedizioni_cliente ON spedizioni(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

// ============================================
// DATI INIZIALI
// ============================================

// Inserisci tariffe predefinite
const insertTariffa = db.prepare(`
    INSERT OR IGNORE INTO tariffe (corriere, tariffa_base, costo_kg, costo_contrassegno, costo_assicurazione, costo_express)
    VALUES (?, ?, ?, ?, ?, ?)
`);

const tariffePredefinite = [
    ['BRT', 5.50, 0.80, 2.50, 1.5, 5.00],
    ['GLS', 5.80, 0.75, 2.80, 1.8, 4.50],
    ['SDA', 5.20, 0.85, 2.30, 1.6, 5.50],
    ['DHL', 8.50, 1.20, 3.50, 2.0, 8.00],
    ['UPS', 9.00, 1.30, 3.80, 2.2, 9.00],
    ['Poste Italiane', 4.50, 0.60, 2.00, 1.2, 3.50],
    ['FedEx', 10.00, 1.50, 4.00, 2.5, 10.00],
    ['TNT', 7.00, 1.00, 3.00, 1.8, 6.00]
];

tariffePredefinite.forEach(t => insertTariffa.run(...t));

// Inserisci impostazioni predefinite
const insertImpostazione = db.prepare(`
    INSERT OR IGNORE INTO impostazioni (chiave, valore, tipo) VALUES (?, ?, ?)
`);

const impostazioniPredefinite = [
    ['mittente_nome', 'Fenix Home Italia', 'string'],
    ['mittente_indirizzo', 'Via Esempio 1', 'string'],
    ['mittente_cap', '20100', 'string'],
    ['mittente_citta', 'Milano', 'string'],
    ['mittente_prov', 'MI', 'string'],
    ['mittente_telefono', '', 'string'],
    ['mittente_email', 'info@fenixhome.it', 'string'],
    ['shopify_enabled', '0', 'boolean'],
    ['shopify_shop_domain', '', 'string'],
    ['shopify_access_token', '', 'string']
];

impostazioniPredefinite.forEach(i => insertImpostazione.run(...i));

// Inserisci utente admin predefinito (con password hashata)
const checkAdmin = db.prepare('SELECT id FROM utenti WHERE email = ?').get('admin@fenix.it');
if (!checkAdmin) {
    const hashedPassword = hashPassword('admin123');
    db.prepare(`
        INSERT INTO utenti (nome, email, password, ruolo, stato, azienda)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run('Amministratore', 'admin@fenix.it', hashedPassword, 'admin', 'attivo', 'Fenix Home Italia');
    
    // Aggiungi permessi admin
    const adminId = db.prepare('SELECT id FROM utenti WHERE email = ?').get('admin@fenix.it').id;
    db.prepare(`
        INSERT OR IGNORE INTO user_permissions (user_id, can_create_shipments, can_view_all_shipments, can_manage_distinte, can_view_contrassegni, can_view_reports, can_access_shopify, can_view_costs)
        VALUES (?, 1, 1, 1, 1, 1, 1, 1)
    `).run(adminId);
    
    console.log('✅ Admin user created: admin@fenix.it / admin123');
}

// Crea listini esempio
const checkListini = db.prepare('SELECT COUNT(*) as count FROM listini').get();
if (checkListini.count === 0) {
    // Listino BRT Standard
    db.prepare(`INSERT INTO listini (nome, corriere, descrizione) VALUES (?, ?, ?)`).run(
        'BRT Standard', 'BRT', 'Listino standard per spedizioni nazionali BRT'
    );
    const listinoBRT = db.prepare('SELECT id FROM listini WHERE nome = ?').get('BRT Standard').id;
    
    const vociBRT = [
        [listinoBRT, 'Italia Nord', 0, 5, 5.50, 0.10, 2.50, 1.50],
        [listinoBRT, 'Italia Nord', 5, 10, 7.50, 0.10, 2.50, 1.50],
        [listinoBRT, 'Italia Nord', 10, 20, 9.50, 0.10, 2.50, 1.50],
        [listinoBRT, 'Italia Centro', 0, 5, 6.50, 0.10, 2.50, 1.50],
        [listinoBRT, 'Italia Centro', 5, 10, 8.50, 0.10, 2.50, 1.50],
        [listinoBRT, 'Italia Sud', 0, 5, 7.50, 0.12, 2.50, 1.50],
        [listinoBRT, 'Italia Sud', 5, 10, 9.50, 0.12, 2.50, 1.50],
        [listinoBRT, 'Isole', 0, 5, 9.00, 0.15, 3.00, 2.00],
        [listinoBRT, 'Isole', 5, 10, 11.00, 0.15, 3.00, 2.00]
    ];
    
    const insertVoce = db.prepare(`
        INSERT INTO listino_voci (listino_id, zona, peso_da, peso_a, prezzo, supplemento_carburante, supplemento_contrassegno, supplemento_assicurazione)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    vociBRT.forEach(v => insertVoce.run(...v));
    
    // Listino GLS Economy
    db.prepare(`INSERT INTO listini (nome, corriere, descrizione) VALUES (?, ?, ?)`).run(
        'GLS Economy', 'GLS', 'Listino economy GLS'
    );
    const listinoGLS = db.prepare('SELECT id FROM listini WHERE nome = ?').get('GLS Economy').id;
    
    const vociGLS = [
        [listinoGLS, 'Italia', 0, 5, 6.00, 0.12, 2.80, 1.80],
        [listinoGLS, 'Italia', 5, 10, 8.00, 0.12, 2.80, 1.80],
        [listinoGLS, 'Italia', 10, 20, 10.00, 0.12, 2.80, 1.80],
        [listinoGLS, 'Italia', 20, 30, 12.00, 0.12, 2.80, 1.80]
    ];
    vociGLS.forEach(v => insertVoce.run(...v));
    
    console.log('✅ Listini esempio creati');
}

console.log('✅ Database inizializzato con sistema utenti');

// ============================================
// FUNZIONI UTENTI E AUTENTICAZIONE
// ============================================

function createUser(userData) {
    const { nome, email, password, azienda, telefono, ruolo, stato } = userData;
    const hashedPassword = hashPassword(password);
    
    const result = db.prepare(`
        INSERT INTO utenti (nome, email, password, azienda, telefono, ruolo, stato)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nome, email, hashedPassword, azienda || '', telefono || '', ruolo || 'cliente', stato || 'attivo');
    
    // Crea permessi default per cliente
    if (ruolo !== 'admin') {
        db.prepare(`
            INSERT INTO user_permissions (user_id, can_create_shipments, can_view_all_shipments, can_manage_distinte, can_view_contrassegni, can_view_reports, can_access_shopify, can_view_costs)
            VALUES (?, 1, 0, 0, 0, 0, 0, 0)
        `).run(result.lastInsertRowid);
    }
    
    return result.lastInsertRowid;
}

function authenticateUser(email, password) {
    const user = db.prepare('SELECT * FROM utenti WHERE email = ? AND stato = ?').get(email, 'attivo');
    
    if (!user) return null;
    
    // Verifica password (supporta sia vecchio formato che nuovo hash)
    let isValid = false;
    if (user.password.includes(':')) {
        isValid = verifyPassword(password, user.password);
    } else {
        // Vecchio formato plain text (per retrocompatibilità)
        isValid = user.password === password;
        // Aggiorna a hash se login corretto
        if (isValid) {
            const hashedPassword = hashPassword(password);
            db.prepare('UPDATE utenti SET password = ? WHERE id = ?').run(hashedPassword, user.id);
        }
    }
    
    if (!isValid) return null;
    
    // Aggiorna ultimo accesso
    db.prepare('UPDATE utenti SET ultimo_accesso = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    
    // Rimuovi password dalla risposta
    delete user.password;
    
    return user;
}

function getUserById(id) {
    const user = db.prepare('SELECT id, nome, email, azienda, telefono, ruolo, stato, ultimo_accesso, created_at FROM utenti WHERE id = ?').get(id);
    return user;
}

function getAllUsers() {
    return db.prepare(`
        SELECT u.id, u.nome, u.email, u.azienda, u.telefono, u.ruolo, u.stato, u.ultimo_accesso, u.created_at,
               p.can_create_shipments, p.can_view_all_shipments, p.can_manage_distinte, 
               p.can_view_contrassegni, p.can_view_reports, p.can_access_shopify, p.can_view_costs
        FROM utenti u
        LEFT JOIN user_permissions p ON u.id = p.user_id
        ORDER BY u.created_at DESC
    `).all();
}

function updateUser(id, userData) {
    const fields = [];
    const values = [];
    
    if (userData.nome !== undefined) { fields.push('nome = ?'); values.push(userData.nome); }
    if (userData.email !== undefined) { fields.push('email = ?'); values.push(userData.email); }
    if (userData.azienda !== undefined) { fields.push('azienda = ?'); values.push(userData.azienda); }
    if (userData.telefono !== undefined) { fields.push('telefono = ?'); values.push(userData.telefono); }
    if (userData.ruolo !== undefined) { fields.push('ruolo = ?'); values.push(userData.ruolo); }
    if (userData.stato !== undefined) { fields.push('stato = ?'); values.push(userData.stato); }
    if (userData.password) { 
        fields.push('password = ?'); 
        values.push(hashPassword(userData.password)); 
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    if (fields.length > 1) {
        db.prepare(`UPDATE utenti SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
}

function deleteUser(id) {
    db.prepare('DELETE FROM utenti WHERE id = ?').run(id);
}

// ============================================
// FUNZIONI PERMESSI
// ============================================

function getUserPermissions(userId) {
    let permissions = db.prepare('SELECT * FROM user_permissions WHERE user_id = ?').get(userId);
    
    if (!permissions) {
        permissions = {
            can_create_shipments: 1,
            can_view_all_shipments: 0,
            can_manage_distinte: 0,
            can_view_contrassegni: 0,
            can_view_reports: 0,
            can_access_shopify: 0,
            can_view_costs: 0
        };
    }
    
    // Ottieni corrieri assegnati
    const couriers = db.prepare('SELECT courier_code FROM user_couriers WHERE user_id = ?').all(userId);
    permissions.couriers = couriers.map(c => c.courier_code);
    
    // Ottieni listini assegnati
    const listini = db.prepare(`
        SELECT l.* FROM listini l
        INNER JOIN user_listini ul ON l.id = ul.listino_id
        WHERE ul.user_id = ?
    `).all(userId);
    permissions.listini = listini;
    
    return permissions;
}

function updateUserPermissions(userId, permissions) {
    // Aggiorna permessi base
    db.prepare(`
        INSERT OR REPLACE INTO user_permissions (user_id, can_create_shipments, can_view_all_shipments, can_manage_distinte, can_view_contrassegni, can_view_reports, can_access_shopify, can_view_costs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        userId,
        permissions.can_create_shipments ? 1 : 0,
        permissions.can_view_all_shipments ? 1 : 0,
        permissions.can_manage_distinte ? 1 : 0,
        permissions.can_view_contrassegni ? 1 : 0,
        permissions.can_view_reports ? 1 : 0,
        permissions.can_access_shopify ? 1 : 0,
        permissions.can_view_costs ? 1 : 0
    );
    
    // Aggiorna corrieri
    if (permissions.couriers) {
        db.prepare('DELETE FROM user_couriers WHERE user_id = ?').run(userId);
        const insertCourier = db.prepare('INSERT INTO user_couriers (user_id, courier_code) VALUES (?, ?)');
        permissions.couriers.forEach(code => insertCourier.run(userId, code));
    }
    
    // Aggiorna listini
    if (permissions.listini) {
        db.prepare('DELETE FROM user_listini WHERE user_id = ?').run(userId);
        const insertListino = db.prepare('INSERT INTO user_listini (user_id, listino_id) VALUES (?, ?)');
        permissions.listini.forEach(listinoId => insertListino.run(userId, listinoId));
    }
}

// ============================================
// FUNZIONI LISTINI
// ============================================

function getAllListini() {
    return db.prepare(`
        SELECT l.*, COUNT(v.id) as num_voci
        FROM listini l
        LEFT JOIN listino_voci v ON l.id = v.listino_id
        GROUP BY l.id
        ORDER BY l.corriere, l.nome
    `).all();
}

function getListinoById(id) {
    const listino = db.prepare('SELECT * FROM listini WHERE id = ?').get(id);
    if (listino) {
        listino.voci = db.prepare('SELECT * FROM listino_voci WHERE listino_id = ? ORDER BY zona, peso_da').all(id);
    }
    return listino;
}

function getListiniForUser(userId) {
    return db.prepare(`
        SELECT l.* FROM listini l
        INNER JOIN user_listini ul ON l.id = ul.listino_id
        WHERE ul.user_id = ? AND l.attivo = 1
    `).all(userId);
}

function createListino(data) {
    const result = db.prepare(`
        INSERT INTO listini (nome, corriere, descrizione)
        VALUES (?, ?, ?)
    `).run(data.nome, data.corriere, data.descrizione || '');
    
    const listinoId = result.lastInsertRowid;
    
    // Inserisci voci
    if (data.voci && data.voci.length > 0) {
        const insertVoce = db.prepare(`
            INSERT INTO listino_voci (listino_id, zona, peso_da, peso_a, prezzo, supplemento_carburante, supplemento_contrassegno, supplemento_assicurazione)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        data.voci.forEach(v => {
            insertVoce.run(listinoId, v.zona, v.peso_da || 0, v.peso_a, v.prezzo, v.supplemento_carburante || 0, v.supplemento_contrassegno || 0, v.supplemento_assicurazione || 0);
        });
    }
    
    return listinoId;
}

function updateListino(id, data) {
    db.prepare(`
        UPDATE listini SET nome = ?, corriere = ?, descrizione = ?, attivo = ?
        WHERE id = ?
    `).run(data.nome, data.corriere, data.descrizione || '', data.attivo ? 1 : 0, id);
    
    // Aggiorna voci
    if (data.voci) {
        db.prepare('DELETE FROM listino_voci WHERE listino_id = ?').run(id);
        const insertVoce = db.prepare(`
            INSERT INTO listino_voci (listino_id, zona, peso_da, peso_a, prezzo, supplemento_carburante, supplemento_contrassegno, supplemento_assicurazione)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        data.voci.forEach(v => {
            insertVoce.run(id, v.zona, v.peso_da || 0, v.peso_a, v.prezzo, v.supplemento_carburante || 0, v.supplemento_contrassegno || 0, v.supplemento_assicurazione || 0);
        });
    }
}

function deleteListino(id) {
    db.prepare('DELETE FROM listini WHERE id = ?').run(id);
}

// ============================================
// FUNZIONI SESSIONI
// ============================================

function createSession(userId, data = {}) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    
    db.prepare(`
        INSERT INTO sessions (id, user_id, data, expires_at)
        VALUES (?, ?, ?, ?)
    `).run(sessionId, userId, JSON.stringify(data), expiresAt);
    
    return sessionId;
}

function getSession(sessionId) {
    const session = db.prepare(`
        SELECT s.*, u.id as user_id, u.nome, u.email, u.ruolo, u.azienda
        FROM sessions s
        INNER JOIN utenti u ON s.user_id = u.id
        WHERE s.id = ? AND s.expires_at > datetime('now')
    `).get(sessionId);
    
    return session;
}

function deleteSession(sessionId) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

function cleanExpiredSessions() {
    db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
}

// ============================================
// FUNZIONI HELPER
// ============================================

function getImpostazione(chiave, defaultValue = null) {
    const row = db.prepare('SELECT valore, tipo FROM impostazioni WHERE chiave = ?').get(chiave);
    if (!row) return defaultValue;
    
    if (row.tipo === 'boolean') return row.valore === '1' || row.valore === 'true';
    if (row.tipo === 'number') return parseFloat(row.valore);
    return row.valore;
}

function setImpostazione(chiave, valore, tipo = 'string') {
    if (tipo === 'boolean') valore = valore ? '1' : '0';
    db.prepare('INSERT OR REPLACE INTO impostazioni (chiave, valore, tipo) VALUES (?, ?, ?)').run(chiave, String(valore), tipo);
}

function addNotifica(tipo, messaggio, icona = 'bi-bell', colore = 'info', userId = null) {
    db.prepare('INSERT INTO notifiche (tipo, icona, colore, messaggio, user_id) VALUES (?, ?, ?, ?, ?)').run(tipo, icona, colore, messaggio, userId);
}

function getMittente() {
    return {
        nome: getImpostazione('mittente_nome', 'Fenix Home Italia'),
        indirizzo: getImpostazione('mittente_indirizzo', ''),
        cap: getImpostazione('mittente_cap', ''),
        citta: getImpostazione('mittente_citta', ''),
        prov: getImpostazione('mittente_prov', ''),
        telefono: getImpostazione('mittente_telefono', ''),
        email: getImpostazione('mittente_email', '')
    };
}

function getTariffa(corriere) {
    return db.prepare('SELECT * FROM tariffe WHERE corriere = ?').get(corriere);
}

function getAllTariffe() {
    return db.prepare('SELECT * FROM tariffe ORDER BY corriere').all();
}

function calcolaCosto(corriere, peso, contrassegno, assicurazione) {
    const tariffa = getTariffa(corriere);
    if (!tariffa) return 7.00;
    
    let costo = tariffa.tariffa_base + (peso * tariffa.costo_kg);
    if (contrassegno > 0) costo += tariffa.costo_contrassegno;
    if (assicurazione) costo += costo * (tariffa.costo_assicurazione / 100);
    
    return Math.round(costo * 100) / 100;
}

function logActivity(userId, action, entityType = null, entityId = null, details = null, ipAddress = null) {
    db.prepare(`
        INSERT INTO activity_log (user_id, action, entity_type, entity_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, action, entityType, entityId, details ? JSON.stringify(details) : null, ipAddress);
}

// ============================================
// EXPORT
// ============================================

module.exports = {
    db,
    // Auth
    hashPassword,
    verifyPassword,
    createUser,
    authenticateUser,
    getUserById,
    getAllUsers,
    updateUser,
    deleteUser,
    // Sessions
    createSession,
    getSession,
    deleteSession,
    cleanExpiredSessions,
    // Permissions
    getUserPermissions,
    updateUserPermissions,
    // Listini
    getAllListini,
    getListinoById,
    getListiniForUser,
    createListino,
    updateListino,
    deleteListino,
    // Settings
    getImpostazione,
    setImpostazione,
    addNotifica,
    getMittente,
    getTariffa,
    getAllTariffe,
    calcolaCosto,
    logActivity
};
