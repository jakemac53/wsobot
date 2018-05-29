const { prefix } = require('../config.json');
const msSqlConnector = require('../msSqlConnector');
const TYPES = require('tedious').TYPES;
const util = require('util');

module.exports = {
  name: 'cancel',
  description: 'Cancels an ongoing ws',
  args: true,
  guildOnly: true,
  usage: '<@role-to-cancel>',
  execute(message, args) {
    if (message.mentions.roles.size != 1) {
      message.reply(`The first argument to "${this.name}" must be a role mention associate this ws with:`);
      return;
    }
    var role = message.mentions.roles.values().next().value;
    const connection = new msSqlConnector.msSqlConnector();

    connection.connect().then(() => {
      new connection.Request('SELECT ws.*, wss.name as StatusName FROM WhiteStar ws INNER JOIN WhiteStarStatus wss ON ws.StatusId = wss.Id WHERE RoleId = @role AND StatusId = 1')
        .addParam('role', TYPES.NVarChar, role.id)
        .onComplete(function(count, datas) {
          if (!count) {
            message.channel.send(`I could not find a White Star to cancel with the \`${role.name}\` role.`);
            connection.close();
            return;
          } else if (count > 1) {
            message.channel.send(`Error: I found multiple White Stars matching the \`${role.name}\` role`);
            connection.close();
            return;
          }
          var ws = datas[0];
          message.channel.send(`Are you sure you want to cancel the signup started on ${ws.StatusTimestamp}?\nYou have 15 seconds to reply.`)
            .then(confirm => {
              confirm.react('👍').then(() => confirm.react('👎'));
              const filter = (reaction, user) => {
                return ['👍', '👎'].includes(reaction.emoji.name) && user.id === message.author.id;
              };

              confirm.awaitReactions(filter, { max: 1, time: 15000, errors: ['time'] })
                .then(collected => {
                  const reaction = collected.first();

                  if (reaction.emoji.name === '👍') {
                    const signupId = ws.Id;
                    new connection.Request('UPDATE WhiteStar SET StatusId = 5 WHERE Id = @id')
                      .addParam('id', TYPES.Int, signupId)
                      .onComplete(function(count) {
                        const signupChannel = message.guild.channels.get(ws.ChannelId);
                        signupChannel.fetchMessage(ws.MessageId)
                          .then(signupMessage => signupMessage.delete())
                          .catch(console.error);
                        confirm.delete();
                        message.delete();

                        connection.close();
                      })
                      .onError(function(err) {
                        console.log(err);
                      })
                      .Run();
                  }
                  else {
                    confirm.delete();
                    message.delete();

                    connection.close();
                  }
                })
                .catch(collected => {
                  confirm.delete();
                  message.delete();

                  connection.close();
                });
            });
        })
        .onError(function(err) {
          console.log(err);
        })
        .Run();
    }).catch(function(err) {
      console.log(err);
    });
  },
};
