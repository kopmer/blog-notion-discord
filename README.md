# Blog Notion Discord

A Node.js automation bot that collects blog links submitted in Discord study threads and records them in a Notion database.

Discord 스터디 스레드에 제출된 블로그 링크를 수집해 Notion 데이터베이스에 자동 기록하는 Node.js 봇입니다.

---

## English

### Overview

Blog Notion Discord is a Node.js bot that automates the process of collecting blog links submitted in Discord study threads and saving them to a Notion database.

When a study member submits a blog link in a Discord thread, the bot extracts the URL from the message, retrieves the blog post title, and records related information such as the author, submission date, deadline, and Discord metadata in Notion.

This project was built to reduce the manual work of managing blog study submissions.

### Features

* Collects blog links from Discord study threads
* Supports active threads and archived public threads
* Extracts blog post titles from Discord embeds or page metadata
* Saves submission data to a Notion database
* Stores Discord server nickname and Discord account name
* Uses the Discord message creation time as the submission date
* Parses the deadline from the Discord thread title
* Prevents duplicate submissions
* Stores Discord thread ID and message ID for tracking

### Tech Stack

* Node.js
* discord.js
* Notion API
* dotenv

### Project Structure

```bash
blog-notion-discord
├── index.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
```

### Notion Database Properties

The Notion database should contain the following properties.

| Property       | Type  | Description                           |
| -------------- | ----- | ------------------------------------- |
| 글 제목           | Title | Blog post title                       |
| 이름             | Text  | Discord server nickname               |
| 디스코드 명         | Text  | Discord account name                  |
| 블로그 링크         | URL   | Submitted blog URL                    |
| 제출일            | Date  | Discord message creation time         |
| 마감일            | Date  | Deadline parsed from the thread title |
| 분류             | Text  | Submission category                   |
| Discord 쓰레드 ID | Text  | Discord thread ID                     |
| Discord 메시지 ID | Text  | Discord message ID                    |

### Thread Naming Rule

The bot parses the deadline from the Discord thread title.

Example:

```text
26.06.25 | Notion
```

This will be saved as:

```text
2026-06-25
```

Supported date formats:

```text
YY.MM.DD
YYYY-MM-DD
```

### Environment Variables

Create a `.env` file based on `.env.example`.

```env
DISCORD_TOKEN=your_discord_bot_token
NOTION_TOKEN=your_notion_internal_integration_secret
NOTION_DATABASE_ID=your_notion_database_id
TARGET_PARENT_CHANNEL_ID=your_discord_parent_channel_id
```

| Variable                 | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| DISCORD_TOKEN            | Discord Bot Token                                         |
| NOTION_TOKEN             | Notion Internal Integration Secret                        |
| NOTION_DATABASE_ID       | Notion database ID                                        |
| TARGET_PARENT_CHANNEL_ID | Parent Discord channel ID where study threads are created |

### Installation

```bash
npm install
```

### Run

```bash
npm start
```

Or run directly:

```bash
node index.js
```

### Discord Bot Settings

Enable the following Privileged Gateway Intents in the Discord Developer Portal.

* Message Content Intent
* Server Members Intent

Required bot permissions:

* View Channels
* Read Message History
* Send Messages

### Notion Settings

To use the Notion database, follow these steps.

1. Create a Notion Integration
2. Copy the Internal Integration Secret
3. Connect the Integration to the target Notion database
4. Make sure the Notion database property names match the code

### Security

The `.env` file contains sensitive tokens and must not be uploaded to GitHub.

Add the following items to `.gitignore`.

```gitignore
.env
node_modules
.DS_Store
```

If a token is accidentally uploaded to GitHub, regenerate the token immediately.

### Use Case

This bot was created to automate blog submission management in a technical blog study group.

Instead of manually checking Discord messages and recording submissions in Notion, the bot automatically collects submitted blog links and stores them in a structured Notion database.

This makes it easier to manage submission status, deadlines, authors, and study records.

---

## 한국어

### 개요

Blog Notion Discord는 Discord 스터디 스레드에 제출된 블로그 링크를 수집하고, 해당 정보를 Notion 데이터베이스에 자동으로 기록하는 Node.js 기반 봇입니다.

스터디원이 Discord 스레드에 블로그 링크를 제출하면, 봇이 메시지에서 URL을 추출하고 블로그 글 제목, 작성자, 제출일, 마감일 등의 정보를 Notion 데이터베이스에 저장합니다.

이 프로젝트는 기술 블로그 스터디 운영 과정에서 제출 기록을 수동으로 관리하는 번거로움을 줄이기 위해 제작되었습니다.

