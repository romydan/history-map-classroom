---
name: 历史地图课堂
description: 用宋楷、纸色与真实地形，把教材中的时间、地点与因果联系起来。
colors:
  paper: "#fbecdf"
  paper-deep: "#e9dfce"
  ink: "#201b17"
  secondary: "#645a4e"
  red: "#b5452f"
  red-wash: "#f0dccb"
  ochre: "#a87a2c"
  rule: "#c8bba7"
  water: "#b6cbc9"
  action-ivory: "#fff7e7"
  red-hover: "#8d311f"
typography:
  display:
    fontFamily: "AtlasSong, 'Songti SC', 'Noto Serif CJK SC', 'Source Han Serif SC', STSong, SimSun, serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.45
  headline:
    fontFamily: "AtlasSong, 'Songti SC', 'Noto Serif CJK SC', 'Source Han Serif SC', STSong, SimSun, serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1.4
  title:
    fontFamily: "AtlasSong, 'Songti SC', 'Noto Serif CJK SC', 'Source Han Serif SC', STSong, SimSun, serif"
    fontSize: "29px"
    fontWeight: 700
    lineHeight: 1.45
  body:
    fontFamily: "AtlasSong, 'Songti SC', 'Noto Serif CJK SC', 'Source Han Serif SC', STSong, SimSun, serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "AtlasSong, 'Songti SC', 'Noto Serif CJK SC', 'Source Han Serif SC', STSong, SimSun, serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.6
  cartographic:
    fontFamily: "AtlasKai, AtlasSong, 'Songti SC', 'Noto Serif CJK SC', 'Source Han Serif SC', STSong, SimSun, serif"
    fontSize: "26px"
    fontWeight: 400
  utility:
    fontFamily: "'PingFang SC', 'Microsoft YaHei', sans-serif"
    fontSize: "14px"
    lineHeight: 1.8
rounded:
  inset: "2px"
  compact: "3px"
  control: "4px"
  panel: "5px"
  point: "50%"
spacing:
  tight: "4px"
  small: "8px"
  compact: "12px"
  regular: "16px"
  roomy: "20px"
  panel: "24px"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.action-ivory}"
    rounded: "{rounded.panel}"
    padding: "5px 18px"
  button-primary-hover:
    backgroundColor: "{colors.red-hover}"
    textColor: "{colors.action-ivory}"
  button-secondary:
    backgroundColor: "#faf4e966"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "5px 18px"
  button-secondary-hover:
    backgroundColor: "#e9dcc7"
    textColor: "{colors.red}"
  search-field:
    backgroundColor: "#faf5ec66"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "5px 13px"
  date-chip:
    backgroundColor: "#f1e2c8"
    textColor: "#913923"
    rounded: "{rounded.compact}"
    padding: "0 10px"
  lesson-selected:
    backgroundColor: "{colors.red-wash}"
    textColor: "{colors.red}"
    rounded: "{rounded.compact}"
    padding: "10px 7px"
  explanation:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
---

# Design System: 历史地图课堂

## Overview

**Creative North Star: "可读的课程舆图"**

继承江山时序的历史气息，以温暖纸色、宋楷文字、朱砂定位和真实地形构成可阅读、可操作的课堂地图。界面有教材般的秩序，也保留舆图的细节；内容通过主线、背景、经过、影响与探究逐层展开。

教师投屏与学生自主学习同等重要。两种模式共用清楚的时间、地点和事件层级，切换时保留课程、事件和地图位置。地图承担地理表达，地图外只保留纯色和极轻纸纹；边栏、页脚与界面背景不添加装饰山脉。

**Key Characteristics:**

- 温暖纸色与朱砂强调，墨色文字形成阅读骨架。
- 宋体承担界面与正文，楷意书法体只用于地图区域名称。
- 真实地形与可操作的地点、路线、时序共同表达历史。
- 细线、浅色铺底和小圆角组织密集信息。
- 桌面并列阅读，移动端依次呈现地图、时序与详解。

本文件从当前 `classroom/` 实现与桌面、首页、移动截图提取，并合并逐课地图修正后的图层、阶段与窄屏行为。工作区中的实现目录为 `classroom-history-atlas/classroom/`。地图修正的 F1—F7 已在有界独立评审中 resolved，第二轮结论为 ship；该结论不代表 133 课史实全面审计、公开部署验证或原像素门槛通过。原像素复现与流程门槛仍为 partial / open，同视口记录为 0.7234。

## Colors

纸色、朱砂与墨色构成界面，低饱和水色与真实地形组成地图。规范色值以前置 tokens 为准。

