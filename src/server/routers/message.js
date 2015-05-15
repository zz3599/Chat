//messages
// GET - get messages for a particular group 
// POST - post messages to a particular group

module.exports = function(app, ddl, commons){
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
                var usersInGroup = commons.groupUserMap[receiverGroupId];
                console.log(usersInGroup.length + ' active users in the group');
                if(usersInGroup){
                    //emit events to all users in the group
                    for(var i = 0; i < usersInGroup.length; i++){
                        var targetUserId = usersInGroup[i];
                        var emitter = commons.getUserEmitter(targetUserId); 
                        // if there are active listeners on the event, emit immediately
                        if(emitter.listeners(commons.EMIT_MESSAGE_EVENT).length > 0){
                            console.log('>0 listeners for userid: ' + targetUserId);
                            emitter.emit(commons.EMIT_MESSAGE_EVENT, [{message: m, timestamp: timestamp, senderName: req.session.userName}]);     
                        } else { 
                            console.log('0 listeners for userid: ' + targetUserId);
                            // no active listeners, check if the user is active
                            // if the user is active, push to the user message queue, 
                            // retry pushing to the user periodically until they reconnect, with no (todo: exponential) backoff
                            // otherwise, just ignore the message
                            var activeUser = commons.activeUserMap[targetUserId];
                            if(activeUser != null){
                                console.log('userid ' + targetUserId + ' is active - adding to usersQueue');
                                commons.pushNewMessage(targetUserId, m, timestamp, req.session.userName);
                                commons.addUserQueue(targetUserId);
                            } else {
                                //clear message queue for the targeted user since they are inactive- next time they poll just give them full db read
                                commons.clearMessages[targetUserId];
                            }
                            
                        }
                    }
                }
                console.log('inserted message');
            });
        }
        res.send(200);
    });
}