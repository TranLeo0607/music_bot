module.exports = {
    name: 'help',
    aliases: [],
    cooldown: 0,
    description: 'Help Commands',
    async execute(message, args, cmd, client, Discord){
        //If the user has used the play command
        if (cmd === 'help'){
            message.channel.send('Please select an option from the help menu.');
        }
    }
    
}