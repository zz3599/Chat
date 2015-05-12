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

//After this interval users are considered inactive and will no longer trigger retries for message submission. If no listener is attached 
//to the emitter, just delete the user from all usergroups.
var ACTIVE_MILLIS = 10*60*1000;
//The emitter event string for a new message
var EMIT_MESSAGE_EVENT = 'newMessage';

//Active users within the last x minutes. These users will have newly posted messages trigger retries to 
//emit to their event listener. 
//userid => timestamp of last active time
var activeUserMap = {};
var groupUserMap = {};
var userEmitterMap = {};
//user -> [unemitted messages]
//Preserve messages for active users who may have not been active recently so the next poll immediately fetches all of them
var newMessages = {};
//Active users who did not have a response attached at the time a message came
var usersQueue = {};

function addUserQueue(userId){
    usersQueue[userId] = true;
}


function pushNewMessage(userId, message, timestamp, username){
    var messageQueue = newMessages[userId];
    var messageObject = {'message': message, 'timestamp': timestamp, 'senderName': username};
    if(!messageQueue){
        newMessages[userId] = [messageObject];
    } else {
        messageQueue.push(messageObject);;
    }
}

function clearMessages(userId){
    delete newMessages[userId];
}

function setActiveUser(userId){
    activeUserMap[userId] = {
        lastActive: new Date().getTime(), // when was user last active
        pushPoller: undefined // if user was active, 
    } ;
    return activeUserMap[userId];
}

function removeActiveuser(userId){
    if(userId in activeUserMap){
        var pushPoller;
        if(pushPoller = activeUserMap[userId]['pushPoller']){
            clearInterval(pushPoller);
        }
    }
    delete activeUserMap[userId];
}

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
    var userids = groupUserMap[groupid];
    if(userids === undefined){
        groupUserMap[groupid] = [userid];
    } else if(userids instanceof Array){
        if(userids.indexOf(userid) === -1){
            userids.push(userid);
        }
    } else {
        throw "groupUserId map has value of type " + typeof(groupUserMap[groupid]);
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
                req.session.userName = userName;
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
            setActiveUser(userId);
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
            console.log(groupUserMap); //global var populated/            
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
        var timestamp = new Date().getTime();
        ddl.putMessage(req.session.userId, receiverGroupId, m, timestamp, function(err){
            var usersInGroup = groupUserMap[receiverGroupId];
            console.log(usersInGroup.length + ' active users in the group');
            if(usersInGroup){
                //emit events to all users in the group
                for(var i = 0; i < usersInGroup.length; i++){
                    var targetUserId = usersInGroup[i];
                    var emitter = getUserEmitter(targetUserId); 
                    // if there are active listeners on the event, emit immediately
                    if(emitter.listeners(EMIT_MESSAGE_EVENT).length > 0){
                        console.log('>0 listeners for userid: ' + targetUserId);
                        emitter.emit(EMIT_MESSAGE_EVENT, [{message: m, timestamp: timestamp, senderName: req.session.userName}]);     
                    } else { 
                        console.log('0 listeners for userid: ' + targetUserId);
                        // no active listeners, check if the user is active
                        // if the user is active, push to the user message queue, 
                        // retry pushing to the user periodically until they reconnect, with no (todo: exponential) backoff
                        // otherwise, just ignore the message
                        var activeUser = activeUserMap[targetUserId];
                        if(activeUser != null){
                            console.log('userid ' + targetUserId + ' is active - adding to usersQueue');
                            pushNewMessage(targetUserId, m, timestamp, req.session.userName);
                            addUserQueue(targetUserId);
                        } else {
                            //clear message queue for the targeted user since they are inactive- next time they poll just give them full db read
                            clearMessages[targetUserId];
                        }
                        
                    }
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
    var userid=req.session.userId;
    setActiveUser(userid);
    var userEmitter = getUserEmitter(userid);
    //delay by 10 seconds so we can test the reconnect functionality
    setTimeout(function(){
        userEmitter.removeAllListeners();
        userEmitter.once(EMIT_MESSAGE_EVENT, function(data){
            console.log('received newMesage: ' + data);
            res.send({'messages': data});
        });
        console.log('1 active listener for userid ' + userid);
    }, 10000);
    
});

//Sends messages to users in the usersQueue- users that did not have their responses submitted in time for the message events
(function updateQueuedUsers(){
    setTimeout(function(){
        for(var property in usersQueue){
            if(usersQueue.hasOwnProperty(property) && usersQueue[property] === true){
                var userId = parseInt(property, 10);
                console.log('Updating messages for userid ' + userId);
                var emitter = getUserEmitter(userId);
                if(emitter.listeners(EMIT_MESSAGE_EVENT).length > 0){
                    var messageObjects = [];
                    for(var i = 0; i < newMessages[userId].length; i++){
                        var messageObject = newMessages[userId][i];
                        messageObjects.push(messageObject);
                    }
                    emitter.emit(EMIT_MESSAGE_EVENT, messageObjects);                                        
                    console.log('Updating messages for ' + userId + ', sent ' + messageObjects.length);
                    //clear the emitted messages
                    newMessages[userId].length = 0;
                    //remove the user from the queue
                    delete usersQueue[userId];
                }            
            }
        }
        updateQueuedUsers();
    }, 1000);
})();


//clear users from activeusermap that have not been active for a while
(function clearInactiveUsers(){
    setTimeout(function(){
        var minThresholdTime = new Date().getTime() - ACTIVE_MILLIS; 
        for(var elem in activeUserMap){
            if(activeUserMap.hasOwnProperty(elem)){
                if(activeUserMap[elem]['lastActive'] < minThresholdTime){
                    console.log('removed inactive user: ' + elem);
                    removeActiveUser(elem);
                }
            }
        }
        clearInactiveUsers();
    }, 1000);
})();



app.listen(3000);