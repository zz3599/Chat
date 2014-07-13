var express = require('express');
var sqlite = require('sqlite3').verbose();
var app = express();

var db = new sqlite.Database(':memory:');

db.serialize(function(){
    db.run("CREATE TABLE messages (message TEXT)");
    db.run("INSERT INTO messages VALUES (?)", "hello");
    getRows(logRow);
});

function logRow(err, rows){
    for(var i = 0; i < rows.length; i++){
        var row = rows[i];
        console.log(row.rowid + ":" + row.message);
    }
}

function getRows(callback){
    db.all("SELECT rowid, message FROM messages", callback);
}

app.param('message', function(req, res, next, message){
    req.message = message;
    next();
});

app.route('/chat').get(function(req, res, next){
    console.log(req.param('message'));
    var m = req.param('message');
    var rows = [];
    if(req.param('message')){
        db.run("INSERT INTO messages VALUES(?)", m);
        getRows(logRow);
        console.log('inserted message');
        res.send(200);
    } else {
        getRows(function(err, rows){
            result = '';
            for(var i = 0; i < rows.length; i++){
                var row = rows[i];
                result += '<h1>' + row.message + '</h1>' 
            }
            res.send(result);

        });

    }
    
});




app.listen(3000);