### Primary

- **朱砂**（`red`）：主要操作、当前模式、选中课程、当前事件、主要行进线和键盘焦点。贸易、回程、关系与区域按图层语义设色，不能把所有线型都读作同一种行进。
- **浅朱砂纸染**（`red-wash`）：选中行铺底，保留与周围纸面的连续性。
- **深朱砂**（`red-hover`）：主要按钮悬停；通过加深强调当前操作。
- **暖象牙白**（`action-ivory`）：朱砂底上的按钮与时序文字。

### Secondary

- **赭金**（`ochre`）：教材类型、来源与舆图辅助标记的色彩家族，不替代朱砂的当前状态。
- **灰青水色**（`water`）：地图载入与底层水面。完成载入后的海陆颜色来自真实地形影像，不能以一个平面色替代。

### Neutral

- **暖纸**（`paper`）：页面、侧栏、阅读面板和来源抽屉的共同底色。
- **深纸**（`paper-deep`）：保留的纸面深调，与浅染、细线共同形成层次；不是独立卡片层级。
- **墨色**（`ink`）：正文、品牌和主要标题。
- **淡墨**（`secondary`）：帮助、状态、来源说明等次级文字。
- **纸边线**（`rule`）：页眉、侧栏、表格和时序的分隔。

**The 朱砂指向 Rule.** 同一课的地图、课程目录与时序使用同一朱砂状态语言；品牌文字保持墨色，避免与当前事件争夺注意力。

**The 地图内外 Rule.** 地形信息只存在于地图中。地图外使用暖纸与极轻纸纹，不添加装饰山脉。

## Typography

**Display Font:** `AtlasSong`，本地封装的 Noto Serif SC 可变字体子集，按前置 token 中的宋体序列回退。

**Body Font:** 同为 `AtlasSong`。正文与控件保留宋体的书页气息和足够字重。

**Cartographic Font:** `AtlasKai`，本地封装的 Ma Shan Zheng 常规字体子集；用于洲、洋、地形区与历史政权名称。城市地点仍用宋体。

**Utility Font:** 苹方 / 微软雅黑无衬线序列，用于输入、来源说明和保存状态等辅助信息。

**Character:** 宋体的稳定横竖结构承担阅读，地图中的书法区域名提供历史气息。两种本地字体均有来源记录与 SIL OFL 许可；不把书法体扩展到长文或所有按钮。

### Hierarchy

- **Display**：首页“按教材选课”；移动端缩至 29px。
- **Headline**：首页课程预览标题；移动端为 30px。
- **Title**：事件详解标题；中等桌面为 27px，移动端恢复为 29px。投屏状态为 32px。
- **Body**：页面基础阅读规格。桌面事件摘要另用 600 字重、1.4 行高；移动摘要改为 1.8 行高，展开解释为 1.85，供连续阅读。
- **Label**：模式开关的桌面基准。阅读标签、来源链接与课程行按容器缩放，保持清楚的字重层级。
- **Cartographic**：地图区域名称的桌面屏幕字号；窄地图降至 18px，预览窄图为 17px。程序随地图缩放补偿字号。原有事件地点为 14px / 窄图 12px，当前地点为 16px / 窄图 14px；逐课类型化图层的优先地名为桌面 15px / 窄图 14px。历史地名先呈现，现代定位与精度说明放在选中详情或列表中。
- **Utility**：输入与来源信息的辅助规格；搜索输入实际为 15px，来源抽屉为 14px。

**The 字体分工 Rule.** 宋体负责可读内容，楷意书法体负责地图区域名称；地图标签使用浅色描边保持与地形的分离。

## Layout

页面用通栏细页眉和面包屑连接课程与地图。桌面页眉高 64px，面包屑高 61px；普通页面外边距为 24px，面板内部常用 12—24px。密度来自清楚的分组与细分隔线，不依靠大块留白削减内容。

课程首页采用教材、目录、地图预览三个并列区域。常规宽屏列为 `290px minmax(380px,.93fr) minmax(0,1.27fr)`，列间距 18px；宽屏与中屏按现有断点调整。教师与学生入口在预览下方并列，保留同等可发现性。

学习页采用课程边栏、地图、阅读面板的网格。常规列宽为 `252px minmax(0,1fr) 408px`；1600px 以上为 `260px minmax(0,1fr) 430px`；1380px 以下为 `210px minmax(0,1fr) 350px`。地图获得剩余宽度，阅读面板和边栏可独立滚动。工作区下方保留 110px 的本课时序和 49px 的来源页脚。

