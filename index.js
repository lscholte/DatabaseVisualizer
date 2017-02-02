"use strict";

var express = require('express');
var app = express();

var mysqlQueries = require('./mysql-queries.js');

app.use(express.static('static'));
app.use('/home', express.static('static'));

app.get('/sql/get', mysqlQueries.getDataAction);
app.get('/sql/relations', mysqlQueries.getRelationsAction);

app.listen(3000);
console.log('Listening on port 3000...');
