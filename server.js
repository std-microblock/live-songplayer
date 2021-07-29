const options = {
    roomid: 3106704,
    source: require("./sources/netease.js"),
    port: 10103 //WebSocket Port=port+1
}









let store =
    JSON.parse(require("fs").readFileSync(__dirname + "/store.json").toString())

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

function wsMsg(msg) {
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
                break;
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
    if (!msg.startsWith("!")) return;
    let cmdData = msg.slice(1).split(" ");
    console.log(`[${new Date().toDateString()}] Detected command from "${sender}":\n    cmd:"${cmdData[0]}"\n    args:[${cmdData.slice(1)}]`)

    switch (cmdData[0]) {
        case 'pl':
        case 'play': {
            let song = await options.source.search(cmdData.slice(1).join(" "));
            let detail = await song.getSongDetail();
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
            song = {
                sender, detail, url: (await song.getSongURL())
            }
            console.log(`[${new Date().toDateString()}] Added to queue:\n   ${JSON.stringify(song)}`);
            playQueue.push(song);
            wsEmit({
                type: "playlist",
                playlist: playQueue
            })
            wsEmit({
                type: "message",
                msg: `${song.sender} 点歌成功！`
            })
            break;
        }
        case 'del':
        case 'delete': {
            let song = playQueue[+cmdData[1] - 1];
            if (song && song.sender == sender) {
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
        case 'jmp':
        case 'jump': {
            if (sender != "Console") return;
            wsEmit({
                type: "jump"
            })
        }
        case 'bl':
        case 'blacklist': {
            if (sender != "Console") return;

            function addBlacklist(name){
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
            }else if(cmdData[1] == "remove"){
                let name=cmdData.slice(2).join(" ")
                store.blacklist=store.blacklist.reduce((pre,cur)=>{
                    if(cur!=name)pre.push(cur);
                    return pre;
                },[])
                console.log(`歌曲名 "${name}" 去黑成功！`)
            }else{
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

!(async function __main__() {
    let ans;
    while (true) {
        ans = await input.text('>')
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
                ans,
                [413164365, 'Console', 0, 0, 0, 10000, 1, ''],
            ]
        })
    }
})()