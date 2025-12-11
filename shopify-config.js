/* ========================================
   FENIX HOME ITALIA - GESTIONALE SPEDIZIONI
   shopify-config.js - Configurazione Shopify
   ======================================== */

/**
 * GUIDA CONFIGURAZIONE SHOPIFY
 * 
 * 1. Accedi al tuo pannello Shopify
 * 2. Vai su: Impostazioni → App e canali di vendita
 * 3. Clicca "Sviluppa app" in basso
 * 4. Clicca "Crea un'app"
 * 5. Dai un nome (es: "Fenix Gestionale")
 * 6. Seleziona "Configurazione API Admin"
 * 7. Aggiungi questi permessi (scopes):
 *    - read_orders
 *    - write_orders
 *    - read_fulfillments
 *    - write_fulfillments
 *    - read_shipping
 *    - write_shipping
 *    - read_locations
 * 8. Salva e installa l'app
 * 9. Copia l'Access Token che appare
 * 10. Inseriscilo qui sotto
 */

module.exports = {
    // === CONFIGURAZIONE PRINCIPALE ===
    shopify: {
        enabled: false, // Imposta true dopo configurazione
        shopDomain: 'tuonegozio.myshopify.com', // SOSTITUISCI con il tuo dominio
        accessToken: '', // INCOLLA qui il tuo Access Token
        apiVersion: '2024-10', // Versione API Shopify
        
        // Location ID per fulfillment (opzionale, verrà rilevato automaticamente)
        locationId: null,
        
        // Impostazioni sincronizzazione
        sync: {
            autoImport: false, // Import automatico nuovi ordini
            intervalMinutes: 15, // Ogni quanto controllare (minuti)
            maxOrdersPerSync: 50, // Numero massimo ordini per sincronizzazione
            startDate: null // Data da cui iniziare import (ISO string, null = tutti)
        },
        
        // Impostazioni fulfillment
        fulfillment: {
            autoFulfill: true, // Crea fulfillment automatico quando si crea distinta
            notifyCustomer: true, // Notifica cliente via email
            addTrackingToOrder: true, // Aggiungi tracking number all'ordine
            addTags: true, // Aggiungi tags automatici
            tagsToAdd: 'Gestito Fenix, Spedito' // Tags da aggiungere
        },
        
        // Webhook (per sincronizzazione automatica)
        webhooks: {
            enabled: false, // Abilita webhook
            secret: '', // Secret per validare webhook (verrà generato)
            topics: [
                'orders/create', // Nuovo ordine
                'orders/updated', // Ordine aggiornato
                'orders/cancelled' // Ordine cancellato
            ]
        }
    },
    
    // === MAPPING STATI ===
    statusMapping: {
        // Mappa stati Shopify → stati Fenix
        'unfulfilled': 'In Lavorazione',
        'partial': 'In Lavorazione',
        'fulfilled': 'Spedito',
        'cancelled': 'Cancellata'
    },
    
    // === REGOLE AUTOMATICHE ===
    rules: {
        // Assegna corriere automaticamente in base a regole
        autoAssignCarrier: {
            enabled: false,
            rules: [
                // Esempio: ordini sopra 50€ con DHL
                {
                    condition: 'totalPrice',
                    operator: '>',
                    value: 50,
                    carrier: 'DHL'
                },
                // Esempio: provincia Roma con BRT
                {
                    condition: 'province',
                    operator: '==',
                    value: 'RM',
                    carrier: 'BRT'
                },
                // Default fallback
                {
                    condition: 'default',
                    carrier: 'GLS'
                }
            ]
        },
        
        // Marca automaticamente ordini con tags
        autoTag: {
            enabled: true,
            rules: [
                {
                    condition: 'contrassegno',
                    tag: 'Contrassegno'
                },
                {
                    condition: 'imported',
                    tag: 'Importato Fenix'
                }
            ]
        }
    }
};