1100px 以下，课程目录收为可打开的侧栏，地图与 350px 阅读面板并列。760px 以下，页眉分行，教材选项为三列；学习页按地图、时序、阅读面板、来源页脚顺序流式排列。地图高为 48dvh 且至少 355px，含类型化线路的学习地图至少 490px；阅读内容不再被固定高度裁切。首页课程目录在移动端完整展开到页面流中。

前置 spacing tokens 是从实际间距中提取的常用尺度，不是要求所有尺寸都按四的倍数取值。课程行、文字和地图控件保留实现中的细微差异。

## Elevation & Depth

界面以纸面浅染、边框和细线形成结构。常驻面板不加大面积投影；主要按钮、选中模式和地图浮动控件只有轻微阴影。抽屉与临时反馈使用更明显的阴影，帮助识别它们与主阅读面的关系。纸纹来自本地纸张素材，重复尺寸为 627px、透明度为 0.2；不在地图外叠加景物插画。

### Shadow Vocabulary

- **主要操作轻影**（`0 2px 4px #4b251b1c`）：主要按钮。
- **选中模式轻影**（`0 2px 4px #50341c26`）：当前教师 / 学生模式。
- **地图控件轻影**（`0 2px 4px #4c48361a`）：地图上方的功能按钮。
- **目录侧栏阴影**（`8px 0 24px #47341c26`）：1100px 以下展开的课程目录。
- **临时反馈阴影**（`0 6px 24px #34231933`）：底部状态提示。

**The 纸面层次 Rule.** 阅读结构优先使用细线与浅染；投影只承担控件或临时界面的层级提示。

## Shapes

面板与主要按钮使用克制的小圆角（5px），说明展开框、地图控件与次级容器为 4px，课程行与小标签为 3px，地图内框为 2px。地图地点和时序节点使用圆形，不能把这种圆形语言扩展为胶囊形的全部导航。桌面地图有细框和内嵌边距；移动地图贴齐页面两侧，取消横向外框与圆角。

朱砂当前状态同时通过铺底、侧边短线、下划线或圆环表达。地图上的浅色文字描边、路线衬线与双层地点标记服务于地形上的可辨识性。

## Components

### Buttons

明确、紧凑的教材式操作。

- **Primary:** 朱砂底、暖象牙文字、5px 圆角，基础内边距为 5px 18px，最小高度 42px，18px / 700 字重。
- **Secondary:** 浅透明纸底与细赭色边框，与主要按钮同高同形；悬停铺底加深。
- **Hover / Focus:** 主要按钮加深为深朱砂；可交互元素获得 2px 朱砂键盘焦点外框，外偏移 4px。
- **Disabled:** 透明度降至 0.42，取消可用操作指针。时序首尾真实禁用对应按钮。
- **Mode switch:** 一组细框内并列两个按钮，当前模式朱砂填充；移动端独立占一行。视觉强调状态不代表教师比学生更重要。

### Chips

小巧的纸签，标明年份或课程类型。

- **Date:** 细赭边、浅暖染底、3px 圆角，15px 宋体，水平内边距 10px。
- **Lesson kind:** 细框小标签，选中课程时随整行改为朱砂底与浅字。保留“地图 / 专题 / 活动”文本，颜色不独自承担含义。

### Cards / Containers

接近同一页纸上的分栏与注释。

- **Home panels:** 细纸色边框、5px 圆角，内部 12—18px，不使用浮起的卡片阴影。
- **Explanation:** 4px 圆角细框，标题与下箭头为点击区；展开时增加标题下分隔线，首个展开说明强调边框。
- **Reflection:** 浅暖纸染、细边框、小圆角，与解释内容保持可辨认的节奏。

### Inputs / Fields

输入表面延续纸色，用无衬线确保编辑清楚。

- **Search:** 图标、输入与结果列表组合；浅透明纸底、细框、5px 圆角。桌面宽 300px，移动端通栏。空结果为文字说明。
- **Answer:** 4px 圆角、12px 内边距、至少 130px 高，可纵向调整。焦点为朱砂外框；保存状态就近显示。

### Navigation

课程与事件共享一套选择语言。

- **Book / lesson:** 教材有低饱和书脊色条；选中课朱砂浅染与文字，学习页还显示左侧朱砂短线。
- **Reading tabs:** 三个等宽标签，当前项朱砂文字与底部短下划线；移动端仍保持三项同级。
- **Timeline:** 细水平连线与圆节点表示同课事件。当前项用朱砂圆环、底色与年份 / 事件文本共同标识；移动端放在地图之后，并保留上一步、下一步和序号。

