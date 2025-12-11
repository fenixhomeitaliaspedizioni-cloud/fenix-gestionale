/* ========================================
   FENIX HOME ITALIA - GESTIONALE SPEDIZIONI
   shopify-integration.js - Integrazione Shopify Reale
   ======================================== */

class ShopifyIntegration {
    constructor(config) {
        this.shopDomain = config.shopDomain;
        this.accessToken = config.accessToken;
        this.apiVersion = config.apiVersion || '2024-10';
        this.baseUrl = `https://${this.shopDomain}/admin/api/${this.apiVersion}`;
    }

    async testConnection() {
        try {
            const response = await this._makeRequest('/shop.json', 'GET');
            return { success: true, shop: response.shop, message: `Connesso a: ${response.shop.name}` };
        } catch (error) {
            return { success: false, message: `Errore: ${error.message}` };
        }
    }

    async getUnfulfilledOrders(options = {}) {
        try {
            const params = new URLSearchParams({
                status: 'open',
                fulfillment_status: options.fulfillmentStatus || 'unfulfilled',
                limit: options.limit || 50
            });

            const response = await this._makeRequest(`/orders.json?${params}`, 'GET');
            return { success: true, orders: response.orders, count: response.orders.length };
        } catch (error) {
            return { success: false, message: `Errore: ${error.message}`, orders: [] };
        }
    }

    async getOrder(orderId) {
        try {
            const response = await this._makeRequest(`/orders/${orderId}.json`, 'GET');
            return { success: true, order: response.order };
        } catch (error) {
            return { success: false, message: `Errore: ${error.message}` };
        }
    }

    convertOrderToShipment(shopifyOrder, mittente) {
        const addr = shopifyOrder.shipping_address || {};
        const cust = shopifyOrder.customer || {};
        
        let peso = 0;
        if (shopifyOrder.line_items) {
            shopifyOrder.line_items.forEach(item => {
                if (item.grams) peso += (item.grams * item.quantity);
            });
        }
        peso = (peso / 1000) || 1;

        const isContrassegno = shopifyOrder.gateway === 'cash_on_delivery' || 
                              shopifyOrder.tags?.toLowerCase().includes('contrassegno');

        return {
            shopifyOrderId: shopifyOrder.id,
            shopifyOrderNumber: shopifyOrder.name,
            data: new Date().toISOString().split('T')[0],
            dataObj: new Date(),
            corriere: "",
            stato: "In Lavorazione",
            mittente: mittente,
            destinatario: {
                nome: `${addr.first_name || ''} ${addr.last_name || ''}`.trim() || 'Cliente Shopify',
                indirizzo: `${addr.address1 || ''} ${addr.address2 || ''}`.trim(),
                cap: addr.zip || '',
                citta: addr.city || '',
                prov: addr.province_code || '',
                telefono: addr.phone || cust.phone || '',
                email: cust.email || ''
            },
            dettagli: {
                colli: shopifyOrder.line_items?.reduce((sum, item) => sum + item.quantity, 0) || 1,
                peso: parseFloat(peso.toFixed(1)),
                volume: 0,
                contrassegno: isContrassegno ? parseFloat(shopifyOrder.total_price) : 0,
                assicurazione: parseFloat(shopifyOrder.total_price) > 100,
                note: `Ordine Shopify ${shopifyOrder.name}\n${shopifyOrder.note || ''}`
            },
            tracking: "",
            statoIncasso: isContrassegno ? "In Attesa" : null,
            costo: 0,
            distinaId: null,
            syncShopify: true,
            shopifyFulfillmentStatus: shopifyOrder.fulfillment_status
        };
    }

    async createFulfillment(orderId, fulfillmentData) {
        try {
            const orderResp = await this.getOrder(orderId);
            if (!orderResp.success) throw new Error('Ordine non trovato');

            const order = orderResp.order;
            const lineItems = order.line_items.map(item => ({ id: item.id, quantity: item.quantity }));

            const payload = {
                fulfillment: {
                    location_id: fulfillmentData.locationId || null,
                    tracking_number: fulfillmentData.trackingNumber || '',
                    tracking_company: fulfillmentData.corriere || '',
                    tracking_url: fulfillmentData.trackingUrl || '',
                    notify_customer: fulfillmentData.notifyCustomer !== false,
                    line_items: lineItems
                }
            };

            const response = await this._makeRequest(`/orders/${orderId}/fulfillments.json`, 'POST', payload);
            return { success: true, fulfillment: response.fulfillment, message: `Ordine ${order.name} evaso` };
        } catch (error) {
            return { success: false, message: `Errore: ${error.message}` };
        }
    }

    async addOrderTags(orderId, tags) {
        try {
            const orderResp = await this.getOrder(orderId);
            if (!orderResp.success) throw new Error('Ordine non trovato');

            const currentTags = orderResp.order.tags || '';
            const tagsArray = currentTags.split(',').map(t => t.trim()).filter(t => t);
            const newTags = tags.split(',').map(t => t.trim()).filter(t => t);
            
            newTags.forEach(tag => {
                if (!tagsArray.includes(tag)) tagsArray.push(tag);
            });

            const payload = { order: { id: orderId, tags: tagsArray.join(', ') } };
            const response = await this._makeRequest(`/orders/${orderId}.json`, 'PUT', payload);
            
            return { success: true, order: response.order };
        } catch (error) {
            return { success: false, message: `Errore: ${error.message}` };
        }
    }

    async getLocations() {
        try {
            const response = await this._makeRequest('/locations.json', 'GET');
            return { success: true, locations: response.locations };
        } catch (error) {
            return { success: false, message: `Errore: ${error.message}`, locations: [] };
        }
    }

    async createWebhook(topic, address) {
        try {
            const payload = { webhook: { topic: topic, address: address, format: 'json' } };
            const response = await this._makeRequest('/webhooks.json', 'POST', payload);
            return { success: true, webhook: response.webhook };
        } catch (error) {
            return { success: false, message: `Errore: ${error.message}` };
        }
    }

    async listWebhooks() {
        try {
            const response = await this._makeRequest('/webhooks.json', 'GET');
            return { success: true, webhooks: response.webhooks };
        } catch (error) {
            return { success: false, message: `Errore: ${error.message}`, webhooks: [] };
        }
    }

    async _makeRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method: method,
            headers: {
                'X-Shopify-Access-Token': this.accessToken,
                'Content-Type': 'application/json'
            }
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Shopify API (${response.status}): ${err}`);
        }

        return method === 'DELETE' ? { success: true } : await response.json();
    }
}

const CARRIER_MAPPING = {
    'BRT': 'Bartolini',
    'GLS': 'GLS',
    'SDA': 'Poste Italiane',
    'DHL': 'DHL',
    'UPS': 'UPS',
    'Poste Italiane': 'Poste Italiane'
};

function getTrackingUrl(corriere, trackingNumber) {
    const urls = {
        'BRT': `https://vas.brt.it/vas/sped_det_show.hsm?Nspediz=${trackingNumber}`,
        'GLS': `https://www.gls-italy.com/?id=${trackingNumber}`,
        'SDA': `https://www.sda.it/wps/portal/Servizi_online/dettaglio-spedizione?tracing.letteraVettura=${trackingNumber}`,
        'DHL': `https://www.dhl.com/it-it/home/tracking/tracking-express.html?tracking-id=${trackingNumber}`,
        'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
        'Poste Italiane': `https://www.poste.it/cerca/index.html#/risultati-traccia-spedizione/${trackingNumber}`
    };
    return urls[corriere] || '';
}

module.exports = { ShopifyIntegration, CARRIER_MAPPING, getTrackingUrl };
