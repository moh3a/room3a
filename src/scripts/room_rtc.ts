import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
  ICameraVideoTrack,
} from "agora-rtc-sdk-ng";
import AgoraRTM, { RtmClient, RtmChannel } from "agora-rtm-sdk";

import {
  streamBoxElement,
  expandVideoFrame,
  userIdInStreamBoxElement,
  videoFrames,
  setUserIdInStreamBoxElement,
} from "./room";
import {
  MessageData,
  addBotMessageToDOM,
  getMembers,
  handleChannelMessage,
  handleMemberJoined,
  handleMemberLeft,
} from "./room_rtm";
import { APP_ID, PROD_TOKEN } from "../consts";

export let displayName = localStorage.getItem("display_name");
if (!displayName) window.location = "/lobby" as any;

let uid = sessionStorage.getItem("uid");
if (!uid) {
  uid = String(Math.round(Math.random() * 100000));
  sessionStorage.setItem("uid", uid);
}

let client: IAgoraRTCClient;
export let rtm_client: RtmClient;
export let channel: RtmChannel;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let ROOM_ID = urlParams.get("room");
if (!ROOM_ID) window.location = "/lobby" as any;

let localTracks: [IMicrophoneAudioTrack, ICameraVideoTrack] | [] = [];
let remoteUsers: Record<string, IAgoraRTCRemoteUser> = {};
let localScreenTracks: any; // ILocalVideoTrack | [ILocalVideoTrack, ILocalAudioTrack]
let sharingScreen = false;

const streamsContainer = document.getElementById("streams__container");

const joinRoomInit = async () => {
  rtm_client = AgoraRTM.createInstance(APP_ID);
  await rtm_client.login({ uid, token: PROD_TOKEN });
  await rtm_client.addOrUpdateLocalUserAttributes({
    name: displayName,
  });

  channel = rtm_client.createChannel(ROOM_ID);
  await channel.join();

  channel.on("MemberJoined", handleMemberJoined);
  channel.on("MemberLeft", handleMemberLeft);
  channel.on("ChannelMessage", handleChannelMessage);
  getMembers();
  addBotMessageToDOM(`Welcome to the room ${displayName}! 👋`);

  client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
  await client.join(APP_ID, ROOM_ID, PROD_TOKEN, uid);

  client.on("user-published", handleUserPublished);
  client.on("user-left", handleUserLeft);
};

const player = `
    <div class="video__container" id="user-container-${uid}">
      <div class="video-player" id="user-${uid}"></div>
    </div>
  `;

const joinStream = async () => {
  document.getElementById("join-btn").style.display = "none";
  (
    document.getElementsByClassName("stream__actions")[0] as HTMLElement
  ).style.display = "flex";

  localTracks = await AgoraRTC.createMicrophoneAndCameraTracks(
    {},
    {
      encoderConfig: {
        width: {
          min: 640,
          ideal: 1920,
          max: 1920,
        },
        height: {
          min: 480,
          ideal: 1080,
          max: 1080,
        },
      },
    }
  );

  streamsContainer.insertAdjacentHTML("beforeend", player);
  document
    .getElementById(`user-container-${uid}`)
    .addEventListener("click", expandVideoFrame);

  localTracks[1].play(`user-${uid}`);
  await client.publish([localTracks[0], localTracks[1]]);
};

const leaveStream = async (event: MouseEvent) => {
  document.getElementById("join-btn").style.display = "block";
  (
    document.getElementsByClassName("stream__actions")[0] as HTMLElement
  ).style.display = "none";

  for (let i = 0; i < localTracks.length; i++) {
    localTracks[i].stop();
    localTracks[i].close();
  }

  await client.unpublish([localTracks[0], localTracks[1]]);
  if (localScreenTracks) await client.unpublish([localScreenTracks]);

  document.getElementById(`user-container-${uid}`).remove();

  if (userIdInStreamBoxElement === `user-container-${uid}`) {
    streamBoxElement.style.display = null;
    for (let i = 0; i < videoFrames.length; i++) {
      (videoFrames[i] as any).style.height = "300px";
      (videoFrames[i] as any).style.width = "300px";
    }
  }
  const messageData: MessageData = {
    type: "user-left",
    uid,
  };
  channel.sendMessage({ text: JSON.stringify(messageData) });
};

