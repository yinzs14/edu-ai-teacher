const PptxGenJS = require("pptxgenjs");
const ppt = new PptxGenJS();

// 设置幻灯片尺寸（16:9）
ppt.layout = "LAYOUT_16x9";

// 定义颜色主题
const COLORS = {
  primary: "1E3A8A",      // 深蓝
  secondary: "3B82F6",    // 亮蓝
  accent: "F59E0B",       // 橙色强调
  light: "EFF6FF",        // 浅蓝背景
  white: "FFFFFF",
  dark: "1F2937",
  green: "10B981",
  red: "EF4444",
  purple: "8B5CF6"
};

// 定义通用字体（Windows 常见）
const FONT = "Microsoft YaHei";
const FONT_EN = "Arial";

// 辅助函数：添加标题
function addTitle(slide, text, y = 0.5, fontSize = 36, color = COLORS.primary) {
  slide.addText(text, {
    x: 0.5, y: y, w: "90%", h: 0.8,
    fontSize: fontSize,
    fontFace: FONT,
    color: color,
    bold: true,
    align: "center"
  });
}

// 辅助函数：添加副标题
function addSubtitle(slide, text, y = 1.3, fontSize = 18, color = COLORS.dark) {
  slide.addText(text, {
    x: 0.5, y: y, w: "90%", h: 0.5,
    fontSize: fontSize,
    fontFace: FONT,
    color: color,
    align: "center"
  });
}

// 辅助函数：添加正文
function addBody(slide, text, x, y, w, h, fontSize = 16, color = COLORS.dark) {
  slide.addText(text, {
    x: x, y: y, w: w, h: h,
    fontSize: fontSize,
    fontFace: FONT,
    color: color,
    valign: "top"
  });
}

// 辅助函数：添加色块文本
function addBox(slide, text, x, y, w, h, bgColor, textColor = COLORS.white, fontSize = 14) {
  slide.addText(text, {
    x: x, y: y, w: w, h: h,
    fontSize: fontSize,
    fontFace: FONT,
    color: textColor,
    align: "center",
    valign: "middle",
    fill: { color: bgColor },
    shape: ppt.ShapeType.rect,
    line: { color: bgColor, width: 0 }
  });
}

// ==================== Slide 1: 封面 ====================
let slide = ppt.addSlide();
slide.background = { color: COLORS.light };
addTitle(slide, "The Future is Yours! 🚀", 2.5, 44, COLORS.primary);
addSubtitle(slide, "一般将来时 · General Future Tense", 3.3, 24, COLORS.secondary);
addSubtitle(slide, "初中英语体验课 | 30分钟", 4.0, 16, COLORS.dark);
// 装饰条
slide.addShape(ppt.ShapeType.rect, {
  x: 3.5, y: 4.5, w: 3, h: 0.1,
  fill: { color: COLORS.accent }
});

// ==================== Slide 2: 学习目标 ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.white };
addTitle(slide, "Today's Mission", 0.5, 32, COLORS.primary);
slide.addText([
  { text: "1. 🔮 掌握 will / be going to 的结构", options: { fontSize: 20, fontFace: FONT, color: COLORS.dark } },
  { text: "2. 🎯 能区分\"临时决定\"和\"事先计划\"", options: { fontSize: 20, fontFace: FONT, color: COLORS.dark, breakLine: true } },
  { text: "3. 🎤 能用将来时描述你的未来计划", options: { fontSize: 20, fontFace: FONT, color: COLORS.dark, breakLine: true } }
], { x: 1, y: 1.8, w: "80%", h: 3, lineSpacing: 40 });

// ==================== Slide 3: Time Capsule ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.light };
addTitle(slide, "Time Capsule 💊", 0.5, 32, COLORS.primary);
addSubtitle(slide, "假如我们把现在的愿望放进时间胶囊，10年后打开...", 1.3, 16, COLORS.dark);
addBody(slide, 
  "What will you be like in 10 years?\n\nWhat are you going to do this weekend?\n\n\n【互动】随机问2-3位学生，允许中文回答，引出\"将来\"概念",
  1, 2.2, "80%", 3, 18, COLORS.dark
);

// ==================== Slide 4: Tom's Weekend ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.white };
addTitle(slide, "Meet Tom! 👦", 0.5, 32, COLORS.primary);
addBody(slide,
  "It's Friday. Tom is thinking about his weekend.\n\n" +
  "He is going to play basketball on Saturday morning. (计划)\n\n" +
  "His mom calls: \"Tom, can you wash the dishes?\"\n\n" +
  "\"Okay, I will do it right now.\" (临时决定)\n\n" +
  "【感受】两者都表将来，但感觉不一样！",
  1, 1.5, "80%", 4, 18, COLORS.dark
);

