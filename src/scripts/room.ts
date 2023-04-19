let messagesContainer = document.getElementById("messages");
messagesContainer.scrollTop = messagesContainer.scrollHeight;

const memberContainer = document.getElementById("members__container");
const memberButton = document.getElementById("members__button");
let activeMemberContainer = false;
memberButton.addEventListener("click", () => {
  memberContainer.style.display = activeMemberContainer ? "none" : "block";
  activeMemberContainer = !activeMemberContainer;
});

const chatContainer = document.getElementById("messages__container");
const chatButton = document.getElementById("chat__button");
let activeChatContainer = false;
chatButton.addEventListener("click", () => {
  chatContainer.style.display = activeChatContainer ? "none" : "block";
  activeChatContainer = !activeChatContainer;
});

export let userIdInStreamBoxElement: string | null = null;
export const setUserIdInStreamBoxElement = (userId: string) => {
  userIdInStreamBoxElement = userId;
};

export const streamBoxElement = document.getElementById("stream__box");
export const videoFrames = document.getElementsByClassName("video__container");

export const expandVideoFrame = (event: MouseEvent) => {
  let child = streamBoxElement.children[0];
  if (child) {
    document.getElementById("streams__container").appendChild(child);
  }
  streamBoxElement.style.display = "block";
  streamBoxElement.appendChild(event.currentTarget as Node);
  userIdInStreamBoxElement = (event.currentTarget as any).id;

  for (let i = 0; i < videoFrames.length; i++) {
    if (videoFrames[i].id !== userIdInStreamBoxElement) {
      (videoFrames[i] as any).style.height = "100px";
      (videoFrames[i] as any).style.width = "100px";
    }
  }
};

for (let i = 0; i < videoFrames.length; i++) {
  videoFrames[i].addEventListener("click", expandVideoFrame);
}

const hideDisplayFrame = () => {
  userIdInStreamBoxElement = null;
  streamBoxElement.style.display = null;

  let child = streamBoxElement.children[0];
  document.getElementById("streams__container").appendChild(child);

  for (let i = 0; i < videoFrames.length; i++) {
    (videoFrames[i] as any).style.height = "300px";
    (videoFrames[i] as any).style.width = "300px";
  }
};

streamBoxElement.addEventListener("click", hideDisplayFrame);
