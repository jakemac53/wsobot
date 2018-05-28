const { prefix } = require('../config.json');

module.exports = {
	name: 'help',
	description: 'List all of my commands or info about a specific command',
	args: false,
	aliases: ['?', 'commands'],
	cooldown: 5,
	execute(message, args) {
		const { commands } = message.client;
		const data = [];

		if (!args.length) {
			data.push('```Here are all of my commands:');
			data.push(commands.map(command => command.name).join(', '));
			data.push('```For more information about specific commands, type ``!ws help <commandname>``');
		}
		else {
			if (!commands.has(args[0])) {
				return message.reply(`"${args[0]}" is not a valid command.`);
			}

			const command = commands.get(args[0]);

			data.push(`**Name:** ${command.name}`);
			if (command.description) data.push(`**Description:** ${command.description}`);
			if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
			if (command.usage) data.push(`**Usage:** ${prefix}${command.name} ${command.usage}`);

			data.push(`**Cooldown:** ${command.cooldown || 3} second(s)`);
		}

		message.channel.send(data, { split: true });
	},
};