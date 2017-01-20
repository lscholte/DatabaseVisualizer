var express = require("express");
var mysql = require('mysql');
var app = express();

var pool = mysql.createPool({
    connectionLimit: 100, //important
    host: 'localhost',
    user: 'seng371',
    password: 'seng_pass',
    database: 'employees',
    debug: true
});

function handle_database(req, res) {

    pool.getConnection(function(err, connection) {
        if (err) {
            connection.release();
            res.json({
                "code": 100,
                "status": "Error in connection database"
            });
            return;
        }

        console.log('connected as id ' + connection.threadId);

        connection.query("select * from dept_manager", function(err, rows) {
            connection.release();
            if (!err) {
                res.json(rows);
            }
        });

        connection.on('error', function(err) {
            res.json({
                "code": 100,
                "status": "Error in connection database"
            });
            return;
        });
    });
}

app.get("/", function(req, res) {
    -
    handle_database(req, res);
});

app.listen(3030);
console.log("Listening on http://localhost:3030")
