const SETTINGS = {
    useJumpedUrl: true,
    autoPullRPL: {
        on: false,
        url: "https://music.163.com/playlist?id=5335545646" //删掉 "/#/" !!!!!!!!!
    },
    defaultRandomPlaylist: [
        'Never Gonna Give You Up',
        '446508414',
        '1464661022',
        '1823610049',
        '1468359462',
        '1469043105',
        '1405068829'
    ]
}

let fetch = require("node-fetch")
!(async function () {
    if (SETTINGS.autoPullRPL.on) {
        let result = await (await fetch(SETTINGS.autoPullRPL.url)).text();
        let exp = new RegExp(`\\<li\\>\\<a href=\\"\\/song\\?id\\=(\\S+)\\"\\>`);
        while (exp.test(result)) {
            // if()
            SETTINGS.defaultRandomPlaylist.push(exp.exec(result)[1])
            result = result.replace(exp, "")
        }
        console.log(SETTINGS.defaultRandomPlaylist)
    }
})()

const { song_detail, search, check_music, song_url, login_qr_key, login_qr_create, login_status, lyric } = require('NeteaseCloudMusicApi');
let baseSettings = {
    // proxy: "http://localhost:41091",
    cookie:null
};

class Song {
    constructor(name, artists, id, pic, playable) {
        this.name = name;
        this.artists = artists;
        this.id = id;
        this.pic = pic
        this.playable = playable
    }
    async getSongDetail() {
        return {
            name: this.name,
            artists: this.artists,
            cover: this.pic,
            playable: this.playable,
            id: "NCM" + this.id
        }
    }
    async getSongURL() {
        if (!SETTINGS.useJumpedUrl)
            return `https://music.163.com/song/media/outer/url?id=${this.id}`
        else try {
            return (await song_url({ id: this.id, ...baseSettings })).body.data[0].url
        } catch {
            return "not_available"
        }

    }
    getLyric(){
        return api.lyric(this)
    }
}

let timer = -1;

const api={
    async login() {
        return { text: "目前暂不支持登录" }

        let status = await login_status(baseSettings)
        if (status.body.account)
            return { text: "已登录" }

        console.log(status)
        baseSettings.cookie=status.cookie.join(" ")


        let key = await login_qr_key({ ...baseSettings });
        let qr = await login_qr_create({ key: key.body.data.unikey, qrimg: true, ...baseSettings })


        return {
            img: qr.body.data.qrimg
        }
    },
    async search (arg) {
        try {
            arg = arg.toString()
            let song;
            if (!Number.isNaN(+(arg.replace(/\|/g, "")))) {
                song = (await song_detail({
                    ids: arg, ...baseSettings
                })).body.songs[0];
            }
            if (!song) {
                song = (await search({
                    keywords: arg,
                    limit: 1, ...baseSettings
                })).body.result.songs[0]
            }
            song = (await song_detail({ ids: song.id.toString(), ...baseSettings })).body.songs[0]

            if (song) return new Song(song.name, song.ar.reduce((pre, cur) => {
                pre.push(cur.name);
                return pre;
            }, []), song.id, song.al.picUrl, (await check_music({ id: song.id, ...baseSettings })).body.success);
            else return new Song(0, 0, 0, 0, false);
        } catch (e) {
            return new Song(0, 0, 0, 0, false);
        }
    },
    async lyric(song){
        let lrc=(await lyric({id:song.id,...baseSettings})).body
        if(lrc.nolyric||!lrc.lrc||!lrc.lrc.lyric)return "[NO LYRIC]";
        return lrc.lrc.lyric
    },
    random() {
        return this.search(SETTINGS.defaultRandomPlaylist[
            Math.floor(Math.random() * SETTINGS.defaultRandomPlaylist.length)])
    }
}

module.exports = api