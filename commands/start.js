module.exports = {
	name: 'start',
	description: 'Starting a White Star match',
	args: true,
	usage: '@<ws-role> <opponent>',
	cooldown: 30,
	execute(message, args) {
		if (args.length != 2) {
			message.reply('Expected exactly two arguments to the "start" command: ' + this.usage);
			return;
		}
		if (message.mentions.roles.size != 1 || !args[0].startsWith('<@')) {
			message.reply('The first argument to "start" must be a role mention associate this ws with: ' + this.usage);
			return;
		}
		let role = message.mentions.roles.values().next().value;
		let opponent = args[1];

		// TODO: save this info in the database?

		message.channel.send({
			embed: {
				color: 3447003,
				description: 'Good luck on your White Star against `' + opponent + '` members of <@&' + role.id + '>!\n',
			}
		});
	},
};