### 주요 기능

* Discord 스터디 스레드의 블로그 링크 자동 수집
* 활성 스레드 및 보관된 public 스레드 동기화
* Discord Embed 또는 페이지 메타데이터 기반 글 제목 추출
* Notion 데이터베이스에 제출 기록 저장
* Discord 서버 닉네임 및 계정명 저장
* Discord 메시지 작성 시간을 제출일로 저장
* 스레드 제목에서 마감일 자동 추출
* 중복 링크 저장 방지
* Discord 스레드 ID, 메시지 ID 저장을 통한 추적 관리

### 기술 스택

* Node.js
* discord.js
* Notion API
* dotenv

### 프로젝트 구조

```bash
blog-notion-discord
├── index.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
```

### Notion 데이터베이스 속성

Notion 데이터베이스에는 아래 속성이 필요합니다.

| 속성명            | 타입    | 설명                |
| -------------- | ----- | ----------------- |
| 글 제목           | Title | 블로그 글 제목          |
| 이름             | Text  | Discord 서버 닉네임    |
| 디스코드 명         | Text  | Discord 계정명       |
| 블로그 링크         | URL   | 제출된 블로그 URL       |
| 제출일            | Date  | Discord 메시지 작성 시간 |
| 마감일            | Date  | 스레드 제목에서 추출한 마감일  |
| 분류             | Text  | 제출 분류             |
| Discord 쓰레드 ID | Text  | Discord 스레드 ID    |
| Discord 메시지 ID | Text  | Discord 메시지 ID    |

### 스레드 제목 규칙

봇은 Discord 스레드 제목에서 마감일을 추출합니다.

예시:

```text
26.06.25 | Notion
```

위 스레드 제목은 아래 날짜로 저장됩니다.

```text
2026-06-25
```

지원하는 날짜 형식은 다음과 같습니다.

```text
YY.MM.DD
YYYY-MM-DD
```

### 환경 변수 설정

`.env.example` 파일을 참고하여 `.env` 파일을 생성합니다.

```env
DISCORD_TOKEN=your_discord_bot_token
NOTION_TOKEN=your_notion_internal_integration_secret
NOTION_DATABASE_ID=your_notion_database_id
TARGET_PARENT_CHANNEL_ID=your_discord_parent_channel_id
```

| 변수명                      | 설명                                 |
| ------------------------ | ---------------------------------- |
| DISCORD_TOKEN            | Discord Bot Token                  |
| NOTION_TOKEN             | Notion Internal Integration Secret |
| NOTION_DATABASE_ID       | Notion 데이터베이스 ID                   |
| TARGET_PARENT_CHANNEL_ID | 스레드가 생성되는 Discord 부모 채널 ID         |

### 설치

```bash
npm install
```

### 실행

```bash
npm start
```

또는 직접 실행할 수 있습니다.

```bash
node index.js
```

### Discord Bot 설정

Discord Developer Portal에서 아래 Privileged Gateway Intents를 활성화해야 합니다.

* Message Content Intent
* Server Members Intent

봇 초대 시 필요한 권한은 다음과 같습니다.

* View Channels
* Read Message History
* Send Messages

### Notion 설정

Notion 데이터베이스를 사용하기 위해 다음 설정이 필요합니다.

1. Notion Integration 생성
2. Internal Integration Secret 발급
3. 사용할 Notion 데이터베이스에 Integration 연결
4. Notion 데이터베이스 속성 이름과 코드의 속성 이름 일치 여부 확인

### 보안 주의사항

`.env` 파일에는 Discord Bot Token과 Notion Integration Secret이 포함되므로 GitHub에 업로드하지 않습니다.

`.gitignore`에 아래 항목을 추가해야 합니다.

```gitignore
.env
node_modules
.DS_Store
```

토큰이 실수로 GitHub에 업로드된 경우 즉시 토큰을 재발급해야 합니다.

### 활용 사례

이 봇은 기술 블로그 스터디 운영 과정에서 제출 기록을 자동화하기 위해 제작되었습니다.

기존에는 스터디원이 Discord에 제출한 블로그 링크를 수동으로 확인하고 Notion에 기록해야 했지만, 이 봇을 통해 Discord 제출 메시지를 기준으로 Notion 데이터베이스에 자동 기록되도록 개선했습니다.

이를 통해 제출 여부 확인, 마감일별 관리, 작성자별 기록 관리가 더 편리해졌습니다.

---

## License

This project is licensed under the MIT License.
