//Sends messages to users in the usersQueue- users that did not have their responses submitted in time for the message events
module.exports = function(commons){
    (function updateQueuedUsers(){
        setTimeout(function(){
            for(var property in commons.usersQueue){
                if(commons.usersQueue.hasOwnProperty(property) && commons.usersQueue[property] === true){
                    var userId = parseInt(property, 10);
                    console.log('Updating messages for userid ' + userId);
                    var emitter = commons.getUserEmitter(userId);
                    if(emitter.listeners(commons.EMIT_MESSAGE_EVENT).length > 0){
                        var messageObjects = [];
                        for(var i = 0; i < commons.newMessages[userId].length; i++){
                            var messageObject = commons.newMessages[userId][i];
                            messageObjects.push(messageObject);
                        }
                        emitter.emit(commons.EMIT_MESSAGE_EVENT, messageObjects);                                        
                        console.log('Updating messages for ' + userId + ', sent ' + messageObjects.length);
                        //clear the emitted messages
                        commons.newMessages[userId].length = 0;
                        //remove the user from the queue
                        delete commons.usersQueue[userId];
                    }            
                }
            }
            updateQueuedUsers();
        }, 1000);
    })();
}