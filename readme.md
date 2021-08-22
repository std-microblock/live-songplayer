# Micro Live Song Player

## Introduction
一个 BiliBili 弹幕点歌机！

……那是什么？

是指`允许用户在Bilibili直播间内使用弹幕指令点歌的程序`！

<!-- 什么，还是没有听懂？那么[看个视频了解一下]()！ -->

## UI展示
嗯……我自认为还是做的蛮好看的啦

<small>~~本来打算做毛玻璃但是OBS不允许~~</small>

[点击查看](https://www.bilibili.com/video/BV1QX4y1c7be/)

## 部署教程
1.下载/clone源码

2.安装nodejs

3.安装：在源码目录下运行：
```
npm i
npm i pm2 -g
```

### 修改`server.js`，修改options内roomid为你的哔哩哔哩直播间房间号

4.开启：（以后需要开启只需运行这一步即可）在源码目录下运行：

```
pm2 start server.js
```
5.obs设置：添加一个浏览器，链接为`http://localhost:10103/`

6.播放控制：浏览器访问`http://localhost:10103/controller.html`

## 注意事项
播放一段时间后，应双击`清理作案现场.bat`以清除缓存

~~当然如果你不在乎爆硬盘那就没事~~

<small>原因：为了适应国外的鬼网络环境，我在点歌时直接下载了歌曲。否则在国外播放很可能在歌曲中间段断开<small>

## 其他配置
### 1.修改自动轮播歌曲
在`sources/netease.js`内修改`SETTINGS.defaultRandomPlaylist`这个数组，数组内应为id或歌曲名

### 2.上代理
如果你还是因为网络环境无法播放的话，可以在`sources/netease.js`内添加`baseSettings.proxy`，值为http代理网址
