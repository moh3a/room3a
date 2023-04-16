import AgoraRTC, { IAgoraRTCClient } from "agora-rtc-sdk-ng";

const APP_ID = "d17ddcee8dd3465ab9f531033c2cd402"; // todo: replace with "<!-- AGORA_APP_ID -->"
const token = null; // for agora in production mode

let uid = sessionStorage.getItem("uid");
if (!uid) {
  uid = String(Math.round(Math.random() * 100000));
  sessionStorage.setItem("uid", uid);
}
let client: IAgoraRTCClient;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let ROOM_ID = urlParams.get("room");
if (!ROOM_ID) ROOM_ID = "main"; // todo: change --- move user to login page

let localTracks = [];
let remoteUsers = {};

const joinRoomInit = async () => {
  client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  await client.join(APP_ID, ROOM_ID, token, uid);

  client.on("user-published", handleUserPublished);

  joinStream();
};

const joinStream = async () => {
  localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();
  let player = `
    <div class="video__container" id="user-container-${uid}">
      <div class="video-player" id="user-${uid}"></div>
    </div>
  `;
  document
    .getElementById("streams__container")
    .insertAdjacentHTML("beforeend", player);

  localTracks[1].play(`user-${uid}`);
  await client.publish([localTracks[0], localTracks[1]]);
};

const handleUserPublished = async (user, mediaType) => {
  remoteUsers[user.uid] = user;
  await client.subscribe(user, mediaType);

  let player: HTMLElement | string = document.getElementById(
    `user-container-${user.uid}`
  );
  if (player === null) {
    player = `
    <div class="video__container" id="user-container-${user.uid}">
      <div class="video-player" id="user-${user.uid}"></div>
    </div>
  `;
    document
      .getElementById("streams__container")
      .insertAdjacentHTML("beforeend", player);
  }

  if (mediaType === "video") {
    user.mediaTrack.play(`user-${user.uid}`);
  }

  if (mediaType === "audio") {
    user.mediaTrack.play();
  }
};

joinRoomInit();
