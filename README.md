# Context Vocab

<p align="right">
  <strong>中文</strong> | <a href="./README.en.md">English</a>
</p>

![Context Vocab poster](./assets/posters/context-vocab-poster-03-ui-zh.png)

Context Vocab 是一个本地优先的 Chrome 英语语境学习插件。它把“划词查义”改造成一个更完整的学习动作：在当前句子里理解词义、保存到本地生词本、回到来源场景复习，并记录每次 AI 解析的响应时间。

## 主要功能

- **语境解释**：划选英文单词或短语后，基于当前句子生成词典义、此处含义、易混淆边界和记忆钩子。
- **紧凑浮层卡片**：卡片会自动贴合选区位置，包含收藏星标、加载状态、完成耗时和必要解释。
- **即时收藏与高亮**：点击星标后立即保存并高亮当前页面词语；取消收藏后同步移除高亮。
- **整段翻译**：可选地翻译词语所在的短段落，帮助理解完整句群，但会限制上下文长度。
- **本地生词本**：按日期、熟悉度和来源浏览，支持“今日复习”“随机回忆”和每张卡片直接取消收藏。
- **性能可见**：加载时显示 DeepSeek 调用耗时，缓存命中时直接使用本地解释。
- **隐私优先**：没有自带后端服务；API Key 和生词本都保存在本地浏览器存储中。

## 安装使用

```bash
npm install
npm run build
```

然后在 Chrome 中打开 `chrome://extensions`：

1. 开启 Developer mode。
2. 点击 Load unpacked。
3. 选择生成的 `dist/` 文件夹。
4. 打开插件 Options 页面，填入自己的 DeepSeek API Key。

默认配置：

- DeepSeek endpoint: `https://api.deepseek.com/chat/completions`
- Model: `deepseek-v4-flash`
- Auto-save: off
- Cached explanations: on
- Passage translation: off

## 隐私与安全

Context Vocab 不内置任何 API Key，也不会把用户数据同步到项目作者的服务器。

- API Key 存储在 `chrome.storage.local`。
- 生词本、熟悉度、来源记录和缓存解释也存储在 `chrome.storage.local`。
- 默认只发送划选词语和当前句子到用户配置的 DeepSeek endpoint。
- 只有开启“整段翻译”时，才会额外发送附近的短段落；长文本会被裁剪。
- 仓库会排除 `node_modules/`、`dist/`、`.env*`、`.superpowers/` 等本地文件。

公开发布前已把测试里的假 API Key 改成非密钥占位符；如果你 fork 本项目，请不要把自己的 API Key、浏览记录或真实词库提交到仓库。

## 开发

```bash
npm test
npm run typecheck
npm run build
```

项目结构：

- `src/content/`：页面划词、浮层卡片、即时高亮。
- `src/background/`：DeepSeek 请求、缓存、收藏流程。
- `src/popup/`：浏览器右上角快捷面板。
- `src/options/`：API 与卡片显示设置。
- `src/wordbook/`：生词本、复习、来源聚合。
- `tests/`：Vitest 单元测试。

## 海报候选

这些图片是公开 README 和项目宣传用的 AI 生成海报候选，文案和界面为示意图。

| 中文主视觉 | 中文词库视觉 |
| --- | --- |
| ![中文主视觉](./assets/posters/context-vocab-poster-03-ui-zh.png) | ![中文词库视觉](./assets/posters/context-vocab-poster-04-wordbook-zh.png) |

| English UI concept | English privacy concept |
| --- | --- |
| ![English UI concept](./assets/posters/context-vocab-poster-01-ui-en.png) | ![English privacy concept](./assets/posters/context-vocab-poster-02-privacy-en.png) |

| 竖版主视觉 | 竖版词库视觉 |
| --- | --- |
| ![竖版主视觉](./assets/posters/context-vocab-poster-05-ui-zh-vertical.png) | ![竖版词库视觉](./assets/posters/context-vocab-poster-06-wordbook-zh-vertical.png) |

插件图标位于 `assets/icons/`，manifest 已使用 16、32、48 和 128 像素版本。

## 当前状态

这是一个早期可用的 Chrome Extension MVP，适合本地安装、试用和二次开发。它还没有发布到 Chrome Web Store，也没有云同步、PDF 支持或完整的间隔重复算法。

## License

MIT
