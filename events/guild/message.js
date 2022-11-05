require('dotenv').config();

const cooldowns = new Map();

module.exports = (client, Discord, message) => {
    const prefix = process.env.PREFIX;
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const cmd = args.shift().toLowerCase();
    const command = client.commands.get(cmd) || client.commands.find(value => value.aliases.includes(cmd));
    if (command != undefined || command != null) {
        if (!cooldowns.has(command.name)) {
            cooldowns.set(command.name, new Discord.Collection());


            const current_time = Date.now();
            const timestamps = cooldowns.get(command.name);
            const cooldown_amount = (command.cooldown) * 1000;

            if (timestamps.has(message.author.id)) {
                const expiration_time = timestamps.get(message.author.id) + cooldown_amount;
                if (current_time < expiration_time) {
                    const time_left = (expiration_time - current_time) / 1000;
                    return message.reply(`Current Time Remaining: ${time_left.toFixed(1)} for ${command.name}`)
                }
            }

            timestamps.set(message.author.id, current_time)
            setTimeout(() => timestamps.delete(message.author.id), cooldown_amount)
        }
    }
    try {
        command.execute(message, args, cmd, client, Discord)
    } catch (err) {
        message.reply("[Error] Could Not Execute Command.")
        console.log(err)
    }
}