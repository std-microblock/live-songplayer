let ws = new WebSocket(document.location.href.replace(/htt\S+:\/\//, "ws://")
    .replace(document.location.port, +document.location.port + 1));

var cust=false,playlist=[]

ws.onclose = function () {
    let failedTime = 0;
    setInterval(() => {
        document.querySelector("div.messagebox").innerText = "连接断开！正在尝试重连……" + (failedTime ? "失败次数：" + failedTime : "");
    }, 10)
    setTimeout(async function a() {
        try {
            await (await fetch("/")).text();
            document.location.reload();
        } catch (e) { failedTime++; }
        setTimeout(a, 300)
    }, 100)

}

function login(){
    ws.send(JSON.stringify({ type: "login" }))
}

function updPlaylist(pl){
    document.querySelector(".songs").innerHTML=pl.reduce((pre, cur,ind) => {
        pre+=`<div class="songname">${ind+1} - ${cur.detail.name}</div>
        <div class="btn" onclick='remoteFakeMsg("del ${ind+1}")'>删除</div>
        <div class="btn" onclick='remoteFakeMsg("bl add ${cur.detail.name}")'>加黑</div>
        <div class="clr"></div>`
        return pre;
    },"")
}

ws.onmessage=(msge)=>{
    let msg=JSON.parse(msge.data)
    switch (msg.type){
        case "playlist":{
            window.playlist=msg.playlist
            updPlaylist(playlist)
            break;
        }
        case "login":{
            let d=msg.data
            if(d.text)ele_login.innerText=d.text
            if(d.img)ele_login.innerHTML=`<img src="${d.img}" width="100%" alt="" srcset="">`

            break;
        }
    }
}

function remoteFakeMsg(msg){
    ws.send(JSON.stringify({ type: "fake-msg",msg:msg }))
}