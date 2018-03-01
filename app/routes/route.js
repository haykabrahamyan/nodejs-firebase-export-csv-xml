'use strict';

module.exports = function(app) {

    let products = require('../controllers/ProductsController');
    // API Routes
    app.get('/', products.index);
    // app.get('/products', products.offers);
    // app.post('/offers/store', products.store);
    // app.delete('/offers/:id', products.destroy);


};