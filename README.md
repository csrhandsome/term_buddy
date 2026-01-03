# TermBuddy

一个跑在终端里的“同频搭子”。你敲键盘，它也知道你在努力；你想专注，它就给你上钟；你想互动，它还能帮你把“礼物”从你这边丢到对面。

## 安装

```bash
npm install -g @three333/termbuddy
```

## 启动

```bash
termbuddy
```

进入后：

- 先取个昵称（直接回车用默认也行）
- `[1]` 建房（Host）：会在局域网里广播房间
- `[2]` 加入（Join）：扫描局域网，选择房间加入

常用按键：

- `/` 打开/关闭 AI Console
- `q` 结束本次陪伴（或在菜单里退出）
- 扫描页 `b` 返回
- 倒计时进行中按 `x` 取消

## 核心功能

- **局域网组队**：Host 用 UDP 广播房间（`UDP 45888`），客户端扫描后用 TCP 连接同步状态（默认 `TCP 45999`）。
- **敲键盘状态同步**：本地输入会变成 `TYPING/IDLE`，对面会看到你在不在“认真”。
  - 可选：`TERMBUDDY_ACTIVITY_SOURCE=keyboard` 用全局键盘监听统计活跃（适合你不在这个终端里敲字也想计入活跃的场景）。
- **专注倒计时**：倒计时会显示成一个小钟表 sprite，并在结束/取消后退出舞台。
- **互动投掷物**：你可以在你和 buddy 之间投掷物品（例如 `ROSE/POOP/HAMMER`），终端里会看到飞行动画。
- **小猫气泡**：可以在小猫头上弹出一句话（适合“加油”“别摸鱼”等短提示）。
- **AI Console（可选）**：按 `/` 召唤一个极简 AI 助手，它可以调用工具帮你：
  - `start_countdown` 开始倒计时
  - `throw_projectile` 投掷互动
  - `show_bubble` 显示气泡

### AI Key（DeepSeek）

AI Console 会提示你输入 DeepSeek API Key。当前实现会把 key 存到**你运行 `termbuddy` 的当前目录**下的 `./src/assets/key.json`。

你也可以手动创建：

```json
{
  "apiKey": "YOUR_DEEPSEEK_API_KEY"
}
```

## 例子（直接对 AI 说）

- “倒计时 25 分钟”
- “扔他一个玫瑰”
- “在我头上显示气泡：专注 10 分钟”

