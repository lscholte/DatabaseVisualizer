"use strict";

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var mysqlQueries = require('./mysql-queries.js');

app.use(express.static('static'));

app.post('/sql/schema', mysqlQueries.getSchemaAction);
app.post('/sql/abstract-schema', mysqlQueries.getAbstractSchemaAction);
app.post('/sql/relations', mysqlQueries.getRelationsAction);

// Redirect any other paths to angular
app.all(/\/.*/, function(req, res) {
    res.redirect('/');
});

var port = process.argv[2] || 3000;

app.listen(port);
console.log('Listening at http://localhost:%s/', port);
