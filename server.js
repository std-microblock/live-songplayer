const options = {
    roomid: 3106704,
    source: require("./sources/netease.js"),
    port: 10103, //WebSocket Port=port+1
    lyricBlacklist:{
        enabled:false,
        include:[
            "填写你要禁用的歌曲包含的歌词",
        ]
    }
}



const util = require('util')
const fs = require('fs')
const streamPipeline = util.promisify(require('stream').pipeline)

const fetch = require('node-fetch')

function getTempUrl(id) {
    if (fs.existsSync(__dirname + "/www/tmp/" + id+".mp3")) return `/tmp/${id}.mp3`
    else return false
}

async function downloadToTemp(url = "", id) {
    if (getTempUrl(id)) return getTempUrl(id)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`unexpected response ${response.statusText}`)
    id = id.replace(/[:,\\,\/]/g, "_")
    fs.writeFileSync(__dirname + "/www/tmp/" + id+".mp3", "")
    await streamPipeline(response.body, fs.createWriteStream(__dirname + "/www/tmp/" + id+".mp3"))
    return `/tmp/${id}.mp3`
}





let store = {
    blacklist: []
}
try {
    store = JSON.parse(require("fs").readFileSync(__dirname + "/store.json").toString())
} catch { }
let Koa = require("koa");
let app = new Koa();
const WebSocket = require('ws');

app.use(require('koa-static')(__dirname + '/www/'));
app.listen(options.port);

const wss = new WebSocket.Server({ port: options.port + 1 });
let clientsList = []

function wsEmit(msg) {
    for (let i of clientsList) {
        i.send(JSON.stringify(msg));
    }
}

async function wsMsg(msg) {
    console.log(msg)
    try {
        msg = JSON.parse(msg);
        switch (msg.type) {
            case "pl-shift": {
                playQueue.shift()
                wsEmit({
                    type: "playlist",
                    playlist: playQueue
                })

                // for (let i = 0; i < 2; i++)
                //     if (playQueue[i])
                //         playQueue[i].source.getSongURL().then(url => {
                //             console.log(url)
                //             wsEmit({
                //                 type: "url",
                //                 id: i,
                //                 url
                //             })
                //         })

                break;
            }
            case "fake-msg": {
                fakeMsg(msg.msg)
                break;
            }
            case "empty": {
                let song = await options.source.random()
                let detail=await song.getSongDetail()
                let offline_url = await getTempUrl(detail.id);
                if (!offline_url) {
                    let ol_url = (await song.getSongURL());
                    offline_url = await downloadToTemp(ol_url, detail.id)
                }
                let s = {
                    type: "empty",
                    song: {
                        sender: "System"
                        , detail: (await song.getSongDetail()),
                        url: offline_url, source: song
                    }
                }
                wsEmit(s);
                break;
            }
            case "login":{
                let ret=await options.source.login();
                wsEmit({type:"login",data:ret})
            }
        }
    } catch (e) { }
}

wss.on('connection', function connection(ws) {
    clientsList.push(ws)
    wsEmit({
        type: "playlist",
        playlist: playQueue
    })
    ws.on('message', wsMsg);

    //   ws.send('something');
});

// !(async function(){
//     await options.source.search(34144942)
// })()

const { LiveWS, LiveTCP, KeepLiveWS, KeepLiveTCP } = require('bilibili-live-ws')
const live = new LiveTCP(options.roomid)
let playQueue = [];

