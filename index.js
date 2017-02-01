"use strict";

var express = require('express');
var app = express();
var path = require('path');

app.use(express.static(__dirname));

app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname + '/views/index.html'));
});

app.listen(3000);
console.log('Listening on port 3000...');