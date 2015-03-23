var express = require('express');
var events = require('events');
var path = require('path');
var bodyparser = require('body-parser');
var ddl = require('./db/ddl');
var cookieSession = require('express-session');
var app = express();

app.use('/public', express.static(__dirname + '/public'));
app.use( bodyparser.json()); // to support JSON-encoded bodies for posts, gets should not be stringifiied
app.use(cookieSession({
    resave: false,
    saveUninitialized: false,
    secret: 'NOTSECRET'
}));

app.locals.pretty = true;

var groupUsermap = {};
var userEmitterMap = {};

function mapMessages(groupMessageMap, messages){
    //store messages in session with map {groupId -> [messages]}
    for(var i = 0; i < messages.length; i++){
        var msgGroup = messages[i].groupId;
        var msgObject = {
            'message': messages[i].message, 
            'sender': messages[i].senderName,
            'timestamp': messages[i].timestamp
        };
        if (msgGroup in groupMessageMap){
            groupMessageMap[msgGroup].push(msgObject);
        } else {
            groupMessageMap[msgGroup] = [msgObject];
        }   
    }
}
function putUserIntoGroup(userid, groupid){
    var userids = groupUsermap[groupid];
    if(userids === undefined){
        groupUsermap[groupid] = [userid];
    } else if(userids instanceof Array){
        if(userids.indexOf(userid) === -1){
            userids.push(userid);
        }
    } else {
        throw "groupUserId map has value of type " + typeof(groupUsermap[groupid]);
    }
}
function getUserEmitter(userid){
    var eventEmitter = userEmitterMap[userid];
    if(eventEmitter === undefined){
        eventEmitter = new events.EventEmitter();
        userEmitterMap[userid] = eventEmitter;
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
    var seen = {o: true};    
    for(prop in o){
        if(o.hasOwnProperty(prop)){
            console.log(prop + '=>' + o[prop]);
            if(typeof(o[prop]) =='object' && !seen[o[prop]]){
                deepDump(o[prop]);
                seen[o[prop]] = true;
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
                console.log('logged in userid=' + rows[0].userId);
                //persist userid in session
                req.session.userId = rows[0].userId;
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


//Url: Chat - chat page
//Methods: GET/POST
app.route('/chat').get(function(req, res, next){
    var userId = req.param('id');//req.session.userId;
    if(!userId){
        res.render(path.resolve('public/home.jade'), {});
    } else {
        console.log("userid=" + userId);
        ddl.getUsergroups(req.session.userId, function(err, rows){
            console.log(rows);
            // groupid -> [usernames not of this user - for displaying purposes]
            var groupUsernames = {};
            var prevGroupId = -1;

            for(var i = 0; i < rows.length; i++){
                if(userId != rows[i].userId){                    
                    if(rows[i].groupId in groupUsernames){
                        groupUsernames[rows[i].groupId].push(rows[i].userName);
                    } else {
                        groupUsernames[rows[i].groupId] = [rows[i].userName];
                    }                    
                }
                if(rows[i].groupId != prevGroupId){
                    putUserIntoGroup(userId, rows[i].groupId);
                    prevGroupId = rows[i].groupId;
                }                
            }
            console.log(groupUsernames);
            console.log(groupUsermap); //global var populated/            
            res.render(path.resolve('public/index.jade'), {'existingMessages':[], 'groups': groupUsernames});            
           

        });
    }    
});

//messages
// GET - get messages for a particular group 
// POST - post messages to a particular group
app.route('/message').get(function(req, res, next){
    var groupId = req.param('groupId');
    console.log('/message, groupid=' + groupId);
    ddl.getGroupChatHistory(groupId, function(err, rows){
        
        console.log(rows);
        res.send(rows);
    });
}).post(function(req, res, next){
    var m = req.body.message;
    var receiverGroupId = req.body.receiverGroupId;
    console.log('posted message=' + m);
    console.log('from=' + req.session.userId + ',target groupid=' + receiverGroupId);
    if(m){
        ddl.putMessage(req.session.userId, receiverGroupId, m, new Date().getTime(), function(err){
            newMessages.push(m);
            var usersInGroup = groupUsermap[receiverGroupId];
            console.log(usersInGroup.length + ' users in the group');
            if(usersInGroup){
                //emit events to all users in the group
                for(var i = 0; i < usersInGroup.length; i++){
                    var emitter = getUserEmitter(usersInGroup[i]); 
                    emitter.emit('newMessage', m);     
                }
            }
            console.log('inserted message');
        });
    }
    res.send(200);
});

//Url: Poll
//Listens to the message eventemitter and does no DB reads
app.route('/poll').get(function(req, res, next){
    console.log('polling for new messages for user id=' + req.session.userId);
    if(newMessages.length !== 0){
        console.log('there are new messages');
    } else {
        console.log('no new messages');
    }
    var userid=req.session.userId;
    var userEmitter = getUserEmitter(userid);
    userEmitter.removeAllListeners();
    userEmitter.once('newMessage', function(data){
        console.log('received newMesage: ' + data);
        res.send({'messages':[data]});
    });
});


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
})//();



app.listen(3000);