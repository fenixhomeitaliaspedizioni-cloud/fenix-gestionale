/* ========================================
   FENIX HOME ITALIA - Auth Routes
   auth-routes.js - API Autenticazione e Admin
   ======================================== */

const express = require('express');
const router = express.Router();
const db = require('./database');

// ============================================
// MIDDLEWARE AUTENTICAZIONE
// ============================================

function requireAuth(req, res, next) {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    
    if (!sessionId) {
        return res.status(401).json({ success: false, message: 'Non autenticato' });
    }
    
    const session = db.getSession(sessionId);
    if (!session) {
        return res.status(401).json({ success: false, message: 'Sessione scaduta' });
    }
    
    req.user = {
        id: session.user_id,
        nome: session.nome,
        email: session.email,
        ruolo: session.ruolo,
        azienda: session.azienda
    };
    req.sessionId = sessionId;
    
    next();
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.ruolo !== 'admin') {
        return res.status(403).json({ success: false, message: 'Accesso negato. Solo amministratori.' });
    }
    next();
}

function requireOperator(req, res, next) {
    if (!req.user || !['admin', 'operatore'].includes(req.user.ruolo)) {
        return res.status(403).json({ success: false, message: 'Accesso negato' });
    }
    next();
}

// ============================================
// API AUTENTICAZIONE
// ============================================

router.post('/auth/login', (req, res) => {
    try {
        const { email, password, remember } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email e password richieste' });
        }
        
        const user = db.authenticateUser(email, password);
        
        if (!user) {
            db.logActivity(null, 'login_failed', 'user', null, { email }, req.ip);
            return res.status(401).json({ success: false, message: 'Email o password non validi' });
        }
        
        const sessionId = db.createSession(user.id, { remember });
        db.logActivity(user.id, 'login', 'user', user.id, null, req.ip);
        const permissions = db.getUserPermissions(user.id);
        
        const maxAge = remember ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
        res.cookie('sessionId', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: maxAge,
            sameSite: 'lax'
        });
        
        res.json({
            success: true,
            user: user,
            permissions: permissions,
            sessionId: sessionId
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Errore durante il login' });
    }
});

router.post('/auth/logout', requireAuth, (req, res) => {
    try {
        db.deleteSession(req.sessionId);
        db.logActivity(req.user.id, 'logout', 'user', req.user.id, null, req.ip);
        res.clearCookie('sessionId');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore durante il logout' });
    }
});

router.get('/auth/me', requireAuth, (req, res) => {
    try {
        const permissions = db.getUserPermissions(req.user.id);
        res.json({
            success: true,
            user: req.user,
            permissions: permissions
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore' });
    }
});

router.post('/auth/change-password', requireAuth, (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const user = db.authenticateUser(req.user.email, currentPassword);
        if (!user) {
            return res.status(400).json({ success: false, message: 'Password attuale non corretta' });
        }
        
        db.updateUser(req.user.id, { password: newPassword });
        db.logActivity(req.user.id, 'password_changed', 'user', req.user.id, null, req.ip);
        
        res.json({ success: true, message: 'Password aggiornata' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore' });
    }
});

// ============================================
// API ADMIN - GESTIONE UTENTI
// ============================================

router.get('/admin/users', requireAuth, requireAdmin, (req, res) => {
    try {
        const users = db.getAllUsers();
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore nel recupero utenti' });
    }
});

router.get('/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const user = db.getUserById(parseInt(req.params.id));
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utente non trovato' });
        }
        
        const permissions = db.getUserPermissions(user.id);
        res.json({ success: true, user, permissions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore' });
    }
});

router.post('/admin/users', requireAuth, requireAdmin, (req, res) => {
    try {
        const { nome, email, password, azienda, telefono, ruolo, stato } = req.body;
        
        if (!nome || !email || !password) {
            return res.status(400).json({ success: false, message: 'Nome, email e password richiesti' });
        }
        
        const existing = db.db.prepare('SELECT id FROM utenti WHERE email = ?').get(email);
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email già registrata' });
        }
        
        const userId = db.createUser({ nome, email, password, azienda, telefono, ruolo, stato });
        db.logActivity(req.user.id, 'user_created', 'user', userId, { email }, req.ip);
        
        res.json({ success: true, userId, message: 'Utente creato' });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, message: 'Errore nella creazione utente' });
    }
});

router.put('/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = db.getUserById(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'Utente non trovato' });
        }
        
        db.updateUser(userId, req.body);
        db.logActivity(req.user.id, 'user_updated', 'user', userId, null, req.ip);
        
        res.json({ success: true, message: 'Utente aggiornato' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore nell\'aggiornamento' });
    }
});

router.delete('/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        if (userId === req.user.id) {
            return res.status(400).json({ success: false, message: 'Non puoi eliminare il tuo account' });
        }
        
        db.deleteUser(userId);
        db.logActivity(req.user.id, 'user_deleted', 'user', userId, null, req.ip);
        
        res.json({ success: true, message: 'Utente eliminato' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore nell\'eliminazione' });
    }
});

