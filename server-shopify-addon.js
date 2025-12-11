/* ========================================
   ADDON PER server.js - INTEGRAZIONE SHOPIFY REALE
   Aggiungi questo codice al tuo server.js esistente
   ======================================== */

// === IMPORTS AGGIUNTIVI (da aggiungere all'inizio del file) ===
const { ShopifyIntegration, CARRIER_MAPPING, getTrackingUrl } = require('./shopify-integration');
const shopifyConfig = require('./shopify-config');

// === INIZIALIZZAZIONE SHOPIFY (dopo la sezione impostazioni) ===
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
        // Recupera locations
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

    // Aggiorna configurazione
    shopifyConfig.shopify.shopDomain = shopDomain;
    shopifyConfig.shopify.accessToken = accessToken;
    shopifyConfig.shopify.enabled = enabled !== false;

    // Ricrea client
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
        const { orderIds } = req.body; // Array di ID ordini da importare, se vuoto importa tutti

        let ordersToImport = [];

        if (orderIds && orderIds.length > 0) {
            // Import ordini specifici
            for (const orderId of orderIds) {
                const result = await shopifyClient.getOrder(orderId);
                if (result.success) {
                    ordersToImport.push(result.order);
                }
            }
        } else {
            // Import tutti gli ordini non evasi
            const result = await shopifyClient.getUnfulfilledOrders({
                limit: 50
            });
            
            if (!result.success) {
                return res.status(500).json(result);
            }
            
            ordersToImport = result.orders;
        }

        // Converti ordini in spedizioni
        let importati = 0;
        let duplicati = 0;

        for (const order of ordersToImport) {
            // Controlla se ordine già importato
            const esistente = archivioSpedizioni.find(s => 
                s.shopifyOrderId === order.id
            );

            if (esistente) {
                duplicati++;
                continue;
            }

            // Converti e aggiungi
            const spedizione = shopifyClient.convertOrderToShipment(order, impostazioni.mittente);
            spedizione.id = contatoreSpedizioni++;
            
            // Applica regole automatiche se abilitate
            if (shopifyConfig.rules.autoAssignCarrier.enabled) {
                spedizione.corriere = applicaRegoleCorrere(order, spedizione);
            }

            archivioSpedizioni.push(spedizione);
            
            // Aggiungi tag su Shopify
            if (shopifyConfig.shopify.fulfillment.addTags) {
                await shopifyClient.addOrderTags(order.id, 'Importato Fenix');
            }
            
            importati++;
        }

        // Notifica
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
            // Aggiorna stato spedizione
            spedizione.shopifyFulfillmentId = result.fulfillment.id;
            spedizione.shopifyFulfillmentStatus = 'fulfilled';
            
            // Aggiungi tags
            if (shopifyConfig.shopify.fulfillment.addTags) {
                await shopifyClient.addOrderTags(
                    spedizione.shopifyOrderId,
                    shopifyConfig.shopify.fulfillment.tagsToAdd
                );
            }

            // Notifica
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

// Fulfillment automatico quando si crea distinta
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

    // Trova spedizioni Shopify in questa distinta
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
                
                // Tags
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

    // Notifica
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

// Endpoint ricevi webhook da Shopify
app.post('/api/shopify/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    // In produzione, verificare firma HMAC
    // const hmac = req.get('X-Shopify-Hmac-SHA256');
    // const verified = ShopifyIntegration.verifyWebhookSignature(req.body, hmac, secret);
    
    const topic = req.get('X-Shopify-Topic');
    const shopDomain = req.get('X-Shopify-Shop-Domain');
    
    console.log(`📥 Webhook ricevuto: ${topic} da ${shopDomain}`);

    try {
        const data = JSON.parse(req.body);

        switch (topic) {
            case 'orders/create':
                // Nuovo ordine creato
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
                // Ordine aggiornato
                const spedizione = archivioSpedizioni.find(s => s.shopifyOrderId === data.id);
                if (spedizione) {
                    // Aggiorna dati se necessario
                    console.log(`Ordine ${data.name} aggiornato`);
                }
                break;

            case 'orders/cancelled':
                // Ordine cancellato
                const sperizioneCancellata = archivioSpedizioni.find(s => s.shopifyOrderId === data.id);
                if (sperizioneCancellata && sperizioneCancellata.stato !== 'Spedito') {
                    sperizioneCancellata.stato = 'Cancellata';
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
// HELPER FUNCTIONS
// ============================================

function applicaRegoleCorrere(order, spedizione) {
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

