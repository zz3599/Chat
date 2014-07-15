var express = require('express');
var path = require('path');
var bodyparser = require('body-parser');
var sqlite = require('sqlite3').verbose();
var jade = require('jade');

var app = express();
//app.use(express.static('public'));
app.use('/public', express.static(__dirname + '/public'));
app.use( bodyparser.json()); // to support JSON-encoded bodies
app.locals.pretty = true;

var db = new sqlite.Database(':memory:');

var newMessages = [];
var responseQueue = [];

db.serialize(function(){
    db.run("CREATE TABLE messages (message TEXT)");
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
        var messages = [];
        for(var i = 0; i < rows.length; i++){
            messages.push(rows[i].message);
        } 
        res.send({'messages': messages});
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
        console.log('there are new messages');
    } else {
        console.log('no new messages');
    }
});

app.get('/', function(req, res){
    console.log('hi in get');
  //res.sendfile(path.resolve('index.html'));
    getRows(function(err, rows){
        var messages = [];
        for(var i = 0; i < rows.length; i++){
            messages.push(rows[i].message);
        } 
        console.log(messages);
        res.render(path.resolve('public/index.jade'), {existingMessages: messages});
    });
});

setInterval(function(){
    console.log(responseQueue.length + " responses queued");
}, 1000);

//clear old responses that have been stale for over X seconds
(function clearTimedoutResponses(){
    setTimeout(function(){
        var minTime = new Date().getTime() - 10000;
        for(var i = responseQueue.length - 1; i >= 0 ; i--){
            if(responseQueue[i].timestamp < minTime){
                console.log('cleared one response');
                responseQueue[i].response.send(200);
                responseQueue.splice(i, 1);
            }
        }
        clearTimedoutResponses();
    }, 1000);
})();


app.listen(3000);