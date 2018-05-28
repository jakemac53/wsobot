module.exports = {
	name: 'start',
	description: 'Starting a White Star match',
	args: true,
	usage: '<opponent>',
	cooldown: 30,
	execute(message, args) {
		message.channel.send({ embed: {
			color: 3447003,
			description: `Good luck on your White Star! ${args[0]}`,
		} });
	},
};