const ytdl = require('ytdl-core');
const ytpl = require('ytpl')
const ytSearch = require('yt-search');
var pathToFfmpeg = require('ffmpeg-static');

//Global queue for your bot. Every server will have a key and value pair in this map. { guild.id, queue_constructor{} }
const queue = new Map();

module.exports = {
    name: 'play',
    aliases: ['skip', 'stop'],
    cooldown: 0,
    description: 'Play Commands',
    async execute(message, args, cmd, client, Discord) {
        console.log("WTF")
        //Checking for the voicechannel and permissions (you can add more permissions if you like).
        const voice_channel = message.member.voice.channel;
        if (!voice_channel) return message.channel.send('You need to be in a channel to execute this command!');
        const permissions = voice_channel.permissionsFor(message.client.user);
        if (!permissions.has('CONNECT')) return message.channel.send('You dont have the correct permissins');
        if (!permissions.has('SPEAK')) return message.channel.send('You dont have the correct permissins');

        //This is our server queue. We are getting this server queue from the global queue.
        const server_queue = queue.get(message.guild.id);

        //If the user has used the play command
        if (cmd === 'play') {
            try {
            if (!args.length) return message.channel.send('[Error] Missing Link');
            let song = {};
            let song_playlist = [];
            //If the first argument is a link. Set the song object to have two keys. Title and URl.
            if (args[0].includes("&list=")){
                const playlist = await ytpl(args[0])
                console.log(playlist.items.length)
                for(let i = 0, m = playlist.items.length; i < m; i++){
                    song_playlist.push({ title: playlist.items[i].title, url: playlist.items[i].url })
                }
                console.log("SONG PLAYLIST", song_playlist)

            } else {
                if (ytdl.validateURL(args[0])) {
                    const song_info = await ytdl.getInfo(args[0]);
                    // console.log("SONG INFO", song_info)
                    song = { title: song_info.videoDetails.title, url: song_info.videoDetails.video_url }
                    // console.log("SONG", song)

                } else {
                    //If there was no link, we use keywords to search for a video. Set the song object to have two keys. Title and URl.
                    const video_finder = async (query) => {
                        const video_result = await ytSearch(query);
                        return (video_result.videos.length > 1) ? video_result.videos[0] : null;
                    }

                    const video = await video_finder(args.join(' '));
                    if (video) {
                        song = { title: video.title, url: video.url }
                    } else {
                        message.channel.send(`[Error] Couldn't Find video.`);
                    }
                }
            }

            // Check if bot is connected to voice chat.
            // console.log(client.voice.connections.size)
            //If the server queue does not exist (which doesn't for the first video queued) then create a constructor to be added to our global queue.
            if (!server_queue || client.voice.connections.size === 0) {
                const queue_constructor = {
                    voice_channel: voice_channel,
                    text_channel: message.channel,
                    connection: null,
                    songs: []
                }

                //Add our key and value pair into the global queue. We then use this to get our server queue.
                queue.set(message.guild.id, queue_constructor);
                if(args[0].includes('&list') && song_playlist.length > 0){
                    queue_constructor.songs = song_playlist
                    console.log(song_playlist)
                } else {
                    queue_constructor.songs.push(song);
                }

                //Establish a connection and play the song with the video_player function.
                try {
                    const connection = await voice_channel.join();
                    queue_constructor.connection = connection;
                    video_player(message.guild, queue_constructor.songs[0]);
                } catch (err) {
                    queue.delete(message.guild.id);
                    message.channel.send(`[Error] Couldn't connect to VC`);
                    throw err;
                }
            } else {
                server_queue.songs.push(song);
                return message.channel.send(` **${song.title}** added to queue!`);
            } }
            catch(error){
                console.log(error)
                if(error.statusCode == 401){
                    return message.channel.send(` **Uh Oh!** Seems we don't have permission to play this video.`);
                } else {
                    return message.channel.send(` Yikes, something went wrong.`);
                }
            }
        }

        else if (cmd === 'skip') skip_song(message, server_queue);
        else if (cmd === 'stop') stop_song(message, server_queue);
        else if (cmd === 'queue') check_queue(message, server_queue);
    }

}

const video_player = async (guild, song) => {
    const song_queue = queue.get(guild.id);
    //If no song is left in the server queue. Leave the voice channel and delete the key and value pair from the global queue.
    if (!song) {
        song_queue.voice_channel.leave();
        queue.delete(guild.id);
        return;
    }
    const stream = ytdl(song.url, { filter: 'audioonly', quality: 'highest', dlChuckSize: 0, highWaterMark: 1 << 25 });
    song_queue.connection.play(stream, { seek: 0, volume: 0.5 })
        .on('finish', () => {
            console.log(`Played Song ${song.url}`);
            song_queue.songs.shift();
            video_player(guild, song_queue.songs[0]);
        });
    await song_queue.text_channel.send(`Now playing **${song.title}**`)
}

const skip_song = (message, server_queue) => {
    if (!message.member.voice.channel) return message.channel.send('You need to be in a channel to execute this command!');
    if (!server_queue) {
        return message.channel.send(`There are no songs in queue`);
    }
    try {
        server_queue.connection.dispatcher.end();
    } catch (err) {
        console.log("SKIP:", err)
    }
}

const stop_song = (message, server_queue) => {
    if (!message.member.voice.channel) return message.channel.send('You need to be in a channel to execute this command!');
    server_queue.songs = [];
    try {
        server_queue.connection.dispatcher.end();
    } catch (err) {
        console.log("STOP:", err)
    }
}

const check_queue = (message, server_queue) => {
    if (!message.member.voice.channel) return message.channel.send('You need to be in a channel to execute this command!');
    if (!server_queue) {
        return message.channel.send(`There are no songs in queue`);
    }
    try {
        message.channel.send(`Lol I didn't make the queue -Leo`)
    } catch (err) {
        console.log("SKIP:", err)
    }
}