// ==================== Slide 5: will 结构 ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.light };
addTitle(slide, "will — 你的未来\"万能钥匙\"", 0.5, 32, COLORS.primary);
addBody(slide,
  "✅ 肯定：I / You / He / She / It / We / They + will + V原\n" +
  "    例：I will study hard.\n\n" +
  "❌ 否定：... + will not (won't) + V原\n" +
  "    例：I won't give up.\n\n" +
  "❓ 疑问：Will + ... + V原?\n" +
  "    例：Will you help me?\n\n" +
  "🎵 口诀：\"will后面动词原，否定won't疑问Will提\"",
  1, 1.5, "80%", 4, 18, COLORS.dark
);

// ==================== Slide 6: will 预测 ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.white };
addTitle(slide, "🔮 Prediction — 我猜我猜我猜猜猜", 0.5, 32, COLORS.primary);
addBody(slide,
  "I think it will rain tomorrow. (基于看法)\n\n" +
  "Maybe she will be a doctor. (基于猜测)\n\n" +
  "I'm sure we will win the game! (基于信心)\n\n" +
  "关键词：think / maybe / I'm sure / probably / I believe",
  1, 1.5, "80%", 4, 18, COLORS.dark
);

// ==================== Slide 7: will 临时决定 ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.light };
addTitle(slide, "⚡ Spontaneous Decision — 说做就做！", 0.5, 32, COLORS.primary);
addBody(slide,
  "电话铃响 📞\n" +
  "Tom: \"I'll answer it!\"\n\n" +
  "妈妈敲门 🚪\n" +
  "Tom: \"I'll open the door.\"\n\n" +
  "核心：说话时\"刚想到、刚决定\"\n" +
  "不是昨天计划的，是现在决定的！",
  1, 1.5, "80%", 4, 18, COLORS.dark
);

// ==================== Slide 8: Quick Response ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.white };
addTitle(slide, "Quick Response ⚡ 快闪挑战！", 0.5, 32, COLORS.primary);
addSubtitle(slide, "看到图片，3秒内用 will 回答！", 1.2, 18, COLORS.red);
addBody(slide,
  "🌧️ 乌云 → I think it will rain.\n\n" +
  "🎂 生日蛋糕 → She will be happy.\n\n" +
  "🏆 奖杯 → We will win!\n\n" +
  "📱 手机没电 → My phone will die.\n\n" +
  "🐱 猫看着鱼缸 → The cat will catch the fish!",
  1, 2, "80%", 3.5, 20, COLORS.dark
);

// ==================== Slide 9: be going to 结构 ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.light };
addTitle(slide, "be going to — 你的未来\"计划表\"", 0.5, 32, COLORS.primary);
addBody(slide,
  "✅ 肯定：I am / You are / He is + going to + V原\n" +
  "    例：I am going to visit Beijing.\n\n" +
  "❌ 否定：... + am/are/is + not + going to + V原\n" +
  "    例：He is not going to stay at home.\n\n" +
  "❓ 疑问：Am / Are / Is + ... + going to + V原?\n" +
  "    例：Are you going to study tonight?\n\n" +
  "⚠️ 注意 be 动词的变化！\n" +
  "🎵 口诀：\"be going to 动词原，be变am/is/are不能忘\"",
  1, 1.5, "80%", 4, 18, COLORS.dark
);

// ==================== Slide 10: be going to 计划 ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.white };
addTitle(slide, "📋 Plan — 我早就想好啦！", 0.5, 32, COLORS.primary);
addBody(slide,
  "I'm going to visit my grandma this Sunday. (已经约好)\n\n" +
  "She's going to learn French next month. (已经报了班)\n\n" +
  "We're going to have a party. (已经准备了蛋糕)\n\n" +
  "关键词：this Sunday / next month / tonight / tomorrow / already planned",
  1, 1.5, "80%", 4, 18, COLORS.dark
);

// ==================== Slide 11: be going to 有证据 ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.light };
addTitle(slide, "🔍 Evidence-based Prediction — 有图有真相！", 0.5, 32, COLORS.primary);
addBody(slide,
  "will（无证据）：I think it will rain. (我只是觉得)\n\n" +
  "be going to（有证据）：Look at those black clouds! It's going to rain. (云已经在了！)\n\n" +
  "Oh no! The milk smells bad. It's going to go sour.\n\n" +
  "She's running very fast. She is going to win.",
  1, 1.5, "80%", 4, 18, COLORS.dark
);

// ==================== Slide 12: Plan or Guess? ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.white };
addTitle(slide, "Plan or Guess? 🕵️ 侦探判断！", 0.5, 32, COLORS.primary);
addBody(slide,
  "1. I'm thirsty. → I ____ get you some water. (will)\n\n" +
  "2. She has bought a ticket. → She ____ fly to Paris. (is going to)\n\n" +
  "3. I think the movie ____ be boring. (will)\n\n" +
  "4. Look! The bus is coming. → It ____ stop soon. (is going to)\n\n" +
  "5. Can you help me? → Sure, I ____ help you. (will)\n\n" +
  "6. I've decided. → I ____ study medicine. (am going to)",
  1, 1.5, "80%", 4, 18, COLORS.dark
);

