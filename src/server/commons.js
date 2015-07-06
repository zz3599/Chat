//All common functions and data 
//Used for persisting relations from the data store
var events = require('events');

module.exports = {
		//After this interval users are considered inactive and will no longer trigger retries for message submission. If no listener is attached 
	//to the emitter, just delete the user from all usergroups.
	ACTIVE_MILLIS : 10*60*1000,
	//The emitter event string for a new message
	EMIT_MESSAGE_EVENT : 'newMessage',

	//Active users within the last x minutes. These users will have newly posted messages trigger retries to 
	//emit to their event listener. 
	//userid => timestamp of last active time
	activeUserMap : {},
	// mapping from groupid -> [userIds]
	groupUserMap : {},
	//Mapping from userid -> eventemitter. Only one per user.
	userEmitterMap : {},
	//Mapping user -> [unemitted messages]
	//Preserve messages for active users who may have not been active recently so the next poll immediately fetches all of them
	newMessages : {},
	//Mapping userId -> boolean value (true)
	//Active users who did not have a response attached at the time a message came
	usersQueue : {},

	addUserQueue: function (userId){
	    this.usersQueue[userId] = true;
	},

	pushNewMessage: function (userId, message, timestamp, username){
	    var messageQueue = this.newMessages[userId];
	    var messageObject = {'message': message, 'timestamp': timestamp, 'senderName': username};
	    if(!messageQueue){
	        this.newMessages[userId] = [messageObject];
	    } else {
	        messageQueue.push(messageObject);;
	    }
	},

	clearMessages: function (userId){
	    delete this.newMessages[userId];
	},

	setActiveUser: function (userId){
	    this.activeUserMap[userId] = {
	        lastActive: new Date().getTime(), // when was user last active
	    } ;
	    return this.activeUserMap[userId];
	},

	removeActiveUser: function (userId){
	    if(userId in this.activeUserMap){
	    	delete this.activeUserMap[userId];    
	    }	    
	},

	putUserIntoGroup: function (userid, groupid){
	    var userids = this.groupUserMap[groupid];
	    if(userids === undefined){
	        this.groupUserMap[groupid] = [userid];
	    } else if(userids instanceof Array){
	        if(userids.indexOf(userid) === -1){
	            userids.push(userid);
	        }
	    } else {
	        throw "groupUserId map has value of type " + typeof(this.groupUserMap[groupid]);
	    }
	}, 

	getUserEmitter: function (userid){
	    var eventEmitter = this.userEmitterMap[userid];
	    if(eventEmitter === undefined){
	        eventEmitter = new events.EventEmitter();
	        this.userEmitterMap[userid] = eventEmitter;
	    }
	    return eventEmitter; 
	},

	logRow: function (err, rows){
	    for(var i = 0; i < rows.length; i++){
	        var row = rows[i];
	        console.log(row.rowid + ":" + row.message);
	    }
	},

	deepDump: function (o){
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
};