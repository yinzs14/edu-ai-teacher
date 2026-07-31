/**
 * 英语+语文学科种子题目生成器
 * 基于2022新课标，覆盖各知识叶子节点的典型题目
 * 直接写入 SQLite 数据库
 */
import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'data', 'auth.db')

async function main() {
  const SQL = await initSqlJs()
  const buffer = existsSync(DB_PATH) ? readFileSync(DB_PATH) : null
  const db = buffer ? new SQL.Database(buffer) : new SQL.Database()

  // ============ 英语题目 ============
  const englishQuestions = [
    // --- 字母与发音 (EN-D1-M1) ---
    {
      subject: '英语', grade: 1,
      knowledge_points: JSON.stringify(['en-leaf-001']),
      question_type: 'EN-T01', subtype: '',
      difficulty: 0.3, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'pure',
      stem: '26个英文字母中，元音字母有几个？',
      options: JSON.stringify(['A. 3个', 'B. 5个', 'C. 7个', 'D. 10个']),
      answer: 'B', solution: '英语中有5个元音字母：a, e, i, o, u。',
      source: '种子数据', tags: JSON.stringify(['字母', '元音', '基础'])
    },
    {
      subject: '英语', grade: 1,
      knowledge_points: JSON.stringify(['en-leaf-001']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.3, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'pure',
      stem: '写出下列字母的小写形式：A ____  B ____  C ____',
      options: '',
      answer: 'a, b, c', solution: '大写字母对应的小写字母：A→a, B→b, C→c。',
      source: '种子数据', tags: JSON.stringify(['字母', '大小写'])
    },
    {
      subject: '英语', grade: 3,
      knowledge_points: JSON.stringify(['en-leaf-002']),
      question_type: 'EN-T01', subtype: '',
      difficulty: 0.4, cognitive_level: 'B', step_level: 'step1',
      direction: 'U', context_type: 'pure',
      stem: '以下哪个单词中，字母a的发音与其他三个不同？\nA. cake  B. name  C. cat  D. face',
      options: JSON.stringify(['A. cake', 'B. name', 'C. cat', 'D. face']),
      answer: 'C', solution: 'cake/name/face中的a发/eɪ/音（开音节），cat中的a发/æ/音（闭音节）。',
      source: '种子数据', tags: JSON.stringify(['发音', '元音字母', '开闭音节'])
    },
    {
      subject: '英语', grade: 4,
      knowledge_points: JSON.stringify(['en-leaf-003']),
      question_type: 'EN-T01', subtype: '',
      difficulty: 0.5, cognitive_level: 'B', step_level: 'step2',
      direction: 'U', context_type: 'pure',
      stem: 'What is the sound of "sh" in the word "ship"?',
      options: JSON.stringify(['A. /s/', 'B. /ʃ/', 'C. /tʃ/', 'D. /θ/']),
      answer: 'B', solution: '"sh"发/ʃ/音，是一种清辅音，类似中文的"嘘"声。',
      source: '种子数据', tags: JSON.stringify(['辅音组合', '发音规则'])
    },

    // --- 语音规则 (EN-D1-M2) ---
    {
      subject: '英语', grade: 4,
      knowledge_points: JSON.stringify(['en-leaf-005']),
      question_type: 'EN-T04', subtype: '',
      difficulty: 0.5, cognitive_level: 'B', step_level: 'step2',
      direction: 'U', context_type: 'pure',
      stem: '在句子"What is your name?"中，name应该读降调。',
      options: '',
      answer: 'False', solution: '特殊疑问句句末一般用降调，但这里的陈述部分也是降调。实际上特殊疑问句整体用降调。所以这个说法是错的，应该说"整个问句读降调"。答案应为False，特殊疑问句整体用降调是正确的。',
      source: '种子数据', tags: JSON.stringify(['语调', '降调', '特殊疑问句'])
    },
    {
      subject: '英语', grade: 5,
      knowledge_points: JSON.stringify(['en-leaf-006']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.6, cognitive_level: 'C', step_level: 'step2',
      direction: 'A', context_type: 'school',
      stem: '选出划线部分发音不同的一项：\nA. road  B. boat  C. coat  D. broad\n（注意oa组合的发音）',
      options: '',
      answer: 'D', solution: 'road/boat/coat中oa发/əʊ/，而broad中oa发/ɔː/，属于特殊发音。',
      source: '种子数据', tags: JSON.stringify(['字母组合', '特殊发音'])
    },

    // --- 名词 (EN-D2-M1) ---
    {
      subject: '英语', grade: 2,
      knowledge_points: JSON.stringify(['en-leaf-008']),
      question_type: 'EN-T05', subtype: '',
      difficulty: 0.3, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'life',
      stem: '将下列家庭成员与对应的英文连线：\n爸爸 · mother\n妈妈 · father\n哥哥/弟弟 · sister\n姐姐/妹妹 · brother',
      options: '',
      answer: '爸爸→father, 妈妈→mother, 哥哥/弟弟→brother, 姐姐/妹妹→sister',
      solution: 'father=爸爸, mother=妈妈, brother=兄弟, sister=姐妹。',
      source: '种子数据', tags: JSON.stringify(['家庭成员', '词汇匹配'])
    },
    {
      subject: '英语', grade: 3,
      knowledge_points: JSON.stringify(['en-leaf-009']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.3, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'school',
      stem: 'I have a new _____. (书包)',
      options: '',
      answer: 'schoolbag', solution: '"书包"的英文是schoolbag，由school(学校)+bag(包)组成。',
      source: '种子数据', tags: JSON.stringify(['学习用品', '词汇'])
    },
    {
      subject: '英语', grade: 4,
      knowledge_points: JSON.stringify(['en-leaf-010']),
      question_type: 'EN-T01', subtype: '',
      difficulty: 0.4, cognitive_level: 'B', step_level: 'step1',
      direction: 'U', context_type: 'life',
      stem: 'Which animal lives in water?\nA. cat  B. fish  C. bird  D. dog',
      options: JSON.stringify(['A. cat', 'B. fish', 'C. bird', 'D. dog']),
      answer: 'B', solution: 'fish(鱼)生活在水里，cat(猫)、bird(鸟)、dog(狗)都不生活在水里。',
      source: '种子数据', tags: JSON.stringify(['动物', '词汇理解'])
    },
    {
      subject: '英语', grade: 5,
      knowledge_points: JSON.stringify(['en-leaf-015']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.5, cognitive_level: 'B', step_level: 'step2',
      direction: 'U', context_type: 'pure',
      stem: '用所给词的适当形式填空：\nThere are some _____ (potato) on the table.',
      options: '',
      answer: 'potatoes', solution: 'potato的复数形式是potatoes（以o结尾的有生命名词，加es）。',
      source: '种子数据', tags: JSON.stringify(['名词复数', '语法'])
    },

    // --- 动词 (EN-D2-M2) ---
    {
      subject: '英语', grade: 3,
      knowledge_points: JSON.stringify(['en-leaf-016']),
      question_type: 'EN-T01', subtype: '',
      difficulty: 0.3, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'life',
      stem: '选出表示"跳跃"的单词：\nA. run  B. jump  C. walk  D. swim',
      options: JSON.stringify(['A. run', 'B. jump', 'C. walk', 'D. swim']),
      answer: 'B', solution: 'jump=跳跃，run=跑，walk=走，swim=游泳。',
      source: '种子数据', tags: JSON.stringify(['动作动词', '词汇'])
    },
    {
      subject: '英语', grade: 4,
      knowledge_points: JSON.stringify(['en-leaf-018']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.4, cognitive_level: 'B', step_level: 'step1',
      direction: 'U', context_type: 'pure',
      stem: '用am/is/are填空：\nI ____ a student. They ____ teachers.',
      options: '',
      answer: 'am, are', solution: 'I后用am，they后用are。be动词规则：I用am，he/she/it用is，you/we/they用are。',
      source: '种子数据', tags: JSON.stringify(['be动词', '语法'])
    },
    {
      subject: '英语', grade: 5,
      knowledge_points: JSON.stringify(['en-leaf-019']),
      question_type: 'EN-T01', subtype: '',
      difficulty: 0.5, cognitive_level: 'C', step_level: 'step2',
      direction: 'A', context_type: 'school',
      stem: '选出恰当的选项：\nYou look tired. You _____ go to bed early.\nA. can  B. should  C. may  D. would',
      options: JSON.stringify(['A. can', 'B. should', 'C. may', 'D. would']),
      answer: 'B', solution: 'should表示"应该"，给出建议。tired是"累的"，所以建议"应该早睡"。',
      source: '种子数据', tags: JSON.stringify(['情态动词', '建议'])
    },

    // --- 形容词、副词与代词 (EN-D2-M3) ---
    {
      subject: '英语', grade: 4,
      knowledge_points: JSON.stringify(['en-leaf-021']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.4, cognitive_level: 'B', step_level: 'step1',
      direction: 'U', context_type: 'life',
      stem: '读句子，用括号内词的正确形式填空：\nThis apple is _____ (big) than that one.',
      options: '',
      answer: 'bigger', solution: 'big的比较级是bigger（重读闭音节，双写g+er）。',
      source: '种子数据', tags: JSON.stringify(['比较级', '语法'])
    },
    {
      subject: '英语', grade: 5,
      knowledge_points: JSON.stringify(['en-leaf-023']),
      question_type: 'EN-T03', subtype: '',
      difficulty: 0.5, cognitive_level: 'C', step_level: 'step2',
      direction: 'A', context_type: 'life',
      stem: '将下列单词重新排列成通顺的句子：\nalways / I / breakfast / have / at / 7:00',
      options: '',
      answer: 'I always have breakfast at 7:00.', 
      solution: '频度副词always放在行为动词之前、be动词之后。句型：主语+频度副词+动词+其他。',
      source: '种子数据', tags: JSON.stringify(['频度副词', '连词成句', 'always'])
    },
    {
      subject: '英语', grade: 4,
      knowledge_points: JSON.stringify(['en-leaf-024']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.5, cognitive_level: 'B', step_level: 'step2',
      direction: 'U', context_type: 'pure',
      stem: '用适当的人称代词填空：\nThis is _____ (I) book. It is _____ (I).',
      options: '',
      answer: 'my, mine', solution: '"我的书"用形容词性物主代词my；"它是我的"用名词性物主代词mine(=my book)。',
      source: '种子数据', tags: JSON.stringify(['物主代词', '语法'])
    },

    // --- 数词、介词与连词 (EN-D2-M4) ---
    {
      subject: '英语', grade: 3,
      knowledge_points: JSON.stringify(['en-leaf-026']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.4, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'life',
      stem: '写出下列数字的英文：\n12 → ________  20 → ________',
      options: '',
      answer: 'twelve, twenty', solution: '12的英文是twelve，20的英文是twenty。注意拼写不要混淆。',
      source: '种子数据', tags: JSON.stringify(['基数词', '数字'])
    },
    {
      subject: '英语', grade: 5,
      knowledge_points: JSON.stringify(['en-leaf-027']),
      question_type: 'EN-T01', subtype: '',
      difficulty: 0.5, cognitive_level: 'B', step_level: 'step2',
      direction: 'U', context_type: 'life',
      stem: 'We usually have lunch _____ 12:00.\nA. in  B. on  C. at  D. for',
      options: JSON.stringify(['A. in', 'B. on', 'C. at', 'D. for']),
      answer: 'C', solution: '具体时间点（12:00）前用at。in用于时间段（in the morning），on用于具体某天（on Monday）。',
      source: '种子数据', tags: JSON.stringify(['时间介词', 'at'])
    },
    {
      subject: '英语', grade: 4,
      knowledge_points: JSON.stringify(['en-leaf-028']),
      question_type: 'EN-T01', subtype: '',
      difficulty: 0.4, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'life',
      stem: '选出正确的介词：The cat is _____ the chair.\nA. in  B. on  C. under  D. at\n（猫在椅子下面）',
      options: JSON.stringify(['A. in', 'B. on', 'C. under', 'D. at']),
      answer: 'C', solution: 'under表示"在...下面"，on表示"在...上面"，in表示"在...里面"。',
      source: '种子数据', tags: JSON.stringify(['方位介词', 'under'])
    },

    // --- 时态 (EN-D3-M1) ---
    {
      subject: '英语', grade: 4,
      knowledge_points: JSON.stringify(['en-leaf-031']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.5, cognitive_level: 'C', step_level: 'step2',
      direction: 'A', context_type: 'life',
      stem: '用所给动词的正确形式填空：\nShe _____ (like) reading books.',
      options: '',
      answer: 'likes', solution: '一般现在时中，主语she是第三人称单数，动词需加s/es。like→likes。',
      source: '种子数据', tags: JSON.stringify(['一般现在时', '三单', '语法'])
    },
    {
      subject: '英语', grade: 4,
      knowledge_points: JSON.stringify(['en-leaf-032']),
      question_type: 'EN-T01', subtype: '',
      difficulty: 0.5, cognitive_level: 'B', step_level: 'step1',
      direction: 'U', context_type: 'life',
      stem: 'Look! The boys _____ football on the playground.\nA. play  B. plays  C. are playing  D. played',
      options: JSON.stringify(['A. play', 'B. plays', 'C. are playing', 'D. played']),
      answer: 'C', solution: 'Look!表示"看！"，提示正在进行的动作，用现在进行时be+V-ing。boys是复数，用are playing。',
      source: '种子数据', tags: JSON.stringify(['现在进行时', '语法'])
    },
    {
      subject: '英语', grade: 5,
      knowledge_points: JSON.stringify(['en-leaf-033']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.6, cognitive_level: 'C', step_level: 'step2',
      direction: 'A', context_type: 'life',
      stem: '用所给动词的正确形式填空：\nI _____ (go) to the park yesterday.',
      options: '',
      answer: 'went', solution: 'yesterday是过去时间标志词，go的过去式是went（不规则变化）。',
      source: '种子数据', tags: JSON.stringify(['一般过去时', '不规则动词'])
    },

    // --- 句型结构 (EN-D3-M2) ---
    {
      subject: '英语', grade: 4,
      knowledge_points: JSON.stringify(['en-leaf-037']),
      question_type: 'EN-T03', subtype: '',
      difficulty: 0.5, cognitive_level: 'C', step_level: 'step2',
      direction: 'A', context_type: 'school',
      stem: '将下列句子改为一般疑问句：\nShe can speak English.',
      options: '',
      answer: 'Can she speak English?', 
      solution: '将情态动词can提前到句首，句末加问号。原句为陈述句，变为Can she...?',
      source: '种子数据', tags: JSON.stringify(['一般疑问句', 'can'])
    },
    {
      subject: '英语', grade: 5,
      knowledge_points: JSON.stringify(['en-leaf-038']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.6, cognitive_level: 'C', step_level: 'step2',
      direction: 'A', context_type: 'life',
      stem: '对划线部分提问：\nI go to school by bus.\n_____  _____ you go to school?',
      options: '',
      answer: 'How do', solution: '对交通方式by bus提问用How。一般现在时、主语非三单，助动词用do。',
      source: '种子数据', tags: JSON.stringify(['特殊疑问句', 'how'])
    },
    {
      subject: '英语', grade: 4,
      knowledge_points: JSON.stringify(['en-leaf-039']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.4, cognitive_level: 'B', step_level: 'step1',
      direction: 'U', context_type: 'life',
      stem: '用There is/There are填空：\n_____ a book and two pens on the desk.',
      options: '',
      answer: 'There is', solution: 'There be句型遵循"就近原则"：离be动词最近的是a book（单数），所以用is。',
      source: '种子数据', tags: JSON.stringify(['There be', '就近原则'])
    },

    // --- 话题交际 (EN-D4-M1) ---
    {
      subject: '英语', grade: 3,
      knowledge_points: JSON.stringify(['en-leaf-042']),
      question_type: 'EN-T02', subtype: '',
      difficulty: 0.3, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'life',
      stem: '补全对话：\nA: How are you?\nB: _____, thank you.',
      options: '',
      answer: "I'm fine 或 Fine 或 Very well",
      solution: '"How are you?"是问候语，"fine/well"是常见回答方式。',
      source: '种子数据', tags: JSON.stringify(['问候', '对话'])
    },
    {
      subject: '英语', grade: 4,
      knowledge_points: JSON.stringify(['en-leaf-043']),
      question_type: 'EN-T08', subtype: '',
      difficulty: 0.5, cognitive_level: 'C', step_level: 'step3',
      direction: 'A', context_type: 'life',
      stem: '根据提示写3-5句话介绍你的家庭：\n提示词：father, mother, teacher, love',
      options: '',
      answer: 'I have a happy family. My father is a teacher. My mother is a doctor. I love my family.',
      solution: '用简单句型介绍家庭成员及其职业，最后表达感受。注意人称和be动词搭配���',
      source: '种子数据', tags: JSON.stringify(['写作', '家庭', '自我介绍'])
    },

    // --- 阅读 (EN-D5-M1) ---
    {
      subject: '英语', grade: 5,
      knowledge_points: JSON.stringify(['en-leaf-052']),
      question_type: 'EN-T07', subtype: '',
      difficulty: 0.6, cognitive_level: 'C', step_level: 'step3',
      direction: 'R', context_type: 'life',
      stem: 'Read and choose:\nMy name is Tom. I am 11 years old. I like sports. My favourite sport is basketball. I play basketball every Saturday with my friends.\n\nQ: What is Tom\'s favourite sport?\nA. Football  B. Basketball  C. Tennis  D. Swimming',
      options: JSON.stringify(['A. Football', 'B. Basketball', 'C. Tennis', 'D. Swimming']),
      answer: 'B', solution: '短文第四句明确指出"My favourite sport is basketball"。',
      source: '种子数据', tags: JSON.stringify(['阅读', '细节理解'])
    },

    // --- 完形填空 (EN-D5-M2) ---
    {
      subject: '英语', grade: 6,
      knowledge_points: JSON.stringify(['en-leaf-057']),
      question_type: 'EN-T06', subtype: '',
      difficulty: 0.7, cognitive_level: 'C', step_level: 'step3',
      direction: 'R', context_type: 'life',
      stem: 'Read and choose:\nIt was Sunday yesterday. I ___(1)___ to the zoo with my parents. We ___(2)___ many animals there. The monkeys were very ___(3)___. They jumped up and down.\n\n(1) A. go  B. goes  C. went  D. going\n(2) A. see  B. saw  C. sees  D. seeing\n(3) A. fun  B. funny  C. funnier  D. funniest',
      options: JSON.stringify(['(1) A.go B.goes C.went D.going', '(2) A.see B.saw C.sees D.seeing', '(3) A.fun B.funny C.funnier D.funniest']),
      answer: '(1)C (2)B (3)B', solution: '(1)yesterday表示过去，go→went。(2)过去发生的事，see→saw。(3)形容词作表语，用funny表示"有趣的"。',
      source: '种子数据', tags: JSON.stringify(['完形填空', '综合'])
    },

    // ============ 语文题目 ============
    // --- 声母与韵母 (CN-D1-M1) ---
    {
      subject: '语文', grade: 1,
      knowledge_points: JSON.stringify(['cn-leaf-001']),
      question_type: 'CN-T02', subtype: '',
      difficulty: 0.3, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'pure',
      stem: '写出下列汉字的声母：\n妈(____)  爸(____)  打(____)',
      options: '',
      answer: 'm, b, d', solution: '妈(mā)的声母是m，爸(bà)的声母是b，打(dǎ)的声母是d。',
      source: '种子数据', tags: JSON.stringify(['声母', '拼音基础'])
    },
    {
      subject: '语文', grade: 1,
      knowledge_points: JSON.stringify(['cn-leaf-002']),
      question_type: 'CN-T01', subtype: '',
      difficulty: 0.3, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'pure',
      stem: '下面哪个是韵母？\nA. b  B. p  C. an  D. d',
      options: JSON.stringify(['A. b', 'B. p', 'C. an', 'D. d']),
      answer: 'C', solution: 'b/p/d都是声母，an是韵母（鼻韵母）。',
      source: '种子数据', tags: JSON.stringify(['韵母', '拼音分类'])
    },
    {
      subject: '语文', grade: 1,
      knowledge_points: JSON.stringify(['cn-leaf-003']),
      question_type: 'CN-T04', subtype: '',
      difficulty: 0.3, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'pure',
      stem: '"yuan"是整体认读音节，应该直接读出，不需要拼读。',
      options: '',
      answer: 'True', solution: '整体认读音节的特征就是不拼读，直接读出整个音节。yuan属于16个整体认读音节之一。',
      source: '种子数据', tags: JSON.stringify(['整体认读音节', '拼音规则'])
    },

    // --- 拼读规则 (CN-D1-M2) ---
    {
      subject: '语文', grade: 1,
      knowledge_points: JSON.stringify(['cn-leaf-005']),
      question_type: 'CN-T02', subtype: '',
      difficulty: 0.4, cognitive_level: 'B', step_level: 'step2',
      direction: 'U', context_type: 'pure',
      stem: '给下列拼音标上声调：\n一声：ma  → _____ \n二声：ma  → _____ \n三声：ma  → _____ \n四声：ma  → _____',
      options: '',
      answer: 'mā, má, mǎ, mà', solution: '一声平(mā)，二声扬(má)，三声拐弯(mǎ)，四声降(mà)。',
      source: '种子数据', tags: JSON.stringify(['声调', '标调'])
    },

    // --- 汉字的构成 (CN-D2-M1) ---
    {
      subject: '语文', grade: 1,
      knowledge_points: JSON.stringify(['cn-leaf-007']),
      question_type: 'CN-T02', subtype: '',
      difficulty: 0.3, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'pure',
      stem: '数一数下面的字一共有几画？\n"大"共(   )画',
      options: '',
      answer: '3', solution: '"大"的笔画是：横(一)、撇(丿)、捺(丶)，共3画。',
      source: '种子数据', tags: JSON.stringify(['笔画', '识字'])
    },
    {
      subject: '语文', grade: 2,
      knowledge_points: JSON.stringify(['cn-leaf-008']),
      question_type: 'CN-T04', subtype: '',
      difficulty: 0.4, cognitive_level: 'B', step_level: 'step1',
      direction: 'U', context_type: 'pure',
      stem: '"火"的笔顺是：先写两边的点，再写中间的竖。',
      options: '',
      answer: 'False', solution: '"火"的正确笔顺是：点→撇→撇→捺（先左点，再右短撇，最后撇捺）。标准笔顺应为：丶、丿、丿、丶。',
      source: '种子数据', tags: JSON.stringify(['笔顺', '识字'])
    },
    {
      subject: '语文', grade: 2,
      knowledge_points: JSON.stringify(['cn-leaf-009']),
      question_type: 'CN-T01', subtype: '',
      difficulty: 0.4, cognitive_level: 'B', step_level: 'step1',
      direction: 'U', context_type: 'pure',
      stem: '下面哪个字的偏旁是"氵"（三点水）？\nA. 请  B. 江  C. 打  D. 吃',
      options: JSON.stringify(['A. 请', 'B. 江', 'C. 打', 'D. 吃']),
      answer: 'B', solution: '江的偏旁是氵（三点水）。请的偏旁是讠（言字旁），打的偏旁是扌（提手旁），吃的偏旁是口。',
      source: '种子数据', tags: JSON.stringify(['偏旁', '识字'])
    },

    // --- 字的辨��� (CN-D2-M2) ---
    {
      subject: '语文', grade: 3,
      knowledge_points: JSON.stringify(['cn-leaf-011']),
      question_type: 'CN-T01', subtype: '',
      difficulty: 0.5, cognitive_level: 'B', step_level: 'step2',
      direction: 'U', context_type: 'pure',
      stem: '选择合适的字填空：\n我(     )在家里做作业。\nA. 在  B. 再',
      options: JSON.stringify(['A. 在', 'B. 再']),
      answer: 'A', solution: '"在"表示存在或正在进行，"再"表示又一次。这里表示正在做作业，用"在"。',
      source: '种子数据', tags: JSON.stringify(['同音字', '在/再'])
    },
    {
      subject: '语文', grade: 3,
      knowledge_points: JSON.stringify(['cn-leaf-012']),
      question_type: 'CN-T01', subtype: '',
      difficulty: 0.5, cognitive_level: 'B', step_level: 'step1',
      direction: 'U', context_type: 'pure',
      stem: '下列哪个字与"晴"字形最接近？\nA. 青  B. 睛  C. 清  D. 情',
      options: JSON.stringify(['A. 青', 'B. 睛', 'C. 清', 'D. 情']),
      answer: 'B', solution: '这四个字都是形近字，归因于声旁"青"。晴(日字旁，天气)、睛(目字旁，眼睛)、清(三点水，水清)、情(竖心旁，心情)。睛与晴都有相同的右边部件，仅左边不同，最为形近。',
      source: '种子数据', tags: JSON.stringify(['形近字', '青字族'])
    },
    {
      subject: '语文', grade: 4,
      knowledge_points: JSON.stringify(['cn-leaf-013']),
      question_type: 'CN-T02', subtype: '',
      difficulty: 0.5, cognitive_level: 'B', step_level: 'step2',
      direction: 'U', context_type: 'pure',
      stem: '判断加点多音字的读音：\n① 我爱好(hǎo / hào)读书。  → 读"____"\n② 他长得真好看(hǎo / hào)。→ 读"____"',
      options: '',
      answer: 'hào, hǎo', solution: '"爱好"中的"好"读hào（第四声），表喜欢；"好看"中的"好"读hǎo（第三声），表优点多。',
      source: '种子数据', tags: JSON.stringify(['多音字', '好'])
    },

    // --- 词语理解与积累 (CN-D3-M1) ---
    {
      subject: '语文', grade: 3,
      knowledge_points: JSON.stringify(['cn-leaf-015']),
      question_type: 'CN-T02', subtype: '',
      difficulty: 0.4, cognitive_level: 'B', step_level: 'step1',
      direction: 'U', context_type: 'pure',
      stem: '写出下列词语的反义词：\n高 → (    )  粗 → (    )  快 → (    )',
      options: '',
      answer: '矮（低）、细、慢', solution: '高对低/矮，粗对细，快对慢。',
      source: '种子数据', tags: JSON.stringify(['反义词', '词语'])
    },
    {
      subject: '语文', grade: 4,
      knowledge_points: JSON.stringify(['cn-leaf-017']),
      question_type: 'CN-T01', subtype: '',
      difficulty: 0.6, cognitive_level: 'B', step_level: 'step2',
      direction: 'U', context_type: 'pure',
      stem: '下列哪个成语用来形容"做了多余的事反而不好"？\nA. 画龙点睛  B. 画蛇添足  C. 对牛弹琴  D. 守株待兔',
      options: JSON.stringify(['A. 画龙点睛', 'B. 画蛇添足', 'C. 对牛弹琴', 'D. 守株待兔']),
      answer: 'B', solution: '画蛇添足：画好蛇后又添上脚，比喻做了多余的事，反而不恰当。',
      source: '种子数据', tags: JSON.stringify(['成语', '理解'])
    },
    {
      subject: '语文', grade: 5,
      knowledge_points: JSON.stringify(['cn-leaf-018']),
      question_type: 'CN-T01', subtype: '',
      difficulty: 0.5, cognitive_level: 'B', step_level: 'step2',
      direction: 'U', context_type: 'pure',
      stem: '选出感情色彩不同的一项：\nA. 聪明  B. 狡猾  C. 智慧  D. 机灵',
      options: JSON.stringify(['A. 聪明', 'B. 狡猾', 'C. 智慧', 'D. 机灵']),
      answer: 'B', solution: '聪明、智慧、机灵都是褒义词，"狡猾"是贬义词。',
      source: '种子数据', tags: JSON.stringify(['感情色彩', '褒贬'])
    },

    // --- 关联词语 (CN-D3-M2) ---
    {
      subject: '语文', grade: 4,
      knowledge_points: JSON.stringify(['cn-leaf-020']),
      question_type: 'CN-T02', subtype: '',
      difficulty: 0.5, cognitive_level: 'C', step_level: 'step2',
      direction: 'A', context_type: 'pure',
      stem: '用恰当的关联词填空：\n_____ 小明生病了，_____ 他没来上学。',
      options: '',
      answer: '因为……所以……', solution: '前因后果的关系，用"因为……所以……"连接。',
      source: '种子数据', tags: JSON.stringify(['关联词', '因果'])
    },
    {
      subject: '语文', grade: 5,
      knowledge_points: JSON.stringify(['cn-leaf-021']),
      question_type: 'CN-T02', subtype: '',
      difficulty: 0.6, cognitive_level: 'C', step_level: 'step2',
      direction: 'A', context_type: 'pure',
      stem: '选择合适的关联词：\n他_____学习好，_____体育也很棒。\nA. 虽然……但是……  B. 不但……而且……  C. 只有……才……',
      options: '',
      answer: 'B', solution: '前后是递进关系（不仅学习好，更进一步体育也很棒），用"不但……而且……"。',
      source: '种子数据', tags: JSON.stringify(['关联词', '递进'])
    },

    // --- 句子 (CN-D4) ---
    {
      subject: '语文', grade: 4,
      knowledge_points: JSON.stringify(['cn-leaf-024']),
      question_type: 'CN-T06', subtype: '',
      difficulty: 0.5, cognitive_level: 'C', step_level: 'step2',
      direction: 'A', context_type: 'pure',
      stem: '将下列"把"字句改为"被"字句：\n风把树叶吹落了。',
      options: '',
      answer: '树叶被风吹落了。', solution: '"把"字句→"被"字句：将"把"后的宾语移到句首作主语，"把"改为"被"，原来的主语移到"被"字后。',
      source: '种子数据', tags: JSON.stringify(['把字句', '被字句', '句式转换'])
    },
    {
      subject: '语文', grade: 5,
      knowledge_points: JSON.stringify(['cn-leaf-026']),
      question_type: 'CN-T06', subtype: '',
      difficulty: 0.5, cognitive_level: 'C', step_level: 'step3',
      direction: 'A', context_type: 'pure',
      stem: '缩写下面的句子（保留主干）：\n勤劳的农民伯伯在炎热的太阳下辛勤地收割金黄的稻子。',
      options: '',
      answer: '农民伯伯收割稻子。', solution: '缩句保留"谁做什么"：主语(农民伯伯)+谓语(收割)+宾语(稻子)。去掉所有修饰成分。',
      source: '种子数据', tags: JSON.stringify(['缩句', '语言运用'])
    },
    {
      subject: '语文', grade: 4,
      knowledge_points: JSON.stringify(['cn-leaf-028']),
      question_type: 'CN-T01', subtype: '',
      difficulty: 0.5, cognitive_level: 'B', step_level: 'step2',
      direction: 'U', context_type: 'pure',
      stem: '"弯弯的月亮像小船"这句话使用的修辞手法是什么？\nA. 拟人  B. 比喻  C. 夸张  D. 排比',
      options: JSON.stringify(['A. 拟人', 'B. 比喻', 'C. 夸张', 'D. 排比']),
      answer: 'B', solution: '将月亮比作小船，使用了比喻的修辞手法（明喻，有"像"这个比喻词）。',
      source: '种子数据', tags: JSON.stringify(['修辞', '比喻'])
    },
    {
      subject: '语文', grade: 5,
      knowledge_points: JSON.stringify(['cn-leaf-029']),
      question_type: 'CN-T06', subtype: '',
      difficulty: 0.6, cognitive_level: 'C', step_level: 'step3',
      direction: 'A', context_type: 'pure',
      stem: '修改病句：\n春天的北京是一年中最美丽的季节。',
      options: '',
      answer: '北京的春天是一年中最美丽的季节。', solution: '原句主语"北京"和宾语"季节"搭配不当。应改为"北京的春天"作主语。',
      source: '种子数据', tags: JSON.stringify(['病句', '搭配不当'])
    },

    // --- 阅读 (CN-D5) ---
    {
      subject: '语文', grade: 4,
      knowledge_points: JSON.stringify(['cn-leaf-031']),
      question_type: 'CN-T07', subtype: '',
      difficulty: 0.6, cognitive_level: 'C', step_level: 'step3',
      direction: 'U', context_type: 'culture',
      stem: '阅读短文，回答问题：\n\n赵州桥非常雄伟。桥长五十多米，有九米多宽，中间行车马，两旁走人。这么长的桥，全部用石头砌成，下面没有桥墩，只有一个拱形的大桥洞，横跨在三十七米多宽的河面上。\n\n（节选自《赵州桥》）\n\n赵州桥是用什么材料建造的？',
      options: '',
      answer: '石头', solution: '短文第三句明确说"全部用石头砌成"。',
      source: '种子数据', tags: JSON.stringify(['课内阅读', '赵州桥', '细节理解'])
    },
    {
      subject: '语文', grade: 5,
      knowledge_points: JSON.stringify(['cn-leaf-036']),
      question_type: 'CN-T07', subtype: '',
      difficulty: 0.7, cognitive_level: 'D', step_level: 'step4',
      direction: 'R', context_type: 'culture',
      stem: '阅读文言文，回答问题：\n\n楚人有鬻盾与矛者，誉之曰："吾盾之坚，物莫能陷也。"又誉其矛曰："吾矛之利，于物无不陷也。"\n\n（节选自《自相矛盾》）\n\n"鬻"在文中的意思是什么？A. 卖  B. 买  C. 制作  D. 使用',
      options: JSON.stringify(['A. 卖', 'B. 买', 'C. 制作', 'D. 使用']),
      answer: 'A', solution: '"鬻"读yù，是古汉语，意思是"卖"。楚人有鬻盾与矛者=楚国有个卖盾和矛的人。',
      source: '种子数据', tags: JSON.stringify(['文言文', '自相矛盾'])
    },

    // --- 古诗文 (CN-D7) ---
    {
      subject: '语文', grade: 2,
      knowledge_points: JSON.stringify(['cn-leaf-043']),
      question_type: 'CN-T09', subtype: '',
      difficulty: 0.3, cognitive_level: 'A', step_level: 'step1',
      direction: 'K', context_type: 'culture',
      stem: '默写古诗《静夜思》的前两句：\n_____________，_____________。',
      options: '',
      answer: '床前明月光，疑是地上霜。', solution: '李白《静夜思》：床前明月光，疑是地上霜。举头望明月，低头思故乡。',
      source: '种子数据', tags: JSON.stringify(['古诗默写', '静夜思'])
    },
    {
      subject: '语文', grade: 5,
      knowledge_points: JSON.stringify(['cn-leaf-048']),
      question_type: 'CN-T07', subtype: '',
      difficulty: 0.7, cognitive_level: 'D', step_level: 'step4',
      direction: 'R', context_type: 'culture',
      stem: '阅读《望庐山瀑布》回答问题：\n日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。\n\n"飞流直下三千尺"使用了什么修辞手法？有什么表达效果？',
      options: '',
      answer: '夸张。用"三千尺"极言瀑布之高，生动形象地写出瀑布飞泻而下的壮观景象，表达了诗人对大自然神奇力量的赞叹。',
      solution: '这是李白的《望庐山瀑布》。"三千尺"是夸张的修辞，不是实际高度，而是突出瀑布的雄伟壮观。',
      source: '种子数据', tags: JSON.stringify(['古诗赏析', '修辞', '李白'])
    },

    // --- 写作 (CN-D6) ---
    {
      subject: '语文', grade: 3,
      knowledge_points: JSON.stringify(['cn-leaf-051']),
      question_type: 'CN-T08', subtype: '',
      difficulty: 0.5, cognitive_level: 'C', step_level: 'step3',
      direction: 'E', context_type: 'life',
      stem: '请用"有的……有的……还有的……"写一段话，描写课间活动（不少于30字）。',
      options: '',
      answer: '下课了，操场上可热闹了。同学们有的在跳绳，有的在踢毽子，还有的在玩老鹰捉小鸡的游戏，大家玩得可开心了！',
      solution: '用排比句式描写场景，做到内容具体、语句通顺。',
      source: '种子数据', tags: JSON.stringify(['写作', '片段', '排比'])
    },
  ]

  // 写入数据库
  for (const q of englishQuestions) {
    // 检查是否已存在（防重复）
    const check = db.exec('SELECT id FROM question_bank WHERE stem = ? AND subject = ?', [q.stem, q.subject])
    if (check.length > 0 && check[0].values.length > 0) continue

    db.run(
      `INSERT INTO question_bank (subject, grade, knowledge_points, question_type, subtype, difficulty, cognitive_level, step_level, direction, context_type, stem, options, answer, solution, source, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [q.subject, q.grade, q.knowledge_points, q.question_type, q.subtype, q.difficulty, q.cognitive_level, q.step_level, q.direction, q.context_type, q.stem, q.options, q.answer, q.solution, q.source, q.tags]
    )
  }

  // 保存数据库
  const data = db.export()
  const buffer2 = Buffer.from(data)
  writeFileSync(DB_PATH, buffer2)
  
  console.log(`✅ 已写入 ${englishQuestions.length} 道题目（英语+语文）`)
  
  // 按学科统计
  const enCount = db.exec("SELECT COUNT(*) FROM question_bank WHERE subject = '英语'")
  const cnCount = db.exec("SELECT COUNT(*) FROM question_bank WHERE subject = '语文'")
  const maCount = db.exec("SELECT COUNT(*) FROM question_bank WHERE subject = '数学'")
  console.log(`📊 当前题库：数学${maCount[0].values[0][0]}道, 英语${enCount[0].values[0][0]}道, 语文${cnCount[0].values[0][0]}道`)

  db.close()
}

main().catch(console.error)
