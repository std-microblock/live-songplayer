const SETTINGS={
    useJumpedUrl:true
}


const { song_detail,search,check_music,song_url } = require('NeteaseCloudMusicApi');
let baseSettings={
 //   proxy:"http://localhost:41091",
    
};

class Song {
    constructor(name,artists,id,pic,playable){
        this.name=name;
        this.artists=artists;
        this.id=id;
        this.pic=pic
        this.playable=playable
    }
    async getSongDetail(){
        return {
            name:this.name,
            artists:this.artists,
            cover:this.pic,
            playable:this.playable
        }
    }
    async getSongURL(){
        if(!SETTINGS.useJumpedUrl)
        return `https://music.163.com/song/media/outer/url?id=${this.id}`
        else
        return (await song_url({id:this.id,...baseSettings})).body.data[0].url
    }

}

module.exports = {
    search: async function (arg) {
        try{
        arg=arg.toString()
        let song;
        if(!Number.isNaN(+arg)){
            song=(await song_detail({
                ids:arg,...baseSettings
            })).body.songs[0];
        }
        if(!song){
            song=(await search({
                keywords:arg,
                limit:1,...baseSettings
            })).body.result.songs[0]
        }
        song=(await song_detail({ids:song.id.toString(),...baseSettings})).body.songs[0]
        if(song)return new Song(song.name,song.ar.reduce((pre,cur)=>{
            pre.push(cur.name);
            return pre;
        },[]),song.id,song.al.picUrl,(await check_music({id:song.id,...baseSettings})).body.success);
        else return new Song(0,0,0,0,false);
    }catch{
        return new Song(0,0,0,0,false);
    }
    }, random: function () {

    }
}