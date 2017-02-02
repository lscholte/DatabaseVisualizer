var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit: 100, //important
    host: 'localhost',
    user: 'seng371',
    password: 'seng_pass',
    database: 'employees',
    debug: true
});

module.exports.getDataAction = function(req, res) {

    pool.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            res.json({
                "code": 100,
                "status": "Error in connection database"
            });
            return;
        }

        console.log('connected as id ' + connection.threadId);

        connection.query('select * from ' + req.query.table, function (err, rows) {
            connection.release();
            if (!err) {
                res.json(rows);
            } else {
                res.json({
                    "code": 101,
                    "status": err
                });
            }
        });

        connection.on('error', function (err) {
            res.json({
                "code": 100,
                "status": "Error in connecting database"
            });
        });
    });
};

module.exports.getRelationsAction = function(req, res) {

    pool.getConnection(function (err, connection) {
        if (err) {
            connection.release();
            res.json({
                "code": 100,
                "status": "Error in connection database"
            });
            return;
        }

        console.log('connected as id ' + connection.threadId);

        var sqlquery = 'SELECT kcu.TABLE_NAME as manyTable, kcu.COLUMN_NAME as manyColumn, kcu.REFERENCED_TABLE_NAME as oneTable, kcu.REFERENCED_COLUMN_NAME as oneColumn ' +
                       'FROM information_schema.TABLE_CONSTRAINTS AS tc ' +
                       'JOIN information_schema.KEY_COLUMN_USAGE AS kcu ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME ' +
                       'WHERE tc.TABLE_SCHEMA = "' + pool.config.connectionConfig.database + '" AND tc.CONSTRAINT_TYPE = "FOREIGN KEY"';

        connection.query(sqlquery, function (err, rows) {
            connection.release();
            if (!err) {
                res.json(rows);
            } else {
                res.json({
                    "code": 101,
                    "status": "Query returned an error: " + err
                });
            }
        });

        connection.on('error', function (err) {
            res.json({
                "code": 100,
                "status": "Error in connecting database"
            });
        });
    });

};
