import { RtmMessage } from "agora-rtm-sdk";
import { channel, displayName, rtm_client } from "./room_rtc";
import {
  streamBoxElement,
  userIdInStreamBoxElement,
  videoFrames,
} from "./room";

// MEMBERS

export const handleMemberJoined = async (MemberId: string) => {
  const members = await channel.getMembers();
  updateMemberTotal(members);

  const name = await addMemberToDOM(MemberId);
  if (name) addBotMessageToDOM(`${name} entered the room! 💋`);
};

export const handleMemberLeft = async (MemberId: string) => {
  removeMemberFromDOM(MemberId);
  const members = await channel.getMembers();
  updateMemberTotal(members);
};

const addMemberToDOM = async (MemberId: string) => {
  let { name } = await rtm_client.getUserAttributesByKeys(MemberId, ["name"]);
  if (name) {
    const membersWrapper = document.getElementById("member__list");
    const memberItem = `<div class="member__wrapper" id="member__${MemberId}__wrapper">
        <span class="green__icon"></span>
        <p class="member_name">${name}</p>
      </div>`;

    membersWrapper.insertAdjacentHTML("beforeend", memberItem);
  }
  console.log("name", name, typeof name);
  return name;
};

const updateMemberTotal = (members: string[]) => {
  const total = document.getElementById("members__count");
  total.innerText = String(members.length);
};

const removeMemberFromDOM = (MemberId: string) => {
  const memberWrapper = document.getElementById(`member__${MemberId}__wrapper`);
  let name = memberWrapper.getElementsByClassName(`member_name`)[0].textContent;
  addBotMessageToDOM(`${name} left the room! 👀`);
  memberWrapper.remove();
};

export const getMembers = async () => {
  const members = await channel.getMembers();
  updateMemberTotal(members);
  for (let i = 0; i < members.length; i++) {
    addMemberToDOM(members[i]);
  }
};

// MESSAGES

export interface MessageData {
  type: "chat" | "user-left";
  message?: string;
  displayName?: string;
  uid?: string;
}

export const handleChannelMessage = async (messageData: RtmMessage) => {
  const data: MessageData = JSON.parse(messageData.text);
  if (data.type === "chat") addUserMessageToDOM(data.displayName, data.message);
  if (data.type === "user-left") {
    document.getElementById(`user-container-${data.uid}`).remove();
    if (userIdInStreamBoxElement === `user-container-${data.uid}`) {
      streamBoxElement.style.display = null;
      for (let i = 0; i < videoFrames.length; i++) {
        (videoFrames[i] as any).style.height = "300px";
        (videoFrames[i] as any).style.width = "300px";
      }
    }
  }
};

const sendMessage = async (event: SubmitEvent) => {
  event.preventDefault();

  const message = (event.target as any).message.value;
  if (message && displayName) {
    const messageData: MessageData = { type: "chat", message, displayName };
    await channel.sendMessage({
      text: JSON.stringify(messageData),
    });
    addUserMessageToDOM(displayName, message);
  }

  (event.target as any).reset();
};

const addMessageToDOM = (message: string) => {
  const messagesWrapper = document.getElementById("messages");
  messagesWrapper.insertAdjacentHTML("beforeend", message);
  const lastMessage = document.querySelector(
    "#messages .message__wrapper:last-child"
  );
  if (lastMessage) lastMessage.scrollIntoView();
};

const addUserMessageToDOM = (name: string, message: string) => {
  const newMessage = `<div class="message__wrapper">
  <div class="message__body">
  <strong class="message__author">${name}</strong>
  <p class="message__text">${message}</p>
  </div>
  </div>`;
  addMessageToDOM(newMessage);
};

export const addBotMessageToDOM = (message: string) => {
  const newMessage = `<div class="message__wrapper">
  <div class="message__body__bot">
  <strong class="message__author__bot">🤖 room3a Bot</strong>
        <p class="message__text__bot">
          ${message}
          </p>
      </div>
    </div>`;
  addMessageToDOM(newMessage);
};

const messageForm = document.getElementById("message__form");
messageForm.addEventListener("submit", sendMessage);

// LEAVING CHANNEL

const leaveChannel = async () => {
  await channel.leave();
  await rtm_client.logout();
};

window.addEventListener("beforeunload", leaveChannel);
