var sqlite = require('sqlite3').verbose();
var db = new sqlite.Database('chatdb', function(){
    db.serialize(function(){
        db.run("PRAGMA foreign_keys=on");
        db.run("DROP TABLE IF EXISTS messages");
        db.run("DROP TABLE IF EXISTS users");
        db.run("DROP TABLE IF EXISTS groups");
        db.run("CREATE TABLE IF NOT EXISTS users " + 
               "(userId INTEGER PRIMARY KEY, " + 
               "userName TEXT UNIQUE, " +
               "password TEXT);");
        db.run("CREATE TABLE IF NOT EXISTS groups " +
               "(groupId INTEGER," +
               "userId INTEGER REFERENCES users(userId)," + 
               "PRIMARY KEY(groupId, userId))");
        db.run("CREATE TABLE IF NOT EXISTS messages " + 
               "(messageId INTEGER PRIMARY KEY, " +
               "senderId INTEGER REFERENCES users(userId)," + 
               "receiverId INTEGER REFERENCES groups(groupId)," + 
               "message TEXT, " + 
               "INTEGER timestamp)");
        db.run("INSERT INTO users(userName, password) VALUES(?, ?), (?, ?)", "brook", "brook", "cody", "cody");
        db.run("INSERT INTO groups(groupId, userId) VALUES(?, ?), (?, ?)", [1,1], [1,2]);
    });
});
// call internal stuff with exports.[func_name]
module.exports = {
    putMessage: function(senderId, receiverId, message, timestamp, callback){
        db.run("INSERT INTO messages VALUES(?, ?, ?, ?, ?)", null, senderId, receiverId, message, timestamp, callback);
    },
    createUser: function(userName, password, callback){
        db.run("INSERT INTO users VALUES(?, ?, ?)", null, userName, password, callback);
    },
    getLastInsertId: function(callback){
        db.run("SELECT last_insert_rowid()", callback);
    },
    getUser: function(userName, password, callback){
        db.all("SELECT userId from users WHERE userName=? and password=?", userName, password, callback);
    },
    getGroupChatHistory: function(groupId, callback){
        db.all("SELECT m.senderId, u.userName as senderName, m.message from messages as m  " + 
            "INNER JOIN users as u on m.senderId=u.userId " + 
            "WHERE m.receiverId=?", groupId, callback);
    },
    getGroupsAndUsers: function(userId, callback){
        db.all("SELECT g.groupId, g.userId from group as g " + 
               "WHERE g.groupId in (SELECT groupId from group WHERE userId=?)", userId, callback); 
    },
    getAllMessages: function(callback){
        db.all("SELECT rowid, message from messages", callback);
    }

};