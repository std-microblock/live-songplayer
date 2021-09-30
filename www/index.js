let ws = new WebSocket(document.location.href.replace(/htt\S+:\/\//, "ws://")
    .replace(document.location.port, +document.location.port + 1));

var cust=false

ws.onopen = function(){
    window.wsready=true
}

ws.onclose = function () {
    let failedTime = 0;
    setInterval(() => {
        document.querySelector("body > div.messagebox").innerText = "连接断开！正在尝试重连……" + (failedTime ? "失败次数：" + failedTime : "");
    }, 10)
    setTimeout(async function a() {
        try {
            await (await fetch("/")).text();
            document.location.reload();
        } catch (e) { failedTime++; }
        setTimeout(a, 300)
    }, 100)

}

var playlist = []

let messageCycle =
    `点歌命令：play 歌曲名/网易云ID
点歌命令：pl 歌曲名/网易云ID
删歌命令：del 歌曲列表左下角数字`.split("\n");
let msgCycleIndex = 0, msgQueue = [];
let paused=false

setInterval(() => {
    if (playlist && (!document.querySelector("audio").src ||
        document.querySelector("audio").ended||cust && !paused)) {

        play()
    }
    if (playlist.length == 0 && !playing&&!cust) {
        document.querySelector("img").src = "/nosong.webp"
        document.querySelector(".nowPlaying .songname").innerText = "-"
        document.querySelector(".nowPlaying .detail .artist").innerText = "-"
        document.querySelector(".nowPlaying .sender").innerText = ""
    }

}, 100)

setInterval(() => {
    let audio = document.querySelector("audio")
    if (!audio.ended) {
        // console.log(`translateX(-${(1-(audio.currentTime/audio.duration))*100}%);`)
        document.querySelector(".finished").style.transform =
            `translateX(-${(1 - (audio.currentTime / audio.duration)) * 100}%)`
    }
    document.querySelector(".playlist").innerHTML = playlist.reduce((pre, cur) => {
        pre += `<div class="item">
                    <div class="bg" style="background:url(${cur.detail.cover})"></div>
                    <div class="l">
                        ${cur.detail.name} - ${cur.detail.artists.join(" / ")}
                    </div>
                    <div class="r">
                        ${cur.sender}
                    </div>
                    <div class="e"></div>
                </div>`
        return pre;
    }, "")
}, 10)

var playing

document.querySelector("audio").onerror = async function () {
    await switchMsg(playing.detail.name + " 播放失败！")
    play()
}


function play(song) {
    if (!song) {
        playing = playlist[0];
        if (!playing) return;
        cust=false
        playlist.shift()
    }else playing = song

    if(playlist[0])document.querySelector(".nextName").innerText=playlist[0].detail.name
    else document.querySelector(".nextName").innerText="[随机]"
    document.querySelector(".playlistLength").innerText=playlist.length

    document.querySelector("img").src = playing.detail.cover
    document.querySelector(".nowPlaying .songname").innerText = playing.detail.name
    document.querySelector(".nowPlaying .detail .artist").innerText = playing.detail.artists.join(" / ")
    document.querySelector(".nowPlaying .sender").innerText = playing.sender
    document.querySelector("audio").src = playing.url
    document.querySelector("audio").play()
    document.querySelector("audio").onended = () => {
        if(!playlist[0]&&window.wsready)ws.send(JSON.stringify({ type: "empty" }))
        playing = undefined
    }
    ws.send(JSON.stringify({ type: "pl-shift" }))
}
let resetMsg = 0
ws.onmessage = function (msg) {
    msg = JSON.parse(msg.data)

    switch (msg.type) {
        case "playlist": {
            playlist = msg.playlist

            // if(document.querySelector("audio").src!=playlist[0].url)play()
            break;
        }
        case "message": {
            resetMsg = 1
            switchMsg(msg.msg)

            break;
        }
        case "jump": {
            document.querySelector("audio").pause()
            if(!playlist[0])ws.send(JSON.stringify({ type: "empty" }))
            else play()
            break;
        }
        case "pause": {
            document.querySelector("audio").pause()
            paused=true
            break;
        }
        case "continue": {
            paused=false
            document.querySelector("audio").play()
            break;
        }
        case "empty": {
            play(msg.song);
            cust=true
            break;
        }
        case "url": {
            playlist[msg.id].msg = msg.url
            break;
        }
        default: {
            break;
        }
    }
}





function timeout(durination) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve()
        }, durination)
    })
}

async function switchMsg(tB) {
    let tA = document.querySelector(".messagebox").innerText
    for (let x = 0; x <= Math.max(tB.length, tA.length); x++) {
        document.querySelector(".messagebox").innerText = tA.slice(0, Math.max(0, tA.length - x)) + tB.slice(0, x)
        await timeout(100);
    }
}

!(async function swit() {
    while (1) {
        await timeout(10000)
        if (resetMsg) {
            resetMsg = 0;
            continue;
        }
        if (msgQueue.length != 0) {
            let msg = msgQueue[0];
            msgQueue.shift();
            await switchMsg(msg)
        } else {
            if ((++msgCycleIndex) >= messageCycle.length)
                msgCycleIndex = 0
            await switchMsg(messageCycle[msgCycleIndex])
        }
    }
})()

setTimeout(async ()=>{
    while(!window.wsready)await timeout(100)
    if(!playlist[0])ws.send(JSON.stringify({ type: "empty" }))
})



setInterval(()=>{
    
    if(playlist[0])document.querySelector(".nextName").innerText=playlist[0].detail.name
    else document.querySelector(".nextName").innerText="[随机]"
    document.querySelector(".playlistLength").innerText=playlist.length
},100)