const handleUserPublished = async (
  user: IAgoraRTCRemoteUser,
  mediaType: "audio" | "video"
) => {
  remoteUsers[user.uid] = user;
  await client.subscribe(user, mediaType);

  let player: HTMLElement = document.getElementById(
    `user-container-${user.uid}`
  );
  if (player === null) {
    player = document.createElement("div");
    player.id = `user-container-${user.uid}`;
    player.className = "video__container";
    player.innerHTML = `
      <div class="video__container" id="user-container-${user.uid}">
        <div class="video-player" id="user-${user.uid}"></div>
      </div>
    `;
    streamsContainer.insertAdjacentElement("beforeend", player);
    document
      .getElementById(`user-container-${user.uid}`)
      .addEventListener("click", expandVideoFrame);
  }

  if (streamBoxElement.style.display) {
    player.style.height = "100px";
    player.style.width = "100px";
  }

  if (mediaType === "video" && user.hasVideo) {
    user.videoTrack.play(`user-${user.uid}`);
  }

  if (mediaType === "audio" && user.hasAudio) {
    user.audioTrack.play();
  }
};

const handleUserLeft = async (user: IAgoraRTCRemoteUser) => {
  delete remoteUsers[user.uid];
  const item = document.getElementById(`user-container-${user.uid}`);
  if (item) item.remove();

  if (userIdInStreamBoxElement === `user-container-${user.uid}`) {
    streamBoxElement.style.display = null;
    for (let i = 0; i < videoFrames.length; i++) {
      (videoFrames[i] as any).style.height = "300px";
      (videoFrames[i] as any).style.width = "300px";
    }
  }
};

const cameraBtn = document.getElementById("camera-btn");
cameraBtn.addEventListener("click", async () => {
  if (localTracks[1].muted) {
    await localTracks[1].setMuted(false);
    cameraBtn.classList.add("active");
  } else {
    await localTracks[1].setMuted(true);
    cameraBtn.classList.remove("active");
  }
});

const micBtn = document.getElementById("mic-btn");
micBtn.addEventListener("click", async () => {
  if (localTracks[0].muted) {
    await localTracks[0].setMuted(false);
    micBtn.classList.add("active");
  } else {
    await localTracks[0].setMuted(true);
    micBtn.classList.remove("active");
  }
});

const screenBtn = document.getElementById("screen-btn");
screenBtn.addEventListener("click", async () => {
  if (!sharingScreen) {
    screenBtn.classList.add("active");
    cameraBtn.classList.remove("active");
    cameraBtn.style.display = "none";
    localScreenTracks = await AgoraRTC.createScreenVideoTrack({});
    document.getElementById(`user-container-${uid}`).remove();
    streamBoxElement.style.display = "block";
    streamBoxElement.insertAdjacentHTML("beforeend", player);
    document
      .getElementById(`user-container-${uid}`)
      .addEventListener("click", expandVideoFrame);
    setUserIdInStreamBoxElement(`user-container-${uid}`);
    localScreenTracks.play(`user-${uid}`);

    await client.unpublish([localTracks[1]]);
    await client.publish([localScreenTracks]);

    for (let i = 0; i < videoFrames.length; i++) {
      if (videoFrames[i].id !== userIdInStreamBoxElement) {
        (videoFrames[i] as any).style.height = "100px";
        (videoFrames[i] as any).style.width = "100px";
      }
    }
  } else {
    cameraBtn.style.display = "block";
    document.getElementById(`user-container-${uid}`).remove();
    await client.unpublish([localScreenTracks]);
    await switchToCamera();
  }

  sharingScreen = !sharingScreen;
});

const switchToCamera = async () => {
  streamBoxElement.insertAdjacentHTML("beforeend", player);
  await localTracks[0].setMuted(true);
  await localTracks[1].setMuted(true);
  micBtn.classList.remove("active");
  screenBtn.classList.remove("active");
  localTracks[1].play(`user-${uid}`);
  await client.publish([localTracks[1]]);
};

const leaveBtn = document.getElementById("leave-btn");
leaveBtn.addEventListener("click", leaveStream);

const joinBtn = document.getElementById("join-btn");
joinBtn.addEventListener("click", (event) => {
  joinStream();
});

joinRoomInit();