let process = async (data) => {
    // try{
    if (data.cmd != "DANMU_MSG") return;
    let msg = data.info[1], sender = data.info[2][1];
    // if (!msg.startsWith("!")) return;
    let cmdData = msg/*.slice(1)*/.split(" ");
    console.log(`[${new Date().toDateString()}] Detected command from "${sender}":\n    cmd:"${cmdData[0]}"\n    args:[${cmdData.slice(1)}]`)

    switch (cmdData[0].toLowerCase()) {
        case '点歌':
        case 'pl':
        case 'play': {
            let song = await options.source.search(cmdData.slice(1).join(" "));
            let detail = await song.getSongDetail();
            if(options.lyricBlacklist.enabled){
                let lyric=await song.getLyric();
                if(options.lyricBlacklist.include.reduce((pre,cur)=>{
                    if(pre)return pre;
                    return lyric.includes(cur);
                },false)){
                    wsEmit({
                        type: "message",
                        msg: `${sender} 点歌失败：歌词在黑名单中`
                    })
                    return;
                }
            }
            if (!detail.playable) {
                wsEmit({
                    type: "message",
                    msg: `${sender} 点歌失败：歌曲不可播放`
                })
                return;
            };
            if (store.blacklist.includes(detail.name)) {
                wsEmit({
                    type: "message",
                    msg: `${sender} 点歌失败：歌曲在黑名单中`
                })
                return;
            };
            song = await addSong(song, sender, detail);
            break;
        }
        case '删除':
        case 'del':
        case 'delete': {
            let song = playQueue[+cmdData[1] - 1];
            if (song && (song.sender == sender || sender == "Console")) {
                playQueue.splice(+cmdData[1] - 1, 1)
                wsEmit({
                    type: "playlist",
                    playlist: playQueue
                })
                wsEmit({
                    type: "message",
                    msg: `${song.sender} 删歌成功！`
                })
            }
            break;
        }
        case 'pause': {
            wsEmit({
                type: "pause"
            })
            break;
        }
        case 'continue': {
            wsEmit({
                type: "continue"
            })
            break;
        }
        case 'jmp':
        case 'jump': {
            if (sender != "Console") return;
            wsEmit({
                type: "jump"
            })
            break;
        }
        case 'bl':
        case 'blacklist': {
            if (sender != "Console") return;

            function addBlacklist(name) {
                store.blacklist.push(name)
                console.log(`歌曲名 "${name}" 加黑成功！`)
                playQueue = playQueue.reduce((pre, cur) => {
                    if (cur.detail.name != name) pre.push(cur);
                    return pre;
                }, [])
                wsEmit({
                    type: "playlist",
                    playlist: playQueue
                })
            }

            if (cmdData[1] == "add") {
                addBlacklist(cmdData.slice(2).join(" "))
            } else if (cmdData[1] == "remove") {
                let name = cmdData.slice(2).join(" ")
                store.blacklist = store.blacklist.reduce((pre, cur) => {
                    if (cur != name) pre.push(cur);
                    return pre;
                }, [])
                console.log(`歌曲名 "${name}" 去黑成功！`)
            } else {
                addBlacklist(cmdData.slice(1).join(" "))
            }
            break;
        }
        default: {
            console.log(`[${new Date().toDateString()}] Invalid command "${cmdData[0]}"`);
            break;
        }
    }

    //}catch(err){
    //console.error(`[ERR] [${new Date().toDateString()}] data:\n${JSON.stringify(data)}\n\nerr:\n${err}`);
    // }
}

setInterval(() => {
    require("fs").writeFileSync(__dirname + "/store.json", JSON.stringify(store))
}, 100)

live.on('msg', process)




let input = require('input');

function fakeMsg(msg) {
    process({
        cmd: 'DANMU_MSG',
        info: [
            [
                0, 1,
                25, 16777215,
                1627491025556, 1627485440,
                0, '22b4911b',
                0, 0,
                0, '',
                0, '{}'
            ],
            msg,
            [413164365, 'Console', 0, 0, 0, 10000, 1, ''],
        ]
    })
}


!(async function __main__() {
    let ans;
    while (true) {
        ans = await input.text('>')
        fakeMsg(ans)
    }
})()

async function addSong(song, sender, detail = undefined) {
    if (!detail) detail = await song.getSongDetail();
    let offline_url = await getTempUrl(detail.id);
    if (!offline_url) {
        let ol_url = (await song.getSongURL());
        offline_url = await downloadToTemp(ol_url, detail.id)
    }
    console.log(offline_url)
    song = {
        sender, detail, url: offline_url, source: song
    };
    console.log(`[${new Date().toDateString()}] Added to queue:\n   ${JSON.stringify(song)}`);
    playQueue.push(song);
    wsEmit({
        type: "playlist",
        playlist: playQueue
    });
    wsEmit({
        type: "message",
        msg: `${song.sender} 点歌成功！`
    });
    return song;
}
