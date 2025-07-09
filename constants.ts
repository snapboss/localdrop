// A public signaling server for demonstration purposes. 
// For a production app, you should host your own.
export const SIGNALING_SERVER_URL = 'wss://0.peerjs.com:443';

// Public STUN servers provided by Google.
export const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // You can add TURN server credentials here for NAT traversal
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'user',
    //   credential: 'password'
    // }
  ],
};

// Simple list of adjectives and nouns to generate random peer names.
export const ADJECTIVES = [
    'Agile', 'Brave', 'Calm', 'Daring', 'Eager', 'Fancy', 'Gentle', 'Happy',
    'Jolly', 'Kind', 'Lively', 'Merry', 'Nice', 'Proud', 'Silly', 'Tricky',
    'Witty', 'Zany'
];
export const NOUNS = [
    'Aardvark', 'Badger', 'Cat', 'Dolphin', 'Elephant', 'Fox', 'Giraffe',
    'Hippo', 'Iguana', 'Jaguar', 'Koala', 'Lemur', 'Meerkat', 'Narwhal',
    'Ocelot', 'Panda', 'Quokka', 'Rabbit', 'Sloth', 'Tiger', 'Unicorn',
    'Vulture', 'Walrus', 'Yak', 'Zebra'
];

export const LOBBY_ROOM_ID = 'droppeer-public-lobby';
