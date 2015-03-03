var sqlite = require('sqlite3').verbose();
var db = new sqlite.Database('chatdb', function(){
    db.serialize(function(){
        db.run("PRAGMA foreign_keys=on");
        db.run("DROP TABLE IF EXISTS messages");
        db.run("DROP TABLE IF EXISTS users");
        db.run("CREATE TABLE IF NOT EXISTS users (userId INTEGER PRIMARY KEY, userName TEXT UNIQUE, password TEXT);");
        db.run("CREATE TABLE IF NOT EXISTS messages (messageId INTEGER PRIMARY KEY, \
            senderId INTEGER REFERENCES users(userId),                              \
            receiverId INTEGER REFERENCES users(userId), message TEXT, INTEGER timestamp)");
        db.run("INSERT INTO users VALUES(?, ?, ?)", null, "brook", "brook");
        db.run("INSERT INTO users VALUES(?, ?, ?)", null, "thomas", "thomas");
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
    getPairChatHistory: function(userId, senderId, callback){
        db.all("SELECT m.senderId, u.userName as senderName, m.message from messages as m  \
            INNER JOIN users as u on m.senderId=u.userId \
            WHERE m.receiverId IN (?, ?) and m.senderId IN (?, ?)", userId, senderId, userId, senderId, callback);
    },
    getUserChatHistory: function(userId, callback){
        db.all("SELECT m.senderId, u.userName as senderName, u2.userName as receiverName, m.message from messages as m  \
            LEFT JOIN users as u on m.senderId=u.userId \
            LEFT JOIN users as u2 on m.receiverId=u2.userId \
            WHERE m.receiverId=? or m.senderId=?", [userId, userId], callback);
    },
    getAllMessages: function(callback){
        db.all("SELECT rowid, message from messages", callback);
    }

};