const { prefix } = require('../config.json');
const msSqlConnector = require('../msSqlConnector');
const TYPES = require('tedious').TYPES;
const util = require('util');

module.exports = {
  findWsForMessage: function(message) {
    const connection = new msSqlConnector.msSqlConnector();
    connection.connect().then(() => {
      new connection.Request('SELECT ws.*, wss.name as StatusName FROM WhiteStar ws INNER JOIN WhiteStarStatus wss ON ws.StatusId = wss.Id WHERE StatusId = 1')
        .onComplete(function(count, datas) {
          var matching = [];
          for (var i = 0; i < datas.length; i++) {
            var data = datas[i];
            var guildRole = message.guild.roles.get(data.RoleId);
            if (!guildRole) continue;
            if (guildRole.members.has(message.author.id)) {
              matching.push(data);
            }
          }

          if (!matching) {
            message.channel.send(`I could not find a White Star for the user ${message.author.name}`);
            connection.close();
            return;
          } else if (matching.length > 1) {
            message.channel.send(`I found multiple White Stars for the user ${message.author.name}`);
            connection.close();
            return;
          }
          return matching[0];
        });
    });
  },
  findWsForRole: function(role) {
  },
}