var express = require('express');
var path = require('path');
var sqlite = require('sqlite3').verbose();
var app = express();

var db = new sqlite.Database(':memory:');

var newMessages = [];
var requestQueue = [];

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
    if(m){
        db.run("INSERT INTO messages VALUES(?)", m, function(err){
            console.log(this);
            newMessages.push(m);
        });
        getRows(logRow);
        console.log('inserted message');
        res.send(200);
    } else {
        getRows(function(err, rows){
            result = '';
            for(var i = 0; i < rows.length; i++){
                var row = rows[i];
                result += '<p>' + row.message + '</p>' 
            }
            res.send(result);

        });

    }    
});

app.route('/poll').get(function(req, res, next){
    requestQueue.push({'request': req, 'timestamp' : new Date().getTime()});
    if(newMessages.length !== 0){
        var str = '';
        for(var j = 0; j < newMessages.length; j++){
            var message = newMessages[j];
            str += '<p>' + message + '</p>';
        }
        console.log(str);
        for(var i = 0; i < requestQueue.length; i++){
            var requestItem = requestQueue[i];
            requestItem.request.send(str);
        }    
        requestQueue = [];
        newMessages = [];

    }
});

app.get('/', function(req, res){
  res.sendfile(path.resolve('../index.html'));
});

(function clearOldRequests(){
    setTimeout(function(){
        var minTime = new Date().getTime() - 30000;
        for(var i = 0; i < requestQueue.length; i++){
            if(requestQueue.timestamp < minTime){
                requestQueue[i].send(200);
                requestQueue.splice(i, 1);
            }
        }
        clearOldRequests();
    }, 3000);
})();


app.listen(3000);