### Historical map

真实地理是地图的基础，不能从效果图临摹海岸与山形。地图按本课的空间问题组织，时间线本身不构成路线。

- **Basemap:** Natural Earth 陆地、河流与 Natural Earth II 地形水面影像，按同一墨卡托坐标对齐；影像应用低饱和、轻褐与增亮处理（`saturate(.55) sepia(.2) brightness(1.08)`、透明度 0.9）。
- **Learning contract:** `data/map-learning.json` 为六册 133 课分别声明地图用途、读图能力、选择理由与地图计划；当前含 100 条类型化线路、55 个区域和 93 道读图题，与 358 个课程节点关联。这些数字描述数据与交互覆盖，不证明全部教材正文或史实已完成核验。地点、主题与活动课保留其适当表达，不为了凑路线连接事件。
- **Historical context:** 地形与海岸为现代地理参照。中国史的课程相关政权快照来自江山时序，浅染且明确为教学近似；阶段可声明背景参照年，长期或未标单年的主题也有明确背景。世界史的区域、战线、成员分布与现代国土定位分别说明用途，现代轮廓不能冒充历史疆界。
- **Typed marks:** 当前事件仍用朱砂双层圆点。使团出行、行军、航行、贸易路网、强迫贩运、阵营关系、战线与范围各有类别和图例；只有声明方向的线才画箭头，双向交流网、关系线与分界不自动当作单程旅途。区域浅染并写明范围性质。具名地点可选择或键盘操作，详情保留年代与说明。
- **Stage state:** 图层绑定事件，区分当前、此前、后续、背景与全课总览。当前行进线加重并置于上层，此前与背景减弱，后续用浅灰虚线并标为参照；总览呈现全课关系，不把后来的经过暗示为当时已经完成。长征主线与 1936 年不同部队会师分开；张骞首次使团去回程、第二次出使区域定位、后世贸易网络及治理活动分开。
- **Legend / scale:** 图例根据本课实际线组、范围和地点生成，名称表达图层含义；有线路时提供“全课总览 / 按时序”。距离尺随缩放与视图中心纬度更新并标注参照纬度。
- **Extent / labels:** 本课和阶段使用编排的教学范围。“定位此段”聚焦线路，重置或总览恢复完整关系。优先保护起讫点、关隘、渡口与分支；标签避让图例、标题注签、控件和比例尺，也不越出地图。窄图保留小组历史主名，必要时隐藏背景、重复或低优先地名，完整名称仍可在地点详情与展开列表查看；不靠统一缩小文字解决拥挤。
- **Annotation:** 选中航行的浅纸朱砂注签避让地点与控件；窄图压缩为人物名。
- **Motion:** 原有新航路航线出现使用 0.8s 的短揭示，地图参照透明度变化为 0.25s；系统减少动态效果偏好关闭动画与过渡。

### Map reading task

读图说明与事件详解共用纸面阅读层级。朱砂小标题后先呈现空间任务和当前阶段提示；原生展开框再提供关键地点、路线与区域、分段定位、精度限制及读图题。提示与“查看读图思路”逐层展开，来源抽屉列出本课依据、页码与实际核验状态。教材或权威机构的宏观证据只支持相应层次的教学概括，不能写成逐日轨迹、精确古国边界或考试必考承诺；未逐课核验的教材正文继续如实标注。

## Do's and Don'ts

### Do:

- **Do** 使用当前实现的暖纸、朱砂与墨色 tokens，并把朱砂连接到课程、地图与时序的同一当前状态。
- **Do** 使用有来源、坐标对齐的真实地形与地理数据，保留地图精度、投影和教学示意说明。
- **Do** 让教师授课与学生学习入口同等可见，并在模式切换中保留课程、事件与地图位置。
- **Do** 通过知识梳理、事件说明与探究逐层提供深度，保持移动端的完整阅读顺序。
- **Do** 保留朱砂键盘焦点、文本状态和减少动态效果支持。

### Don't:

- **Don't** 在地图外添加装饰山脉；界面背景只使用纯色与极轻纸纹。
- **Don't** 把 AI 效果图中的海岸、地形、航线或历史边界直接作为发布地图。
- **Don't** 把书法体用于长正文，或用现代地理参照暗示未经证实的历史疆界。
- **Don't** 用大投影、巨大圆角或浅层卡片列表替代当前细线纸面的内容层级。
- **Don't** 把本视觉文档当作像素复现或独立完成度评审通过的证据。
