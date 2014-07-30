var sqlite = require('sqlite3').verbose();
var db = new sqlite.Database('chatdb', function(){
    db.serialize(function(){
        db.run("PRAGMA foreign_keys=on");
        db.run("DROP TABLE IF EXISTS messages");
        db.run("DROP TABLE IF EXISTS users");
        db.run("CREATE TABLE IF NOT EXISTS users (userId INTEGER PRIMARY KEY, userName TEXT UNIQUE);");
        db.run("CREATE TABLE IF NOT EXISTS messages (messageId INTEGER PRIMARY KEY, senderId INTEGER REFERENCES users(userId), \
            receiverId INTEGER REFERENCES users(userId), message TEXT)");
        db.run("INSERT INTO users VALUES(?, ?)", null, "brook");
        db.run("INSERT INTO users VALUES(?, ?)", null, "thomas");
    });
});
// call internal stuff with exports.[func_name]
module.exports = {
    putMessage: function(senderId, receiverId, message, callback){
        db.run("INSERT INTO messages VALUES(?, ?, ?, ?)", null, senderId, receiverId, message, callback);
    },
    createUser: function(userName, callback){
        db.run("INSERT INTO users VALUES(?, ?)", userName, callback);
    },
    getChatHistory: function(userId, senderId, callback){
        db.all("SELECT m.senderId, u.userName, m.message from messages as m  \
            INNER JOIN users as u on m.senderId=u.userId \
            WHERE m.receiverId IN (?, ?) and m.senderId IN (?, ?)", userId, senderId, userId, senderId, callback);
    },
    getAllMessages: function(callback){
        db.all("SELECT rowid, message from messages", callback);
    }

};