// ==================== Slide 13: 对比总结 ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.light };
addTitle(slide, "终极对决！⚔️ will vs be going to", 0.5, 32, COLORS.primary);

// 表格
tableData = [
  [{ text: "用法", options: { bold: true, fill: COLORS.primary, color: COLORS.white } },
   { text: "will", options: { bold: true, fill: COLORS.secondary, color: COLORS.white } },
   { text: "be going to", options: { bold: true, fill: COLORS.accent, color: COLORS.white } }],
  ["预测", "无证据，凭感觉/看法", "有证据/迹象"],
  ["决定", "说话时临时决定", "事先计划好的"],
  ["时间感", "较远/不确定", "较近/已确定"],
  ["关键词", "think, maybe, probably", "look, already, plan"],
  ["例句", "I will call you. (随口)", "I'm going to call you at 8. (已约定)"]
];
slide.addTable(tableData, {
  x: 0.5, y: 1.5, w: "90%", h: 3,
  fontFace: FONT, fontSize: 14,
  color: COLORS.dark,
  border: { pt: 1, color: "CCCCCC" },
  colW: [2, 4, 4]
});
addSubtitle(slide, "🎵 口诀：Will随口说未来，be going to计划来！没证据用will，有迹象用be going to。", 4.8, 14, COLORS.red);

// ==================== Slide 14: Future Fair ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.white };
addTitle(slide, "Future Fair 2050 🏙️", 0.5, 32, COLORS.primary);
addBody(slide,
  "每组（3-4人）设计一个\"未来发明\"或\"未来学校\"\n\n" +
  "必须包含至少 5个将来时句子（will / be going to 混合）\n\n" +
  "2分钟准备，1分钟展示\n\n" +
  "语言支架：\n" +
  "• We are going to create a ...\n" +
  "• It will help people ...\n" +
  "• Students will be able to ...\n" +
  "• We are going to use ...\n" +
  "• In the future, ... will ...",
  1, 1.5, "80%", 4.5, 16, COLORS.dark
);

// ==================== Slide 15: 展示时间 ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.light };
addTitle(slide, "Welcome to the Future Fair! ⭐", 0.5, 32, COLORS.primary);
addBody(slide,
  "每组1分钟展示\n\n" +
  "其他组做\"评委\"：用 👍 / 🌟 / 🎉 投票\n\n" +
  "评价维度：\n" +
  "  ✅ 语法正确性\n" +
  "  ✅ 创意指数\n" +
  "  ✅ 团队合作\n\n" +
  "Every idea is amazing!",
  1, 1.5, "80%", 4, 20, COLORS.dark
);

// ==================== Slide 16: 思维导图 ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.white };
addTitle(slide, "一般将来时 — 知识地图 🗺️", 0.5, 32, COLORS.primary);
addBody(slide,
  "General Future Tense\n\n" +
  "├─ will → 预测(think) / 临时决定(Oh!)\n" +
  "├─ be going to → 计划(plan) / 有证据(Look!)\n" +
  "├─ 结构 → will + V原 / be + going to + V原\n" +
  "└─ 标志词 → tomorrow, next week, soon, in 2025",
  1, 1.5, "80%", 4, 20, COLORS.dark
);

// ==================== Slide 17: 分层作业 ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.light };
addTitle(slide, "Choose Your Challenge! 🎮", 0.5, 32, COLORS.primary);
addBody(slide,
  "Level 1 — 基础巩固（必做）：\n" +
  "  完成 Worksheet：10道 will / be going to 填空\n\n" +
  "Level 2 — 能力提升（选做）：\n" +
  "  写一段 \"My Future Life\"（50-80词）\n" +
  "  至少包含 2个 will 和 2个 be going to\n\n" +
  "Level 3 — 创意挑战（挑战）：\n" +
  "  画一张 \"Future Me\" 海报\n" +
  "  用英语标注 5个未来计划/预测",
  1, 1.5, "80%", 4.5, 18, COLORS.dark
);

// ==================== Slide 18: 结束页 ====================
slide = ppt.addSlide();
slide.background = { color: COLORS.primary };
addTitle(slide, "The future belongs to those who", 1.5, 28, COLORS.white);
addTitle(slide, "believe in the beauty of their dreams. ✨", 2.2, 24, COLORS.accent);
addSubtitle(slide, "— Eleanor Roosevelt", 3.0, 14, COLORS.light);
addSubtitle(slide, "Your future starts today. What are you going to do?", 3.8, 18, COLORS.white);

// ==================== 保存文件 ====================
const outputPath = "D:\\AI备课助手\\edu-ai-teacher\\General-Future-Tense-30min-Experience.pptx";
ppt.writeFile({ fileName: outputPath })
  .then(() => {
    console.log("✅ PPT 生成成功！");
    console.log("文件路径：" + outputPath);
  })
  .catch(err => {
    console.error("❌ 生成失败：", err);
    process.exit(1);
  });
