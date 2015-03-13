var sqlite = require('sqlite3').verbose();
var db = new sqlite.Database('chatdb', function(){
    db.serialize(function(){
        db.run("PRAGMA foreign_keys=on");        
        db.run("DROP TABLE IF EXISTS messages");
        db.run("DROP TABLE IF EXISTS userGroups");
        db.run("DROP TABLE IF EXISTS users");
        db.run("DROP TABLE IF EXISTS groups");        
        db.run("CREATE TABLE IF NOT EXISTS users " + 
               "(userId INTEGER PRIMARY KEY, " + 
               "userName TEXT UNIQUE, " +
               "password TEXT);");
        db.run("CREATE TABLE IF NOT EXISTS groups " + 
               "(groupId INTEGER PRIMARY KEY, " + 
                "groupName TEXT)");
        db.run("CREATE TABLE IF NOT EXISTS userGroups " +
               "(groupId INTEGER REFERENCES groups(groupId)," +
               "userId INTEGER REFERENCES users(userId)," + 
               "PRIMARY KEY(groupId, userId))");
        db.run("CREATE TABLE IF NOT EXISTS messages " + 
               "(messageId INTEGER PRIMARY KEY, " +
               "senderId INTEGER REFERENCES users(userId)," + 
               "receiverId INTEGER REFERENCES groups(groupId)," + //the receiver of a message is always a group of >=2 people
               "message TEXT, " + 
               "INTEGER timestamp)");
        //3 users, 4 groups - abc, ab, bc, ac
        db.run("INSERT INTO users(userName, password) VALUES(?, ?), (?, ?), (?, ?)", "auser", "auser", "buser", "buser", "cuser", "buser");
        db.run("INSERT INTO groups(groupId, groupName) VALUES(?, ?), (?, ?), (?, ?), (?,?)", null, "abc", null, "ab", null, "bc", null, "ac");
        db.run("INSERT INTO userGroups VALUES(?, ?), (?, ?), (?, ?)", [1,1, 1, 2, 1,3]);
        db.run("INSERT INTO userGroups VALUES(?, ?), (?, ?)", [2,1, 2,2]);
        db.run("INSERT INTO userGroups VALUES(?, ?), (?, ?)", [3,2,3,3]);        
        db.run("INSERT INTO userGroups VALUES(?, ?), (?, ?)", [4,1,4,3]);                
    });
});

// call internal stuff with exports.[func_name]
module.exports = {
    //groups
    getUsergroups: function(userId, callback){
        db.all("SELECT g.groupId, g.userId, u.userName FROM " + 
        "userGroups as g INNER JOIN users as u ON " + 
        "g.userId=u.userId WHERE g.groupId in " + 
        "(SELECT groupId from userGroups where userId=?) ORDER BY g.groupId", userId, callback);
    },    
    createGroup: function(userIdArray, callback){
        if(Array.isArray(userIdArray)){
            var query = "INSERT INTO userGroups VALUES (" + 
              Array.apply(null, new Array(userIdArray.length))
                .map(function(){return '?';}).join(',') +
              ")";
            db.run(query, userIdArray, callback);
        } else {
            callback(null);
        }
    },
    //messages
    putMessage: function(senderId, receiverId, message, timestamp, callback){
        db.run("INSERT INTO messages VALUES(?, ?, ?, ?, ?)", null, senderId, receiverId, message, timestamp, callback);
    },
    getGrouplistChatHistory: function(groupIds, callback){
        //should be a list of group ids 
        var argList = '(' + Array.apply(null, new Array(groupIds.length)).
          map(function(){ return '?';}).join(',') + ')';
        db.all("SELECT m.senderId, u.userName as senderName, m.receiverId, m.message " +
            "FROM messages as m  " + 
            "INNER JOIN users as u on m.senderId=u.userId " + 
            "WHERE m.receiverId in " + argList , groupIds, callback);
        
    },
    getGroupChatHistory: function(groupId, callback){
        db.all("SELECT m.senderId, u.userName as senderName, m.message from messages as m  " + 
            "INNER JOIN users as u on m.senderId=u.userId " + 
            "WHERE m.receiverId=?", groupId, callback);
    },
    getAllMessages: function(callback){
        db.all("SELECT m.messageId, m.message, u.userName as senderName, u2.userName as receiverName from messages as m " + 
            "INNER JOIN users u on u.userId=m.senderId " + 
            "INNER JOIN users u2 on u2.userId=m.receiverid", callback);
    },
    //user calls
    createUser: function(userName, password, callback){
        db.run("INSERT INTO users VALUES(?, ?, ?)", null, userName, password, callback);
    },
    getUser: function(userName, password, callback){
        db.all("SELECT userId from users WHERE userName=? and password=?", userName, password, callback);
    },
    //misc.
    getLastInsertId: function(callback){
        db.run("SELECT last_insert_rowid()", callback);
    }

};