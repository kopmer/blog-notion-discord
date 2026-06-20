require("dotenv").config();

const { Client, GatewayIntentBits, Partials } = require("discord.js");
const { Client: NotionClient } = require("@notionhq/client");

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

const notion = new NotionClient({
  auth: process.env.NOTION_TOKEN,
});

const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const TARGET_PARENT_CHANNEL_ID = process.env.TARGET_PARENT_CHANNEL_ID;

function truncateText(text, maxLength = 1800) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

/**
 * 메시지에서 URL 추출
 */
function extractUrls(text) {
  const regex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(regex) || [];

  return urls.map((url) =>
    url
      .trim()
      .replace(/[),.]+$/, "")
      .replace(/^<|>$/g, "")
  );
}

/**
 * 스레드 제목에서 마감일 추출
 *
 * 예:
 * "26.06.25 | Notion"      -> 2026-06-25
 * "2026-06-25 | Notion"    -> 2026-06-25
 */
function parseDeadlineFromThreadName(threadName) {
  const rawDate = threadName.split("|")[0]?.trim();

  if (!rawDate) return null;

  // 26.06.25 -> 2026-06-25
  const shortDateMatch = rawDate.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);

  if (shortDateMatch) {
    const [, yy, mm, dd] = shortDateMatch;
    return `20${yy}-${mm}-${dd}`;
  }

  // 2026-06-25 -> 2026-06-25
  const isoDateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoDateMatch) {
    return rawDate;
  }

  console.log(`마감일 파싱 실패: ${threadName}`);
  return null;
}

/**
 * 모든 http/https URL 허용
 */
function isAllowedBlogUrl(url) {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * HTML Entity 간단 디코딩
 */
function decodeHtmlEntities(text) {
  if (!text) return "";

  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/**
 * 서버 별명 가져오기
 * 1순위: message.member.displayName
 * 2순위: guild.members.fetch로 가져온 displayName
 * 3순위: globalName
 * 4순위: username
 */
async function getServerNickname(message) {
  try {
    if (message.member?.displayName) {
      return message.member.displayName;
    }

    if (message.guild && message.author?.id) {
      const member = await message.guild.members.fetch(message.author.id);

      if (member?.displayName) {
        return member.displayName;
      }
    }

    return message.author.globalName || message.author.username || "이름 없음";
  } catch (error) {
    return message.author.globalName || message.author.username || "이름 없음";
  }
}

/**
 * 디스코드 계정 이름 가져오기
 */
function getDiscordName(message) {
  return message.author.globalName || message.author.username || "디스코드 명 없음";
}

/**
 * Discord 미리보기 embed에서 제목 가져오기
 */
function getTitleFromDiscordEmbed(message, url) {
  if (!message.embeds || message.embeds.length === 0) {
    return null;
  }

  const matchedEmbed = message.embeds.find((embed) => {
    return embed.url === url || embed.title;
  });

  return matchedEmbed?.title || null;
}

/**
 * URL에 직접 접근해서 og:title 또는 title 가져오기
 */
async function fetchBlogTitle(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      console.log(`제목 요청 실패: ${response.status} / ${url}`);
      return null;
    }

    const html = await response.text();

    const ogTitleMatch = html.match(
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i
    );

    if (ogTitleMatch) {
      return decodeHtmlEntities(ogTitleMatch[1].trim());
    }

    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);

    if (titleMatch) {
      return decodeHtmlEntities(titleMatch[1].trim());
    }

    return null;
  } catch (error) {
    console.log(`제목 가져오기 실패: ${url}`);
    return null;
  }
}

/**
 * 최종 글 제목 가져오기
 * 1순위: Discord 미리보기 embed
 * 2순위: URL 직접 접근
 * 3순위: 제목 없음
 */
async function getBlogTitle(message, url) {
  const embedTitle = getTitleFromDiscordEmbed(message, url);

  if (embedTitle) {
    return truncateText(embedTitle);
  }

  const fetchedTitle = await fetchBlogTitle(url);

  return truncateText(fetchedTitle || "제목 없음");
}

/**
 * Notion DB에 같은 블로그 링크가 이미 있는지 확인
 */
async function isAlreadySubmitted(url) {
  const response = await notion.databases.query({
    database_id: NOTION_DATABASE_ID,
    filter: {
      property: "블로그 링크",
      url: {
        equals: url,
      },
    },
  });

  return response.results.length > 0;
}

/**
 * Notion DB에 새 페이지 추가
 */
async function addToNotion({
  serverNickname,
  discordName,
  postTitle,
  url,
  messageId,
  threadId,
  submittedAt,
  deadline,
  category,
}) {
  const properties = {
    "글 제목": {
      title: [
        {
          text: {
            content: postTitle || "제목 없음",
          },
        },
      ],
    },
    이름: {
      rich_text: [
        {
          text: {
            content: truncateText(serverNickname || "이름 없음"),
          },
        },
      ],
    },
    "디스코드 명": {
      rich_text: [
        {
          text: {
            content: truncateText(discordName || "디스코드 명 없음"),
          },
        },
      ],
    },
    "블로그 링크": {
      url: url,
    },
    제출일: {
      date: {
        start: submittedAt,
      },
    },
    분류: {
      rich_text: [
        {
          text: {
            content: truncateText(category),
          },
        },
      ],
    },
    "Discord 쓰레드 ID": {
      rich_text: [
        {
          text: {
            content: threadId,
          },
        },
      ],
    },
    "Discord 메시지 ID": {
      rich_text: [
        {
          text: {
            content: messageId,
          },
        },
      ],
    },
  };

  if (deadline) {
    properties.마감일 = {
      date: {
        start: deadline,
      },
    };
  }

  await notion.pages.create({
    parent: {
      database_id: NOTION_DATABASE_ID,
    },
    properties,
  });
}

