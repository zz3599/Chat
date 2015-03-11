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
        db.run("INSERT INTO users(userName, password) VALUES(?, ?), (?, ?)", "brook", "brook", "cody", "cody");
        db.run("INSERT INTO groups(groupId, groupName) VALUES(?, ?)", null, "brookandcody");
        db.run("INSERT INTO userGroups VALUES(?, ?)", [1,1]);
        db.run("INSERT INTO userGroups VALUES(?, ?)", [1,2]);
    });
});
// call internal stuff with exports.[func_name]
module.exports = {
    //groups
    getUsergroups: function(userId, callback){
        db.all("SELECT userGroups.groupId, userGroups.userId, users.userName FROM " + 
        "userGroups INNER JOIN users ON " + 
        "userGroups.userId=users.userId WHERE userGroups.userId=?", userId, callback);
    },    
    createGroup: function(userIdArray, callback){
        if(Array.isArray(userIdArray)){
            var query = "INSERT INTO userGroups VALUES (";
            for(var i = 0; i < userIdArray.length-1; i++){
              query += "?";
            }
            query += "?)";
            db.run(query, userIdArray, callback);
        } else {
            callback(null);
        }
    },
    //messages
    putMessage: function(senderId, receiverId, message, timestamp, callback){
        db.run("INSERT INTO messages VALUES(?, ?, ?, ?, ?)", null, senderId, receiverId, message, timestamp, callback);
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