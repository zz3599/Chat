var express = require('express');
var path = require('path');
var bodyparser = require('body-parser');
var sqlite = require('sqlite3').verbose();

var app = express();
app.use(express.static('public'));
app.use( bodyparser.json()); // to support JSON-encoded bodies

var db = new sqlite.Database(':memory:');

var newMessages = [];
var responseQueue = [];

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

app.route('/chat').get(function(req, res, next){
    getRows(function(err, rows){
        result = '';
        for(var i = 0; i < rows.length; i++){
            var row = rows[i];
            result += '<p>' + row.message + '</p>' 
        }
        res.send(result);   

    });   
}).post(function(req, res, next){
    console.log('in post');
    console.log(req.param('message'));
    var m = req.body.message;
    console.log('message=' + m);
    if(m){
        db.run("INSERT INTO messages VALUES(?)", m, function(err){
            console.log(this);
            newMessages.push(m);
            console.log('response queue size: ' + responseQueue.length);
            for(var i = 0; i < responseQueue.length; i++){
                var responseItem = responseQueue[i];
                //responseItem.response.send(str);
                responseItem.response.send({'messages':newMessages});
            }  
            responseQueue = [];
            newMessages = [];
        });
        getRows(logRow);
        console.log('inserted message');
        res.send(200);
    }
});

app.route('/poll').get(function(req, res, next){
    var newItem = {'response': res, 'timestamp' : new Date().getTime()};
    responseQueue.push(newItem);
    console.log('polling for new messages');
    if(newMessages.length !== 0){
        console.log('found new messages');
        // for(var i = 0; i < responseQueue.length; i++){
        //     var responseItem = responseQueue[i];
        //     //responseItem.response.send(str);
        //     responseItem.response.send({'messages':newMessages});

        // }  
        // responseQueue = [];
        // newMessages = [];
    } else {
        console.log('no new messages');
    }
});

app.get('/', function(req, res){
  res.sendfile(path.resolve('index.html'));
});

setInterval(function(){
    console.log(responseQueue.length + " responses queued");
}, 1000);
// (function clearTimedoutResponses(){
//     setTimeout(function(){
//         var minTime = new Date().getTime() - 5000;
//         for(var i = 0; i < responseQueue.length; i++){
//             if(responseQueue[i].timestamp < minTime){
//                 console.log('cleared one response');
//                 responseQueue[i].response.send(200);
//                 responseQueue.splice(i, 1);
//             }
//         }
//         clearTimedoutResponses();
//     }, 1000);
// })();


app.listen(3000);