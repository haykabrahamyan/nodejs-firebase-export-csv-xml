'use strict';
const express = require('express'),
    app = express(),
    port = process.env.PORT || 80,
    bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


const routes = require('./app/routes/route'); //importing route
routes(app); //register the route

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
    res.status(404).send({url: req.originalUrl + ' not found'})
});

app.listen(port);

console.log('API server started on: ' + port);