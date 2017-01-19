"use strict";

var express = require('express');
var app = express();

var nunjucks = require('nunjucks');
nunjucks.configure('views', {
	autoescape: true,
	express: app
});

var phrases = ['Hello World.', 'Today is a good day.', 'Everything is fine.', 'I like pie.'];

app.get('/', function(req, res) {
	var randomPhrase = phrases[Math.floor(Math.random() * 4)];

	res.render('index.html.njk', {
		testText: randomPhrase
	});
});

app.listen(3000);
console.log('Listening on port 3000...');