/**
 * 메시지 하나 처리
 */
async function handleMessage(message) {
  if (message.author.bot) return;

  if (!message.channel.isThread()) return;

  if (message.channel.parentId !== TARGET_PARENT_CHANNEL_ID) return;

  const urls = extractUrls(message.content);

  if (urls.length === 0) return;

  const deadline = parseDeadlineFromThreadName(message.channel.name);

  // 분류는 스레드 제목 뒤쪽 값이 아니라 고정값으로 저장
  const category = "기술 블로그";

  for (const url of urls) {
    if (!isAllowedBlogUrl(url)) {
      console.log(`허용되지 않은 URL 건너뜀: ${url}`);
      continue;
    }

    const duplicated = await isAlreadySubmitted(url);

    if (duplicated) {
      console.log(`중복 링크 건너뜀: ${url}`);
      continue;
    }

    const serverNickname = await getServerNickname(message);
    const discordName = getDiscordName(message);
    const postTitle = await getBlogTitle(message, url);

    await addToNotion({
      serverNickname,
      discordName,
      postTitle,
      url,
      messageId: message.id,
      threadId: message.channel.id,
      submittedAt: message.createdAt.toISOString(),
      deadline,
      category,
    });

    console.log(
      `저장 완료: ${serverNickname} / ${discordName} / ${postTitle} / ${url}`
    );
  }
}

/**
 * 스레드 하나의 메시지 전체 동기화
 */
async function syncThreadMessages(thread) {
  console.log(`스레드 확인 중: ${thread.name}`);

  let lastMessageId = null;
  let hasMore = true;

  while (hasMore) {
    const options = {
      limit: 100,
    };

    if (lastMessageId) {
      options.before = lastMessageId;
    }

    const messages = await thread.messages.fetch(options);

    if (messages.size === 0) {
      hasMore = false;
      break;
    }

    const sortedMessages = [...messages.values()].sort(
      (a, b) => a.createdTimestamp - b.createdTimestamp
    );

    for (const message of sortedMessages) {
      try {
        await handleMessage(message);
      } catch (error) {
        console.error(`메시지 처리 실패: ${message.id}`);
        console.error(error.message);
      }
    }

    lastMessageId = messages.last().id;

    if (messages.size < 100) {
      hasMore = false;
    }
  }
}

/**
 * 보관된 public 스레드 전체 가져오기
 */
async function fetchAllArchivedPublicThreads(parentChannel) {
  const threadMap = new Map();

  let before = null;
  let hasMore = true;

  while (hasMore) {
    const options = {
      type: "public",
      limit: 100,
    };

    if (before) {
      options.before = before;
    }

    const archived = await parentChannel.threads.fetchArchived(options);

    for (const [threadId, thread] of archived.threads) {
      threadMap.set(threadId, thread);
    }

    if (!archived.hasMore || archived.threads.size === 0) {
      hasMore = false;
    } else {
      const lastThread = archived.threads.last();
      before = lastThread.archiveTimestamp;
    }
  }

  return threadMap;
}

/**
 * 부모 채널 안의 활성 스레드 + 보관된 스레드 기존 메시지 동기화
 */
async function syncExistingThreadMessages() {
  console.log("기존 스레드 메시지 동기화 시작");

  const parentChannel = await discord.channels.fetch(TARGET_PARENT_CHANNEL_ID);

  if (!parentChannel) {
    console.log("부모 채널을 찾을 수 없습니다.");
    return;
  }

  if (!parentChannel.threads) {
    console.log(
      "이 채널에서는 스레드를 가져올 수 없습니다. TARGET_PARENT_CHANNEL_ID를 확인하세요."
    );
    return;
  }

  const threadMap = new Map();

  // 1. 활성 스레드 가져오기
  const activeThreads = await parentChannel.threads.fetchActive();

  for (const [threadId, thread] of activeThreads.threads) {
    threadMap.set(threadId, thread);
  }

  console.log(`활성 스레드 ${activeThreads.threads.size}개 확인`);

  // 2. 보관된 public 스레드 가져오기
  try {
    const archivedThreads = await fetchAllArchivedPublicThreads(parentChannel);

    for (const [threadId, thread] of archivedThreads) {
      threadMap.set(threadId, thread);
    }

    console.log(`보관된 public 스레드 ${archivedThreads.size}개 확인`);
  } catch (error) {
    console.error("보관된 스레드 조회 실패");
    console.error(error.message);
  }

  console.log(`총 ${threadMap.size}개 스레드 확인`);

  for (const [threadId, thread] of threadMap) {
    try {
      await syncThreadMessages(thread);
    } catch (error) {
      console.error(`스레드 처리 실패: ${thread.name}`);
      console.error(error.message);
    }
  }

  console.log("기존 스레드 메시지 동기화 완료");
}

/**
 * 봇 준비 완료 시 실행
 */
discord.once("clientReady", async () => {
  console.log(`봇 로그인 완료: ${discord.user.tag}`);

  try {
    await syncExistingThreadMessages();
    console.log("작업 완료. 프로그램을 종료해도 됩니다.");
  } catch (error) {
    console.error("동기화 중 오류 발생");
    console.error(error);
  }
});

discord.login(process.env.DISCORD_TOKEN);