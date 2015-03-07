var express = require('express');
var events = require('events');
var path = require('path');
var bodyparser = require('body-parser');
var sqlite = require('sqlite3').verbose();
var jade = require('jade');
var ddl = require('./db/ddl');
var app = express();

app.use('/public', express.static(__dirname + '/public'));
app.use( bodyparser.json()); // to support JSON-encoded bodies for posts, gets should not be stringifiied
app.locals.pretty = true;

var groupListeners = {};
function getGroupListener(groupId){
    var eventEmitter = groupListeners[groupId];
    if(eventEmitter === undefined){
        eventEmitter = events.EventEmitter();
        groupListeners[groupId] = eventEmitter;
    }
    return eventEmitter; 
}

var newMessages = [];
var responseQueue = [];

function logRow(err, rows){
    for(var i = 0; i < rows.length; i++){
        var row = rows[i];
        console.log(row.rowid + ":" + row.message);
    }
}

function deepDump(o){
    for(prop in o){
        if(o.hasOwnProperty(prop)){
            console.log(prop + '=>' + o[prop]);
            if(typeof(o[prop]) =='object'){
                deepDump(o[prop]);
            }
        }
    }
}

// Home /login page
app.route('/home').get(function(req, res, next){
    res.render(path.resolve('public/home.jade'), {});
});

// User 
// GET - login
// POST - register
app.route('/user').get(function(req, res, next){
    var userName = req.param('userName');
    var password = req.param('password');
    console.log('trying to login ' + userName);
    //    deepDump(req);
    if(userName && password){
        ddl.getUser(userName, password, function(err, rows){
            if(!rows || rows.length === 0){
                console.log('user does not exist');
                res.send(404);
            } else {
                console.log('logged in');
                res.send({userid: rows[0].userId});
            }
        });
    } else {
        res.send(404);
    }
}).post(function(req, res, next){
    var userName = req.body.userName;
    var password = req.body.password;
    if(userName && password){
        ddl.createUser(userName, password, function(err){
            if(err){
                console.log("Could not create user: " + err);
                res.send(404);
            } else {
                console.log('inserted user id=' + this.lastID);            
                res.send({userid: this.lastID});
            }
        })
    }
});


//Url: Chat 
//Methods: GET/POST
app.route('/chat').get(function(req, res, next){
    var userId = req.param('userid');
    console.log('userid=' + userId);
    if(!userId){
        ddl.getAllMessages(function(err, rows){
            var messages = [];
            for(var i = 0; i < rows.length; i++){
                messages.push({'message': rows[i].message});
            } 
            console.log(messages);
            res.render(path.resolve('public/index.jade'), {existingMessages: messages});
        }); 
    } else {
        ddl.getUsergroups(userId, function(err, rows){
            console.log(rows);
            for(var i = 0; i < rows.length; i++){
                console.log(i + ' ' +  rows[i]);
            }
            console.log('woo');

        });
        /*        ddl.getUserChatHistory(userId, function(err, rows){
            console.log(rows.length + ' rows returned');
            var messages = [];
            for(var i = 0; i < rows.length; i++){
                messages.push({'message':rows[i].message, 'senderName': rows[i].senderName});
            }
            console.log(messages);
            //            res.send(rows);
            res.render(path.resolve('public/index.jade'), {existingMessages: messages});
            });*/
    }
}).post(function(req, res, next){
    var m = req.body.message;
    console.log('posted message=' + m);
    console.log('target userid=' + req.body.userid);
    if(m){
        ddl.putMessage(1, 1, m, new Date().getTime(), function(err){
            newMessages.push(m);
            console.log('response queue size: ' + responseQueue.length);
            for(var i = 0; i < responseQueue.length; i++){
                var responseItem = responseQueue[i];
                //responseItem.response.send(str);
                responseItem.response.send({'messages':newMessages});
            }  
            responseQueue = [];
            newMessages = [];
            ddl.getAllMessages(logRow);
            console.log('inserted message');
        });
    }
    res.send(200);
});

//Url: Poll
//Listens to the message eventemitter and does no DB reads
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

//LOGGING
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