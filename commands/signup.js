const { num_of_players, prefix } = require('../config.json');
const msSqlConnector = require('../msSqlConnector');
const TYPES = require('tedious').TYPES;
const util = require('util');

module.exports = {
	name: 'signup',
	description: 'Administrating a White Star sign-up sheet',
	args: true,
	guildOnly: true,
	usage: '<add | remove | alter | cancel> <player name | me>',
	execute(message, args) {
		const subcommands = ['start', 'add', 'remove', 'alter', 'cancel'];
		const commandValid = subcommands.find(function(element) {
			return element === args[0];
		});

		if (!commandValid) {
			return message.channel.send(`Unrecognized command for signup: ${args[0]}`);
		}

		const connection = new msSqlConnector.msSqlConnector();

		// if (args[0] === 'cancel') {
		// }
	},
};