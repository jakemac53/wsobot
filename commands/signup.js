const { db_user, db_password, db_server, db_name, num_of_players, prefix } = require('../config.json');
const msSqlConnector = require('../msSqlConnector');
const TYPES = require('tedious').TYPES;
const util = require('util');

module.exports = {
	name: 'signup',
	description: 'Administrating a White Star sign-up sheet',
	args: true,
	guildOnly: true,
	usage: '<start | add | remove | alter | cancel> <number of players | player name | me>',
	execute(message, args) {
		const subcommands = ['start', 'add', 'remove', 'alter', 'cancel'];
		const commandValid = subcommands.find(function(element) {
			return element === args[0];
		});

		if (!commandValid) {
			return message.channel.send(`Unrecognized command for signup: ${args[0]}`);
		}

		const config =
        {
        	userName: db_user,
        	password: db_password,
        	server: db_server,
        	options:
            {
            	database: db_name,
            	encrypt: true,
            	rowCollectionOnRequestDone: true,
            },
        };
		const connection = new msSqlConnector.msSqlConnector(config);

		if (args[0] === 'start') {
			const numOfPlayersValid = num_of_players.split(',').find(function(element) {
				return element === args[1];
			});

			if (!numOfPlayersValid) {
				return message.channel.send(`Invalid number of players: ${args[1]}\nThese are valid values for number of players: ${num_of_players}`);
			}

			connection.connect().then(function() {
				new connection.Request('SELECT ws.*, wss.name as StatusName FROM WhiteStar ws INNER JOIN WhiteStarStatus wss ON ws.StatusId = wss.Id WHERE Guild = @guild AND StatusId < 3')
					.addParam('guild', TYPES.NVarChar, message.channel.parent.name)
					.onComplete(function(count, datas) {
						if (count > 0) {
							const status = datas[0].StatusName;
							if (status === 'In Progress') {
								const opponent = datas[0].Opponent;
								message.channel.send(`I cannot start a new White Start match until the current one against ${opponent} is ended.`);

								return connection.close();
							}
							else {
								const channel = datas[0].ChannelName;
								const author = datas[0].Author;
								message.channel.send(`${author} already started a signup message in the "${channel}" channel.`);

								return connection.close();
							}
						}
						else {
							const statusTimestamp = new Date(Date.now());
							const numberOfPlayers = args[1];
                            const author = message.author.username;
                            const scanDate = args[2];

                            if (scanDate !== null && !util.types.isDate(scanDate)) {
                                message.channel.send(`Invalid scan date: ${scanDate}\nExpected usage: ``${prefix}signup start <number of players> <scan date>```);

                                return connection.close();
                            }

                            const messageContent = 'White Star signup started\nPlease confirm your availability or absence below';
                            if (!util.types.isDate(scanDate)) {
                                messageContent += `\nExpected scan date: ${scanDate}`;
                            }
							message.channel.send({ embed: {
								color: 3447003,
								description: messageContent,
							} })
								.then((response) => {
									response.react('👍').then(() => response.react('👎'));
									new connection.Request('insert into WhiteStar (StatusId, StatusTimestamp, NumberOfPlayers, Guild, ChannelName, ChannelId, Author, MessageId) values(1, @statusTimestamp, @numberOfPlayers, @guild, @channelName, @channelId, @author, @messageId)')
										.addParam('statusTimestamp', TYPES.DateTime, statusTimestamp)
										.addParam('numberOfPlayers', TYPES.Int, numberOfPlayers)
										.addParam('guild', TYPES.NVarChar, message.channel.parent.name)
										.addParam('channelName', TYPES.NVarChar, message.channel.name)
										.addParam('channelId', TYPES.NVarChar, message.channel.id)
										.addParam('author', TYPES.NVarChar, author)
										.addParam('messageId', TYPES.NVarChar, response.id)
										.onComplete(function(count) {
											message.delete();
											connection.close();
										})
										.onError(function(err) {
											console.log(err);
										})
										.Run();
								})
								.catch((err) => console.error(err));
						}
					})
					.onError(function(err) {
						console.log(err);
					})
					.Run();
			}).catch(function(err) {
				console.log(err);
			});
		}
		else if (args[0] === 'cancel') {
			connection.connect().then(function() {
				new connection.Request('SELECT ws.*, wss.name as StatusName FROM WhiteStar ws INNER JOIN WhiteStarStatus wss ON ws.StatusId = wss.Id WHERE Guild = @guild AND StatusId = 1')
					.addParam('guild', TYPES.NVarChar, message.channel.parent.name)
					.onComplete(function(count, datas) {
						if (!count) {
							message.channel.send('I could not find a White Star signup to cancel');

							connection.close();
						}
						else {
							message.channel.send(`Are you sure you want to cancel the signup started on ${datas[0].StatusTimestamp}?\nYou have 15 seconds to reply.`)
								.then(confirm => {
									confirm.react('👍').then(() => confirm.react('👎'));
									const filter = (reaction, user) => {
										return ['👍', '👎'].includes(reaction.emoji.name) && user.id === message.author.id;
									};

									confirm.awaitReactions(filter, { max: 1, time: 15000, errors: ['time'] })
										.then(collected => {
											const reaction = collected.first();

											if (reaction.emoji.name === '👍') {
												const signupId = datas[0].Id;
												new connection.Request('UPDATE WhiteStar SET StatusId = 5 WHERE Id = @id')
													.addParam('id', TYPES.Int, signupId)
													.onComplete(function(count) {
														const signupChannel = message.guild.channels.get(datas[0].ChannelId);
														signupChannel.fetchMessage(datas[0].MessageId)
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
						}
					})
					.onError(function(err) {
						console.log(err);
					})
					.Run();
			}).catch(function(err) {
				console.log(err);
			});
		}
	},
};