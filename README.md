# dsh-token-dog · Token 小狗

> 给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Token 用量面板：按会话、按模型统计消耗，配每日堆叠矩形图与全年日历活跃图。

插件直接读 Session 日志，所以**装上之前的对话也一起统计**，不需要从今天开始重新记账。

```
┌ 总 Token  ┬ 缓存命中率 ┬ 输出 Token ┬ 调用次数 ┐
├ 每日消耗（按会话堆叠的矩形图，悬停看当天构成）  ┤
├ 模型用量（可点进详情）  │  会话排行             ┤
└ 活跃日历（近 52 周，悬停看每日用量）            ┘
```

## 功能

- **概览页**：四张统计卡（总 Token / 缓存命中率 / 输出 Token / 调用次数）、每日消耗矩形图、模型与会话排行、全年日历热力图
- **每日矩形图**：每天一根柱子，按当天消耗的会话堆叠；悬停显示当天总量、调用次数与前 4 个会话的明细
- **模型详情**：点任意模型行进入，看该模型自己的每日矩形图与**全部**消耗过它的会话，可一键返回
- **日历活跃图**：近 52 周、周一开头；5 档强度按当天 Token 的分位数自动分级；列宽不足时自动滚到最近日期
- **区间切换**：近 7 天 / 近 30 天 / 近 90 天 / 全部，作用于统计卡、矩形图、排行与模型详情
- **外观**：8 个低饱和预设色 + 自定义取色器 + 淡/中/浓三档，选择记在 localStorage
- **中英双语**：文案跟随宿主语言；缺字典时回退中文

## 安装

插件是普通的 DSH bundle，不需要构建，也不需要 `node_modules`。

1. 把仓库放到本机任意目录：

   ```bash
   git clone https://github.com/ccoderJava/dsh-token-dog.git
   ```

2. 在 DSH 里安装这个 bundle。任选其一：
   - **交给会话里的 Agent**：说「把 `/path/to/dsh-token-dog` 装成插件」，它会调用 `plugin_manager` 的 `install_bundle`；
   - **命令行**：在已安装 profile 的环境里 `dsh plugin --profile desktop add link:/path/to/dsh-token-dog`。

安装后 profile 的 `package.json` 会多一条 `"dsh-token-dog": "link:..."`，并加入 `dsh.profile.bundles`。

3. 刷新页面（Cmd/Ctrl+R）。入口有两个：
   - 左侧栏底部的**小狗图标**；
   - **设置 → Token 用量**（设置导航最后一项）。

## 使用

### 首页

| 区块 | 内容 |
|---|---|
| 统计卡 | 总 Token、缓存命中率、输出 Token、调用次数；副行是会话数 / 缓存与输入拆分 / 输出占比 / 日均调用 |
| 每日消耗 | 每天一根柱、按会话堆叠（单日最多 6 段，其余合并为「其他」）；悬停看当天构成 |
| 模型用量 | 每个模型的总量、调用次数、涉及会话数；**可点击**进入详情 |
| 会话排行 | 消耗最多的 8 个会话，含调用次数与最后使用日 |
| 活跃日历 | 近 52 周；悬停看当天总 Token / 调用次数 / 会话数 / 主要模型 |

### 模型详情

点模型行进入，面包屑变为 `← 返回` + 模型名，内容替换为该模型的统计卡、每日矩形图，以及**不截断**的会话列表。顶部区间切换对详情同样生效。

### 主题

右上角一排色点：雾蓝 / 青 / 苔绿 / 麦 / 陶土 / 藕紫 / 豆沙 / 中性，最后一个圆点是**自定义取色器**；旁边的「淡 / 中 / 浓」控制同一套色的浓度。两者都会持久化。

## 数据口径

数据只来自 Session 日志（`ctx.sessionQuery`），插件不另建账本。

