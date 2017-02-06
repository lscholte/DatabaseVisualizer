var mysql = require('mysql');

function sendError(message, errObject, res)
{
    console.log("SQL Error: " + message);
    console.log(errObject);
    res.status(500).json({
        "code": 100,
        "status": message
    });
}

function performQuery(connectionParams, query, errorCallback, callback)
{
    // Connection is defined by post variables
    var connection = mysql.createConnection({
        host: connectionParams.host,
        port: connectionParams.port,
        user: connectionParams.user,
        password: connectionParams.password,
        database: connectionParams.database
    });

    connection.connect(function (err) {
        if (err) {
            connection.end();
            errorCallback("Error connecting to database", err);
            return;
        }

        console.log('Connected as id ' + connection.threadId);

        connection.query(query, function (err, rows) {
            connection.end();

            if (err)
            {
                errorCallback("Error executing query", err);
                return;
            }

            callback(rows);
        });

        connection.on('error', function (err) {
            connection.end();
            errorCallback("Database connection error", err);
        });
    });
}

module.exports.getSchemaAction = function(req, res) {

    // This is a magical sql query that I crafted. It's pretty cool
    var sqlQuery = 'SELECT c.TABLE_NAME AS "table", c.COLUMN_NAME AS "column", ' +
        'SUM(CASE WHEN tc.CONSTRAINT_TYPE = "PRIMARY KEY" THEN 1 ELSE 0 END) AS "primary", ' +
        'SUM(CASE WHEN tc.CONSTRAINT_TYPE = "FOREIGN KEY" THEN 1 ELSE 0 END) AS "foreign" ' +
        'FROM information_schema.`COLUMNS` AS c ' +
        'LEFT JOIN information_schema.KEY_COLUMN_USAGE AS kcu ON kcu.TABLE_SCHEMA = c.TABLE_SCHEMA ' +
        'AND kcu.TABLE_NAME = c.TABLE_NAME AND kcu.COLUMN_NAME = c.COLUMN_NAME ' +
        'LEFT JOIN information_schema.TABLE_CONSTRAINTS AS tc ON tc.TABLE_SCHEMA = c.TABLE_SCHEMA ' +
        'AND tc.TABLE_NAME = c.TABLE_NAME AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME ' +
        'WHERE c.TABLE_SCHEMA = "' + req.body.database + '" ' +
        'GROUP BY c.TABLE_NAME, c.COLUMN_NAME ORDER BY c.TABLE_NAME, c.COLUMN_NAME';

    performQuery(req.body, sqlQuery,
        function(m, e) {
            sendError(m, e, res);
        },
        function(rows) {
            // Build our json object for go.js
            var tables = [];

            while (rows.length > 0)
            {
                var row = rows.shift();

                // This looks gross. Thank closures.
                var table = tables.find((function(row) {
                    return function (e) {
                        if (e.key === row.table)
                            return true;
                    }
                })(row));

                if (table === undefined)
                {
                    table = {key: row.table, items: []};
                    tables.push(table);
                }

                table.items.push({
                    name: row.column,
                    iskey: row.primary || row.foreign,
                    figure: row.primary || row.foreign ? "Decision" : "Cube1",
                    color: row.primary && row.foreign ? "PrimaryForeign" : row.primary ? "Primary" : row.foreign ? "Foreign" : "None"
                })
            }

            res.json(tables);
        }
    );
};

module.exports.getRelationsAction = function(req, res) {

    var sqlQuery = 'SELECT kcu.TABLE_NAME as "from", kcu.REFERENCED_TABLE_NAME as "to", "0..N" as "text", "1" as "toText" ' +
        'FROM information_schema.TABLE_CONSTRAINTS AS tc ' +
        'JOIN information_schema.KEY_COLUMN_USAGE AS kcu ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME ' +
        'WHERE tc.TABLE_SCHEMA = "' + req.body.database + '" AND tc.CONSTRAINT_TYPE = "FOREIGN KEY"';

    performQuery(req.body, sqlQuery,
        function(m, e) {
            sendError(m, e, res);
        },
        function (rows) {
            res.json(rows);
        }
    );
};
