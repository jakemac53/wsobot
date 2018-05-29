const { num_of_players, prefix } = require('../config.json');
const msSqlConnector = require('../msSqlConnector');
const TYPES = require('tedious').TYPES;
const util = require('util');


module.exports = {
	name: 'create',
	description: 'Create a White Star match',
	args: true,
	usage: '@<ws-role> <num-players> <scan-date>',
	cooldown: 30,
	execute: function(message, args) {
		if (args.length != 3) {
			message.reply(`Expected exactly three arguments to the "${this.name}" command:  ${this.usage}`);
			return;
		}
		if (message.mentions.roles.size != 1 || !args[0].startsWith('<@')) {
			message.reply(`The first argument to "${this.name}" must be a role mention associate this ws with:`);
			return;
		}
		let role = message.mentions.roles.values().next().value;

		const connection = new msSqlConnector.msSqlConnector();

		const numOfPlayersValid = num_of_players.split(',').find(function(element) {
			return element === args[1];
		});

		if (!numOfPlayersValid) {
			return message.channel.send(`Invalid number of players: ${args[1]}\nThese are valid values for number of players: ${num_of_players}`);
		}

		connection.connect().then(() => {
			new connection.Request('SELECT ws.*, wss.name as StatusName FROM WhiteStar ws INNER JOIN WhiteStarStatus wss ON ws.StatusId = wss.Id WHERE Guild = @guild AND RoleId = @role AND StatusId < 3')
				.addParam('guild', TYPES.NVarChar, message.channel.parent.id)
				.addParam('role', TYPES.NVarChar, role.id)
				.onComplete((count, datas) => {
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
						const scanDate = new Date(Date.parse(args[2]));

						if (scanDate !== null && !util.isDate(scanDate)) {
							message.channel.send(`Invalid scan date: ${scanDate}\nExpected usage: \`${prefix} ${this.name} ${this.usage}\``);

							return connection.close();
						}

						message.channel.send({
							embed: {
								color: 3447003,
								description: 'Creating a new white star...',
							}
						}).then((response) => {
							new connection.Request('insert into WhiteStar (StatusId, StatusTimestamp, NumberOfPlayers, Guild, RoleId, ChannelName, ChannelId, Author, MessageId) values(1, @statusTimestamp, @numberOfPlayers, @guild, @role, @channelName, @channelId, @author, @messageId)')
								.addParam('statusTimestamp', TYPES.DateTime, statusTimestamp)
								.addParam('numberOfPlayers', TYPES.Int, numberOfPlayers)
								.addParam('guild', TYPES.NVarChar, message.channel.parent.id)
								.addParam('role', TYPES.NVarChar, role.id)
								.addParam('channelName', TYPES.NVarChar, message.channel.name)
								.addParam('channelId', TYPES.NVarChar, message.channel.id)
								.addParam('author', TYPES.NVarChar, author)
								.addParam('messageId', TYPES.NVarChar, response.id)
								.onComplete(function(count) {
									connection.close();

									const messageContent = 'White Star signup started\nPlease confirm your availability or absence below with either a `👍` or `👎`';
									if (!util.isDate(scanDate)) {
										messageContent += `\nExpected scan date: ${scanDate}`;
									}
									response.edit({
										embed: {
											color: 3447003,
											description: messageContent,
										}
									})
										.then((response) => {
											message.delete();
										})
										.catch((err) => console.error(err));
								})
								.onError(function(err) {
									console.log(err);
								})
								.Run();
						})
							.catch((err) => console.error(err));;
					}
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