| 事件 | 用途 |
|---|---|
| `request/header` / `request/context` | 这次调用使用的 provider / model |
| `assistant/message` / `assistant/attempt` | 该次 attempt 的 `usage`（`message` 优先，退回流里的 `usage` chunk） |
| `llm/retry-started` | 重试算作新的一次调用 |
| `session/end-seed`（`inherited`） | fork 继承的父会话事件不重复计数 |

- 单次调用按 `turn:step:attempt` 去重：同一 attempt 后来的采样会覆盖先前的
- 总 Token = `input + cacheRead + cacheWrite + output`（四个桶互不重叠）
- 缓存命中率 = `cacheRead / (cacheRead + input)`
- **不计入**：不在任何 Session 日志里的调用（标题生成、压缩等）。这是「日志即唯一事实来源」的取舍

## 接口

Host 侧注册一条只读路由，仅本机回环可访问：

```
GET /token-dog/usage?tz=Asia/Shanghai[&refresh=1]
```

返回：

```jsonc
{
  "ok": true,
  "generatedAt": 1793860698515,   // 本次扫描完成时间
  "scanMs": 672,
  "timeZone": "Asia/Shanghai",
  "rows": [                        // 已按 day / session / provider / model 聚合
    { "day": "2026-11-04", "session": "session-…", "provider": "deepseek-account",
      "model": "deepseek-flash", "input": 344317, "cacheRead": 8053120,
      "cacheWrite": 0, "output": 141471, "calls": 138 }
  ],
  "sessions": { "session-…": { "title": "…", "createdAt": 1793, "cwd": "…", "origin": "", "parent": "" } },
  "scanned": 26, "skipped": 0, "failures": 0, "failureSample": []
}
```

- 全量扫描结果缓存 60 秒；`refresh=1` 立即重扫
- 扫描期间复用同一次扫描，不会叠并发
- 请求带转发头（`X-Forwarded-For` / `CF-Connecting-IP`）、跨站来源或非回环地址时返回 403

## 目录结构

```
dsh-token-dog/
├── index.js            # Host 半：折叠日志、聚合、注册 /token-dog/usage
├── client.js           # 浏览器半：两个视图、图表、日历、主题
├── cordis.patch.yml    # bundle 补丁：插入 token-dog 这一行
├── package.json        # 清单：dsh.bundle / dsh.client / exports
├── locale/{zh,en}.json # 插件管理器里的标题与描述
├── icon.svg            # 插件图标（自绘）
└── README.md
```

## 开发

- 纯 JavaScript，无构建步骤：改完 `index.js` 宿主侧热重载；改完 `client.js` 页面侧由 DSH 的客户端 HMR 重载，必要时刷新页面
- 自查路由：

  ```bash
  curl -s "http://127.0.0.1:<port>/token-dog/usage?tz=Asia/Shanghai" | head -c 400
  ```

- 调参在 `index.js` 顶部：`SCAN_TTL_MS`（缓存）、`MAX_AGE_DAYS`（扫描窗口）、`MAX_SESSIONS`
- 图表与色板在 `client.js`：`MAX_BARS`、`SEGMENT_LIMIT`、`THEMES`、CSS 变量 `--dtd-ink*` / `--dtd-g*`

## 已知限制

- 只统计**写进 Session 日志**的调用；标题、压缩这类后台调用不计入
- 扫描窗口：最近 400 天内创建、或当前在线的会话，最多 600 个；超出时页面会提示
- 每日矩形图超过 120 天只画最近 120 天
- 依赖宿主的 `settings.section` / `main` / `sidebar.panellist` 席位与 `sessionQuery` 服务；DSH 大版本升级后需重新验收席位行为
- 仅在 DSH `0.2.1-rc.5`（Desktop, macOS）上验证过

## 路线图

- [ ] 估算成本（结合模型计价）
- [ ] 会话详情页（单个会话的日曲线与模型构成）
- [ ] 导出 CSV / JSON
- [ ] 按 workspace 分组统计

## License

[MIT](./LICENSE)
