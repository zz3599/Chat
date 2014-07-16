var sql = require('sql');
module.exports = {
	messagesTable: sql.define({
        name:    'messages',
        columns: [
            {
              name:       "id",
              dataType:   "int",
              primaryKey: true
            },
            {
              name:     "message",
              dataType: "text"
            }
        ]
    })
};