// ============================================
// API ADMIN - PERMESSI UTENTE
// ============================================

router.get('/admin/users/:id/permissions', requireAuth, requireAdmin, (req, res) => {
    try {
        const permissions = db.getUserPermissions(parseInt(req.params.id));
        res.json({ success: true, permissions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore' });
    }
});

router.put('/admin/users/:id/permissions', requireAuth, requireAdmin, (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        db.updateUserPermissions(userId, req.body);
        db.logActivity(req.user.id, 'permissions_updated', 'user', userId, req.body, req.ip);
        
        res.json({ success: true, message: 'Permessi aggiornati' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore nell\'aggiornamento permessi' });
    }
});

// ============================================
// API ADMIN - LISTINI
// ============================================

router.get('/admin/listini', requireAuth, requireAdmin, (req, res) => {
    try {
        const listini = db.getAllListini();
        res.json({ success: true, data: listini });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore' });
    }
});

router.get('/admin/listini/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const listino = db.getListinoById(parseInt(req.params.id));
        if (!listino) {
            return res.status(404).json({ success: false, message: 'Listino non trovato' });
        }
        res.json({ success: true, listino });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore' });
    }
});

router.post('/admin/listini', requireAuth, requireAdmin, (req, res) => {
    try {
        const listinoId = db.createListino(req.body);
        db.logActivity(req.user.id, 'listino_created', 'listino', listinoId, null, req.ip);
        res.json({ success: true, listinoId, message: 'Listino creato' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore nella creazione' });
    }
});

router.put('/admin/listini/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const listinoId = parseInt(req.params.id);
        db.updateListino(listinoId, req.body);
        db.logActivity(req.user.id, 'listino_updated', 'listino', listinoId, null, req.ip);
        res.json({ success: true, message: 'Listino aggiornato' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore nell\'aggiornamento' });
    }
});

router.delete('/admin/listini/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const listinoId = parseInt(req.params.id);
        db.deleteListino(listinoId);
        db.logActivity(req.user.id, 'listino_deleted', 'listino', listinoId, null, req.ip);
        res.json({ success: true, message: 'Listino eliminato' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore nell\'eliminazione' });
    }
});

// ============================================
// API ADMIN - TARIFFE BASE
// ============================================

router.get('/admin/tariffe', requireAuth, requireAdmin, (req, res) => {
    try {
        const tariffe = db.getAllTariffe();
        res.json({ success: true, data: tariffe });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore' });
    }
});

router.put('/admin/tariffe/:corriere', requireAuth, requireAdmin, (req, res) => {
    try {
        const { tariffa_base, costo_kg, costo_contrassegno, costo_assicurazione, costo_express, attivo } = req.body;
        
        db.db.prepare(`
            UPDATE tariffe SET 
                tariffa_base = ?, costo_kg = ?, costo_contrassegno = ?, 
                costo_assicurazione = ?, costo_express = ?, attivo = ?
            WHERE corriere = ?
        `).run(tariffa_base, costo_kg, costo_contrassegno, costo_assicurazione, costo_express, attivo ? 1 : 0, req.params.corriere);
        
        res.json({ success: true, message: 'Tariffa aggiornata' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore' });
    }
});

// ============================================
// API ADMIN - LOG ATTIVITÀ
// ============================================

router.get('/admin/activity-log', requireAuth, requireAdmin, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = db.db.prepare(`
            SELECT l.*, u.nome as user_nome, u.email as user_email
            FROM activity_log l
            LEFT JOIN utenti u ON l.user_id = u.id
            ORDER BY l.created_at DESC
            LIMIT ?
        `).all(limit);
        
        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore' });
    }
});

// ============================================
// API CLIENTE - LISTINI ASSEGNATI
// ============================================

router.get('/my/listini', requireAuth, (req, res) => {
    try {
        if (req.user.ruolo === 'admin') {
            const listini = db.getAllListini();
            return res.json({ success: true, data: listini });
        }
        
        const listini = db.getListiniForUser(req.user.id);
        res.json({ success: true, data: listini });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore' });
    }
});

router.get('/my/listini/:id', requireAuth, (req, res) => {
    try {
        const listinoId = parseInt(req.params.id);
        
        if (req.user.ruolo !== 'admin') {
            const userListini = db.getListiniForUser(req.user.id);
            const hasAccess = userListini.some(l => l.id === listinoId);
            if (!hasAccess) {
                return res.status(403).json({ success: false, message: 'Accesso negato a questo listino' });
            }
        }
        
        const listino = db.getListinoById(listinoId);
        if (!listino) {
            return res.status(404).json({ success: false, message: 'Listino non trovato' });
        }
        
        res.json({ success: true, listino });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Errore' });
    }
});

// ============================================
// EXPORT
// ============================================

module.exports = {
    router,
    requireAuth,
    requireAdmin,
    requireOperator
};
