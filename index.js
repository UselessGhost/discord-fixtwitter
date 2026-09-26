import { Client, GatewayIntentBits, Events, MessageFlags } from "discord.js";

const client = new Client( {
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
    ]
} );

const messages = {};

const TWITTER_PATTERN = /^https?\:\/\/twitter.com\/.+\/status\/.+$/g;
const BSKY_PATTERN = /^https?\:\/\/bsky.app\/profile\/.+\/post\/.+$/g;

function fixLinks( message ) {
    const words = message.split( " " );
    const links = [];

    for ( let word of words ) {
        // hack
        word = word.replace( "x.com", "twitter.com" );

        if ( process.env.FXTWITTER ) {
            const twt_match = word.match( TWITTER_PATTERN );

            if ( twt_match )
                links.push( twt_match[ 0 ].replace( "twitter.com", process.env.FXTWITTER ) );    
        }

        if ( process.env.BSKYX ) {
            const bsky_match = word.match( BSKY_PATTERN );

            if ( bsky_match )
                links.push( bsky_match[ 0 ].replace( "bsky.app", process.env.BSKYX ) );
        }
    }

    return links.length ? links.join( " " ) : null;
}

client.once( Events.ClientReady, c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);
} );

client.on( Events.MessageCreate, async m => {
    if ( m.author.bot ) return;

    const message = fixLinks( m.content );

    if ( message ) {
        m.suppressEmbeds( true );

        const reply = await m.reply( {
            content: message,
            allowedMentions: {
                repliedUser: false
            }
        } );

        messages[ m.id ] = reply;

        setTimeout( () => {
            m.suppressEmbeds( true );
        }, 1000 )
    }
} );

client.on( Events.MessageUpdate, async ( _, m ) => {
    if ( m.author.bot || messages[ m.id ] === undefined ) return;

    if ( !m.flags.has( MessageFlags.SuppressEmbeds ) )
        m.suppressEmbeds( true );

    const message = fixLinks( m.content );

    if ( message && message !== messages[ m.id ].content ) {
        const reply = await messages[ m.id ].edit( {
            content: message,
            allowedMentions: {
                repliedUser: false
            }
        } );

        messages[ m.id ] = reply;
    }
} );

client.on( Events.MessageDelete, async m => {
    if ( m.author.bot || messages[ m.id ] === undefined ) return;

    messages[ m.id ].delete();
    delete messages[ m.id ];
} );

client.login( process.env.DISCORD_TOKEN );
