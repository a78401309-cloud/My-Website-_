
const DISCORD_USER_ID = "1306019342629998643";
const LANYARD_API =
  `https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`;

const STATUS_LABELS = {
  online: "Online",
  idle: "Idle",
  dnd: "Do Not Disturb",
  offline: "Offline"
};

let isFetching = false;
let lastAvatarUrl = "";

// تحديث صورة Discord الموجودة فوق الكارت فقط
function updateAvatar(user) {
  const avatar = document.getElementById("discord-avatar");

  if (!avatar || !user || !user.id) return;

  let avatarUrl;

  if (user.avatar) {
    const extension = user.avatar.startsWith("a_")
      ? "gif"
      : "png";

    avatarUrl =
      `https://cdn.discordapp.com/avatars/` +
      `${user.id}/${user.avatar}.${extension}?size=256`;
  } else {
    // صورة Discord الافتراضية إذا لم يكن للحساب صورة مخصصة
    const defaultIndex = Number(
      (BigInt(user.id) >> 22n) % 6n
    );

    avatarUrl =
      `https://cdn.discordapp.com/embed/avatars/` +
      `${defaultIndex}.png`;
  }

  // لا نعيد تحميل الصورة إذا لم تتغير
  if (avatarUrl === lastAvatarUrl) return;

  lastAvatarUrl = avatarUrl;
  avatar.alt = `${user.global_name || user.username || "Discord"} Avatar`;
  avatar.title = user.global_name || user.username || "Discord User";
  avatar.src = avatarUrl;
}

// تحديث الحالة والنشاط في بطاقة Discord
function setDiscordStatus(status, activity) {
  const statusText = document.getElementById("discord-status-text");
  const activityText = document.getElementById("discord-activity-text");
  const statusDot = document.getElementById("discord-status-dot");

  if (statusText) {
    statusText.textContent =
      STATUS_LABELS[status] || STATUS_LABELS.offline;
  }

  if (activityText) {
    activityText.textContent = activity;
  }

  if (statusDot) {
    statusDot.className =
      `discord-status-dot ${status || "offline"}`;
  }
}

// قراءة النشاط الحالي من بيانات Discord
function getActivity(data) {
  const activities = data.activities || [];

  // الألعاب والتطبيقات والأنشطة الظاهرة
  const activity = activities.find(item => item.type !== 4);

  if (activity) {
    if (activity.name === "Spotify") {
      return activity.details
        ? `Listening to ${activity.details}`
        : "Listening to Spotify";
    }

    if (activity.details && activity.state) {
      return (
        `${activity.name}: ${activity.details}` +
        ` — ${activity.state}`
      );
    }

    if (activity.details) {
      return `${activity.name}: ${activity.details}`;
    }

    return activity.name || "Active on Discord";
  }

  // الحالة المخصصة إذا لم يوجد نشاط آخر
  const customStatus = activities.find(
    item => item.type === 4 && item.state
  );

  if (customStatus) {
    const emoji = customStatus.emoji?.name;

    return `${emoji ? emoji + " " : ""}${customStatus.state}`;
  }

  return "No current activity";
}

// جلب أحدث بيانات Discord
async function updateDiscordStatus() {
  if (isFetching) return;

  isFetching = true;

  try {
    const response = await fetch(LANYARD_API, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Lanyard HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error("Discord presence is unavailable.");
    }

    const data = result.data;

    // تحديث الصورة نفسها الموجودة أعلى الكارت
    if (data.discord_user) {
      updateAvatar(data.discord_user);
    }

    // تحديث حالة الحساب ونشاطه
    const status = data.discord_status || "offline";
    const activity = getActivity(data);

    setDiscordStatus(status, activity);

  } catch (error) {
    console.error("Discord status error:", error);

    // نحافظ على الصورة السابقة لو حصل خطأ مؤقت
    setDiscordStatus(
      "offline",
      "Unable to load Discord status"
    );

  } finally {
    isFetching = false;
  }
}

// جلب البيانات بمجرد فتح الموقع
updateDiscordStatus();

// تحديث الحالة والصورة كل 30 ثانية
setInterval(updateDiscordStatus, 30000);
