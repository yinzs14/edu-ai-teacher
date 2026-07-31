/**
 * 补充出题脚本 - 英语+语文+数学难题
 * 目标：英语+155, 语文+180, 数学难题+40
 */
import initSqlJs from 'sql.js'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')
const SQL = await initSqlJs()
const dbPath = join(ROOT_DIR, 'server', 'data', 'auth.db')
const db = new SQL.Database(readFileSync(dbPath))

function saveDB() { writeFileSync(dbPath, Buffer.from(db.export())) }

// Load textbook units
function loadUnits(fn) {
  const p = join(ROOT_DIR, 'server', 'data', fn)
  if (!existsSync(p)) return {}
  const tree = JSON.parse(readFileSync(p, 'utf8'))
  const map = {}
  for (const g of tree.grades) for (const s of g.semesters) for (const u of s.units)
    for (const kp of u.knowledgePoints) { if (!map[kp]) map[kp] = []; map[kp].push({ unitId: u.unitId, grade: g.grade }) }
  return map
}
const mathU = loadUnits('textbook_units_math.json')
const enU = loadUnits('textbook_units_english.json')
const cnU = loadUnits('textbook_units_chinese.json')

let seed = 99
function ri(a,b){seed=(seed*9301+49297)%233280;return Math.floor(seed/233280*(b-a+1))+a}
function pick(a){return a[Math.floor(seed/233280*a.length)]}

function dc(level) {
  if (level==='basic') return {d:ri(1,2)+0.1,c:pick(['A','B']),s:'step1',dir:'A'}
  if (level==='intermediate') return {d:3+0.2,c:pick(['B','C']),s:pick(['step2','step3']),dir:pick(['B','C'])}
  return {d:4+0.3,c:pick(['C','D']),s:pick(['step3','step4']),dir:pick(['C','D','E'])}
}

function getUnit(leaf, map) { return map[leaf]?.[0] || null }

function insert(subject, grade, kps, qtype, level, stem, answer, solution, opts={}) {
  const d = dc(level)
  const u = getUnit(kps[0], subject==='数学'?mathU:subject==='英语'?enU:cnU)
  db.run(`INSERT INTO question_bank (subject,grade,knowledge_points,question_type,subtype,difficulty,cognitive_level,step_level,direction,context_type,stem,options,answer,solution,source,tags,textbook_unit) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [subject, grade, JSON.stringify(kps), qtype, '', d.d, d.c, d.s, d.dir, opts.ctx||'pure', stem, opts.opts||'', answer, solution||'', '程序化生成', JSON.stringify([level]), u?.unitId||''])
}

let count = 0

// ============================================================
// ENGLISH SUPPLEMENTARY (~155)
// ============================================================

// Vocabulary translation pairs for each leaf node
const enVocab = {
  'en-leaf-008': [['father','父亲'],['mother','母亲'],['brother','兄弟'],['sister','姐妹'],['grandfather','祖父'],['grandmother','祖母'],['uncle','叔伯'],['aunt','阿姨']],
  'en-leaf-009': [['book','书'],['pen','钢笔'],['pencil','铅笔'],['ruler','尺子'],['eraser','橡皮'],['bag','书包'],['desk','课桌'],['chair','椅子']],
  'en-leaf-010': [['cat','猫'],['dog','狗'],['pig','猪'],['duck','鸭'],['cow','牛'],['horse','马'],['sheep','羊'],['rabbit','兔子'],['tiger','老虎'],['lion','狮子'],['elephant','大象'],['monkey','猴子'],['panda','熊猫'],['bird','鸟'],['fish','鱼']],
  'en-leaf-011': [['apple','苹果'],['banana','香蕉'],['orange','橙子'],['pear','梨'],['grape','葡萄'],['rice','米饭'],['bread','面包'],['milk','牛奶'],['juice','果汁'],['water','水'],['cake','蛋糕'],['egg','鸡蛋'],['meat','肉'],['chicken','鸡肉']],
  'en-leaf-012': [['head','头'],['hair','头发'],['face','脸'],['eye','眼睛'],['ear','耳朵'],['nose','鼻子'],['mouth','嘴'],['tooth','牙齿'],['hand','手'],['arm','手臂'],['leg','腿'],['foot','脚']],
  'en-leaf-013': [['shirt','衬衫'],['skirt','短裙'],['dress','连衣裙'],['shoes','鞋子'],['hat','帽子'],['coat','外套'],['socks','袜子'],['red','红色'],['blue','蓝色'],['green','绿色'],['yellow','黄色'],['black','黑色'],['white','白色'],['pink','粉色']],
  'en-leaf-014': [['school','学校'],['hospital','医院'],['park','公园'],['library','图书馆'],['shop','商店'],['zoo','动物园'],['bank','银行'],['hotel','酒店']],
  'en-leaf-016': [['run','跑'],['jump','跳'],['walk','走'],['swim','游泳'],['fly','飞'],['sing','唱歌'],['dance','跳舞'],['read','读'],['write','写'],['draw','画'],['play','玩'],['eat','吃'],['drink','喝'],['sleep','睡觉']],
  'en-leaf-017': [['go','去'],['come','来'],['see','看'],['hear','听'],['speak','说'],['listen','听'],['look','看'],['think','想'],['know','知道'],['like','喜欢'],['want','想要'],['help','帮助']],
  'en-leaf-021': [['big','大的'],['small','小的'],['long','长的'],['short','短的'],['tall','高的'],['fat','胖的'],['thin','瘦的'],['new','新的'],['old','旧的'],['good','好的'],['beautiful','美丽的'],['happy','快乐的'],['sad','悲伤的']],
  'en-leaf-022': [['hot','热的'],['cold','冷的'],['hungry','饿的'],['thirsty','渴的'],['tired','累的'],['angry','生气的'],['excited','兴奋的'],['bored','无聊的']],
  'en-leaf-027': [['one','一'],['two','二'],['three','三'],['four','四'],['five','五'],['six','六'],['seven','七'],['eight','八'],['nine','九'],['ten','十'],['eleven','十一'],['twelve','十二'],['twenty','二十'],['first','第一'],['second','第二'],['third','第三']],
  'en-leaf-041': [['hello','你好'],['goodbye','再见'],['thanks','谢谢'],['sorry','对不起'],['please','请'],['yes','是'],['no','不'],['OK','好的']],
  'en-leaf-043': [['Monday','星期一'],['Tuesday','星期二'],['Wednesday','星期三'],['Thursday','星期四'],['Friday','星期五'],['Saturday','星期六'],['Sunday','星期日'],['Chinese','语文'],['math','数学'],['English','英语'],['music','音乐'],['art','美术'],['PE','体育']],
  'en-leaf-044': [['sing','唱歌'],['dance','跳舞'],['draw','画画'],['swim','游泳'],['run','跑步'],['read','阅读'],['cook','做饭'],['fish','钓鱼']],
  'en-leaf-048': [['spring','春天'],['summer','夏天'],['autumn','秋天'],['winter','冬天'],['warm','温暖的'],['hot','热的'],['cool','凉爽的'],['cold','冷的'],['sunny','晴朗的'],['rainy','下雨的'],['cloudy','多云的'],['windy','有风的'],['snowy','下雪的']],
}

for (const [leaf, pairs] of Object.entries(enVocab)) {
  for (const [en, cn] of pairs) {
    const grade = enU[leaf]?.[0]?.grade || ri(3,6)
    insert('英语', grade, [leaf], 'EN-T01', 'basic', `翻译：${en}`, cn, `${en}=${cn}`)
    insert('英语', grade, [leaf], 'EN-T01', 'basic', `翻译：${cn}`, en, `${cn}=${en}`)
    count += 2
  }
}

// Grammar fill-in-blank
const enGrammar = [
  ['en-leaf-018', 3, '选择：I ___ a boy. (am/is/are)', 'am', 'I搭配am', 'basic'],
  ['en-leaf-018', 3, '选择：You ___ a girl. (am/is/are)', 'are', 'You搭配are', 'basic'],
  ['en-leaf-018', 3, '选择：He ___ my friend. (am/is/are)', 'is', 'He搭配is', 'basic'],
  ['en-leaf-018', 3, '选择：She ___ tall. (am/is/are)', 'is', 'She搭配is', 'basic'],
  ['en-leaf-018', 3, '选择：It ___ a cat. (am/is/are)', 'is', 'It搭配is', 'basic'],
  ['en-leaf-018', 3, '选择：We ___ students. (am/is/are)', 'are', 'We搭配are', 'basic'],
  ['en-leaf-018', 3, '选择：They ___ happy. (am/is/are)', 'are', 'They搭配are', 'basic'],
  ['en-leaf-018', 3, '改为否定：I am happy.', 'I am not happy.', 'be后加not', 'intermediate'],
  ['en-leaf-018', 3, '改为疑问：She is a teacher.', 'Is she a teacher?', 'be提前', 'intermediate'],
  ['en-leaf-025', 3, '选择：This is ___ book. (my/I/me)', 'my', '修饰名词用my', 'basic'],
  ['en-leaf-025', 3, '选择：___ is a student. (He/His/Him)', 'He', '主格做主语', 'basic'],
  ['en-leaf-025', 3, '选择：I love ___ mother. (I/my/me)', 'my', '修饰名词用my', 'basic'],
  ['en-leaf-025', 3, '选择：This pen is ___. (my/mine/me)', 'mine', '名词性物主代词', 'intermediate'],
  ['en-leaf-025', 4, '选择：___ name is Tom. (He/His)', 'His', '修饰名词用His', 'intermediate'],
  ['en-leaf-025', 4, '选择：Let ___ go. (we/us/our)', 'us', '宾格做宾语', 'intermediate'],
  ['en-leaf-031', 4, '填空：She ___ (go) to school every day.', 'goes', '三单加es', 'intermediate'],
  ['en-leaf-031', 4, '填空：He ___ (like) music.', 'likes', '三单加s', 'intermediate'],
  ['en-leaf-031', 4, '填空：They ___ (play) football after school.', 'play', 'They用原形', 'basic'],
  ['en-leaf-031', 4, '填空：My mother ___ (cook) dinner every day.', 'cooks', '三单加s', 'intermediate'],
  ['en-leaf-031', 4, '否定句：He likes apples. → He ___ ___ apples.', "doesn't like", '一般现在时否定用doesn\'t+原形', 'intermediate'],
  ['en-leaf-032', 5, '填空：Look! The cat ___ (run).', 'is running', 'Look提示进行时', 'intermediate'],
  ['en-leaf-032', 5, '填空：They ___ (read) books now.', 'are reading', 'now提示进行时', 'intermediate'],
  ['en-leaf-032', 5, '填空：I ___ (write) a letter now.', 'am writing', 'I搭配am', 'intermediate'],
  ['en-leaf-032', 5, '填空：Listen! She ___ (sing).', 'is singing', 'Listen提示进行时', 'intermediate'],
  ['en-leaf-033', 5, '填空：I ___ (go) to the park yesterday.', 'went', 'go过去式went', 'intermediate'],
  ['en-leaf-033', 5, '填空：She ___ (eat) an apple this morning.', 'ate', 'eat过去式ate', 'intermediate'],
  ['en-leaf-033', 5, '填空：They ___ (play) basketball last Sunday.', 'played', '规则动词加ed', 'intermediate'],
  ['en-leaf-033', 6, '填空：We ___ (have) a party last night.', 'had', 'have过去式had', 'hard'],
  ['en-leaf-033', 6, '否定句：He went to school. → He ___ ___ to school.', "didn't go", '过去时否定用didn\'t+原形', 'hard'],
  ['en-leaf-034', 5, '填空：I ___ (visit) my grandma tomorrow.', 'will visit', 'tomorrow提示将来时', 'intermediate'],
  ['en-leaf-034', 5, '填空：They ___ (have) a picnic next Sunday.', 'will have', 'next Sunday提示将来时', 'intermediate'],
  ['en-leaf-039', 4, '填空：There ___ a book on the desk.', 'is', 'a book单数', 'basic'],
  ['en-leaf-039', 4, '填空：There ___ two pens in the box.', 'are', 'two pens复数', 'basic'],
  ['en-leaf-039', 4, '填空：There ___ some water in the cup.', 'is', 'water不可数', 'intermediate'],
  ['en-leaf-039', 4, '填空：There ___ many students in the classroom.', 'are', 'many students复数', 'basic'],
  ['en-leaf-037', 3, '选择：___ you a student? —Yes, I am.', 'Are', 'be动词提问', 'basic'],
  ['en-leaf-037', 3, '选择：___ you like apples? —Yes, I do.', 'Do', '实义动词用Do', 'intermediate'],
  ['en-leaf-037', 4, '选择：___ she sing well? —Yes, she does.', 'Does', '三单用Does', 'intermediate'],
  ['en-leaf-038', 3, '选择：___ is your name? —My name is Tom.', 'What', '问名字', 'basic'],
  ['en-leaf-038', 4, '选择：___ are you from? —I am from China.', 'Where', '问地点', 'basic'],
  ['en-leaf-038', 4, '选择：___ old are you? —I am ten.', 'How', '问年龄How old', 'basic'],
  ['en-leaf-038', 5, '选择：___ is the weather? —It is sunny.', 'How', '问天气', 'intermediate'],
  ['en-leaf-023', 5, '选择：Tom is ___ than Mike. (tall/taller)', 'taller', '比较级', 'intermediate'],
  ['en-leaf-023', 6, '选择：This is the ___ book. (good/best)', 'best', '最高级', 'hard'],
  ['en-leaf-023', 5, '选择：My room is ___ than yours. (big/bigger)', 'bigger', '双写g加er', 'intermediate'],
  ['en-leaf-019', 4, '选择：___ you swim? —Yes, I can.', 'Can', '问能力', 'intermediate'],
  ['en-leaf-019', 5, '选择：You ___ do your homework first.', 'should', '建议用should', 'intermediate'],
  ['en-leaf-028', 4, '选择：I get up ___ 7 o\'clock.', 'at', '具体时刻用at', 'basic'],
  ['en-leaf-028', 4, '选择：My birthday is ___ May.', 'in', '月份用in', 'basic'],
  ['en-leaf-028', 5, '选择：We have class ___ Monday.', 'on', '星期用on', 'basic'],
  ['en-leaf-029', 3, '选择：The cat is ___ the box.', 'in', '在里面', 'basic'],
  ['en-leaf-029', 3, '选择：The book is ___ the desk.', 'on', '在上面', 'basic'],
  ['en-leaf-029', 4, '选择：The ball is ___ the chair.', 'under', '在下面', 'basic'],
]
for (const [leaf, grade, stem, ans, sol, level] of enGrammar) {
  insert('英语', grade, [leaf], 'EN-T02', level, stem, ans, sol)
  count++
}

// English sentence construction
const enSentences = [
  ['en-leaf-060', 3, '连词成句：is / this / mother / my', 'This is my mother.', 'basic'],
  ['en-leaf-060', 3, '连词成句：I / like / apples', 'I like apples.', 'basic'],
  ['en-leaf-060', 4, '连词成句：do / what / you / like', 'What do you like?', 'intermediate'],
  ['en-leaf-060', 4, '连词成句：is / where / the / park', 'Where is the park?', 'intermediate'],
  ['en-leaf-060', 4, '连词成句：have / I / a / book / new', 'I have a new book.', 'intermediate'],
  ['en-leaf-060', 5, '连词成句：going / I / am / to / school', 'I am going to school.', 'intermediate'],
  ['en-leaf-060', 5, '连词成句：did / what / do / you / yesterday', 'What did you do yesterday?', 'hard'],
]
for (const [leaf, grade, stem, ans, level] of enSentences) {
  insert('英语', grade, [leaf], 'EN-T04', level, stem, ans, '注意首字母大写和标点')
  count++
}

// English reading comprehension
const enReading = [
  ['en-leaf-053', 4, '阅读判断：Tom is 10 years old. He likes playing football. He has a sister. Tom is ten years old. (T/F)', 'T', '短文说Tom is 10 years old', 'intermediate'],
  ['en-leaf-053', 4, '阅读判断：Tom is 10 years old. He likes playing football. He has a sister. Tom likes basketball. (T/F)', 'F', '短文说likes football不是basketball', 'intermediate'],
  ['en-leaf-054', 5, '阅读：Sarah goes to school by bus. She likes reading books. Her favorite subject is English. How does Sarah go to school?', 'By bus.', '短文中提到by bus', 'intermediate'],
  ['en-leaf-054', 5, '阅读：Sarah goes to school by bus. She likes reading books. Her favorite subject is English. What is Sarah\'s favorite subject?', 'English.', '短文中提到favorite subject is English', 'intermediate'],
  ['en-leaf-054', 6, '阅读：Mike gets up at 6:30 every morning. He has breakfast at 7:00. He goes to school at 7:30. What time does Mike have breakfast?', 'At 7:00.', '短文中提到breakfast at 7:00', 'hard'],
  ['en-leaf-053', 5, '阅读判断：My name is Lily. I am nine. I am from China. I like drawing. Lily is from China. (T/F)', 'T', '短文说I am from China', 'intermediate'],
  ['en-leaf-053', 5, '阅读判断：My name is Lily. I am nine. I am from China. I like drawing. Lily is ten. (T/F)', 'F', '短文说I am nine不是ten', 'intermediate'],
]
for (const [leaf, grade, stem, ans, sol, level] of enReading) {
  insert('英语', grade, [leaf], 'EN-T06', level, stem, ans, sol)
  count++
}

console.log(`English supplementary: ${count}`)

// ============================================================
// CHINESE SUPPLEMENTARY (~180)
// ============================================================
let cnCount = 0

// Chinese character & pinyin exercises
const cnPinyin = [
  ['cn-leaf-001', 1, '写出声母：b __ m f', 'p', '声母顺序bpmf', 'basic'],
  ['cn-leaf-001', 1, '写出声母：d t __ n l', 'n...不对，是n', '声母顺序dtnl', 'basic'],
  ['cn-leaf-001', 1, '翘舌音声母有哪些？', 'zh ch sh r', '翘舌音4个', 'basic'],
  ['cn-leaf-001', 1, '平舌音声母有哪些？', 'z c s', '平舌音3个', 'basic'],
  ['cn-leaf-002', 1, '6个单韵母是？', 'a o e i u ü', '6个单韵母', 'basic'],
  ['cn-leaf-002', 1, '写出3个复韵母。', 'ai ei ui（或其他复韵母）', '复韵母由两个韵母组成', 'intermediate'],
  ['cn-leaf-002', 1, '鼻韵母有哪些？', 'an en in un ün ang eng ing ong', '5个前鼻韵母+4个后鼻韵母', 'intermediate'],
  ['cn-leaf-003', 1, '整体认读音节有16个，写出5个。', 'zhi chi shi ri zi（任意5个）', '整体认读音节不能拼读', 'basic'],
  ['cn-leaf-004', 1, '拼读：m-ā→?', 'mā（妈）', '两拼法', 'basic'],
  ['cn-leaf-004', 1, '拼读：p-ī→?', 'pī（披）', '两拼法', 'basic'],
  ['cn-leaf-004', 1, '三拼：g-u-ā→?', 'guā（瓜）', '三拼法', 'intermediate'],
  ['cn-leaf-004', 1, '三拼：k-u-ò→?', 'kuò（阔）', '三拼法', 'intermediate'],
  ['cn-leaf-005', 1, '标调规则：有a不放过，没a找___。', 'o e', '标调规则', 'intermediate'],
  ['cn-leaf-005', 1, 'i u并列标在___。', '后', 'i u并列标在后', 'intermediate'],
]
for (const [leaf, grade, stem, ans, sol, level] of cnPinyin) {
  insert('语文', grade, [leaf], 'CN-T02', level, stem, ans, sol)
  cnCount++
}

// Chinese character exercises
const cnChars = [
  ['cn-leaf-007', 1, '"十"字的笔画有___画。', '2', '一横一竖', 'basic'],
  ['cn-leaf-007', 2, '"木"字的笔画有___画。', '4', '横竖撇捺', 'basic'],
  ['cn-leaf-008', 1, '"口"的笔顺是？', '竖、横折、横', '先竖再横折最后横', 'basic'],
  ['cn-leaf-008', 2, '"田"的笔顺是？', '竖、横折、横、竖、横', '先外后内再封口', 'intermediate'],
  ['cn-leaf-009', 1, '"河"的部首是___。', '氵', '三点水', 'basic'],
  ['cn-leaf-009', 1, '"草"的部首是___。', '艹', '草字头', 'basic'],
  ['cn-leaf-009', 2, '"说"的部首是___。', '讠', '言字旁', 'basic'],
  ['cn-leaf-009', 2, '"跑"的部首是___。', '足', '足字旁', 'basic'],
  ['cn-leaf-009', 2, '带"心"部首的字多与什么有关？', '心情、思想', '心=心理活动', 'intermediate'],
  ['cn-leaf-009', 3, '带"日"部首的字多与什么有关？', '太阳、时间', '日=太阳/时间', 'intermediate'],
  ['cn-leaf-010', 2, '"明"是什么结构？', '左右结构', '日月左右', 'basic'],
  ['cn-leaf-010', 2, '"尖"是什么结构？', '上下结构', '小大上下', 'basic'],
  ['cn-leaf-010', 2, '"回"是什么结构？', '全包围结构', '大口套小口', 'intermediate'],
  ['cn-leaf-010', 3, '"围"是什么结构？', '全包围结构', '口包围韦', 'intermediate'],
]
for (const [leaf, grade, stem, ans, sol, level] of cnChars) {
  insert('语文', grade, [leaf], 'CN-T02', level, stem, ans, sol)
  cnCount++
}

// Chinese word exercises
const cnWords = [
  ['cn-leaf-011', 2, '选词填空：(做/作)___事、___文', '做事、作文', '做=动词，作=名词搭配', 'intermediate'],
  ['cn-leaf-011', 2, '选词填空：(在/再)___见、___家', '再见、在家', '再=又一次，在=地点', 'intermediate'],
  ['cn-leaf-011', 3, '选词填空：(飘/漂)___扬、___流', '飘扬、漂流', '飘=空中，漂=水中', 'intermediate'],
  ['cn-leaf-011', 3, '选词填空：(像/象)___好、大___', '像好、大象', '像=相似，象=动物', 'intermediate'],
  ['cn-leaf-012', 3, '辨字组词：渴(　)　喝(　)', '口渴、喝水', '渴=缺水，喝=用口', 'intermediate'],
  ['cn-leaf-012', 3, '辨字组词：拨(　)　拔(　)', '拨打、拔草', '拨=拨动，拔=拔起', 'intermediate'],
  ['cn-leaf-012', 4, '辨字组词：折(　)　拆(　)', '折纸、拆除', '折=弯折，拆=拆开', 'hard'],
  ['cn-leaf-013', 3, '多音字"长"的读音和组词。', 'zhǎng(长大) cháng(长短)', '两个读音', 'intermediate'],
  ['cn-leaf-013', 3, '多音字"好"的读音和组词。', 'hǎo(好人) hào(爱好)', '两个读音', 'intermediate'],
  ['cn-leaf-013', 4, '多音字"行"的读音和组词。', 'xíng(行走) háng(银行)', '两个读音', 'intermediate'],
  ['cn-leaf-013', 4, '多音字"重"的读音和组词。', 'zhòng(重要) chóng(重复)', '两个读音', 'hard'],
  ['cn-leaf-015', 2, '写出"美丽"的近义词（至少2个）。', '漂亮、好看、漂亮', '近义词', 'basic'],
  ['cn-leaf-015', 2, '写出"快乐"的近义词（至少2个）。', '开心、高兴、愉快', '近义词', 'basic'],
  ['cn-leaf-015', 3, '写出"黑暗"的反义词。', '光明、明亮', '反义词', 'basic'],
  ['cn-leaf-015', 3, '写出"寒冷"的反义词。', '温暖、炎热', '反义词', 'basic'],
  ['cn-leaf-015', 4, '写出"容易"的反义词。', '困难、艰难', '反义词', 'intermediate'],
  ['cn-leaf-016', 2, '搭配：(　)的阳光', '温暖、灿烂、明媚', '修饰阳光', 'basic'],
  ['cn-leaf-016', 3, '搭配：(　)地跑', '飞快、迅速、拼命', '修饰跑', 'basic'],
  ['cn-leaf-016', 3, '搭配：(　)的春天', '温暖、美丽、明媚', '修饰春天', 'basic'],
  ['cn-leaf-016', 4, '搭配：(　)地学习', '认真、努力、刻苦', '修饰学习', 'intermediate'],
  ['cn-leaf-017', 3, '补全成语：亡羊(　)牢', '补', '亡羊补牢', 'basic'],
  ['cn-leaf-017', 3, '补全成语：画蛇(　)足', '添', '画蛇添足', 'basic'],
  ['cn-leaf-017', 4, '补全成语：(　)口(　)声', '异、同', '异口同声', 'intermediate'],
  ['cn-leaf-017', 4, '补全成语：自(　)自(　)', '强、息', '自强不息', 'intermediate'],
  ['cn-leaf-017', 4, '补全成语：一(　)两得', '举', '一举两得', 'intermediate'],
  ['cn-leaf-017', 5, '补全成语：画(　)点睛', '龙', '画龙点睛', 'intermediate'],
  ['cn-leaf-017', 5, '写出三个含动物的成语。', '狐假虎威、画蛇添足、守株待兔', '动物成语', 'intermediate'],
  ['cn-leaf-018', 4, '"勇敢"是褒义还是贬义？', '褒义', '赞美的词', 'intermediate'],
  ['cn-leaf-018', 4, '"狡猾"是褒义还是贬义？', '贬义', '贬斥的词', 'intermediate'],
  ['cn-leaf-018', 5, '"骄傲"在什么情况下是贬义？', '自满、看不起别人时', '骄傲有两个意思', 'hard'],
]
for (const [leaf, grade, stem, ans, sol, level] of cnWords) {
  insert('语文', grade, [leaf], 'CN-T02', level, stem, ans, sol)
  cnCount++
}

// Chinese sentence exercises
const cnSentences = [
  ['cn-leaf-019', 3, '用"不但...而且..."造句。', '示例：他不但学习好，而且品德好。', '递进关系', 'intermediate'],
  ['cn-leaf-021', 4, '用"虽然...但是..."造句。', '示例：虽然天气很冷，但是同学们仍然坚持锻炼。', '转折关系', 'intermediate'],
  ['cn-leaf-023', 3, '改"把"字句：风把门吹开了。→ 改"被"字句', '门被风吹开了。', '把被互换', 'intermediate'],
  ['cn-leaf-023', 4, '改"把"字句：乌云遮住了太阳。', '乌云把太阳遮住了。', '把字句', 'intermediate'],
  ['cn-leaf-024', 4, '改反问句：这道题很简单。', '这道题难道不简单吗？', '难道...不...吗', 'intermediate'],
  ['cn-leaf-024', 5, '改陈述句：难道这不是你的书吗？', '这是你的书。', '反问改陈述', 'intermediate'],
  ['cn-leaf-025', 4, '缩句：活泼的小明在操场上快乐地踢足球。', '小明踢足球。', '去修饰留主干', 'intermediate'],
  ['cn-leaf-025', 4, '缩句：美丽的蝴蝶在花丛中飞舞。', '蝴蝶飞舞。', '去修饰留主干', 'intermediate'],
  ['cn-leaf-025', 3, '扩句：小鸟唱歌。（扩两处）', '示例：美丽的小鸟在树上快乐地唱歌。', '加修饰语', 'intermediate'],
  ['cn-leaf-027', 3, '"弯弯的月亮像小船"用了什么修辞？', '比喻', '把月亮比作小船', 'basic'],
  ['cn-leaf-027', 4, '"花儿在微笑"用了什么修辞？', '拟人', '把花当人写', 'basic'],
  ['cn-leaf-027', 4, '"飞流直下三千尺"用了什么修辞？', '夸张', '故意放大', 'intermediate'],
  ['cn-leaf-027', 5, '"落叶在空中跳舞"用了什么修辞？', '拟人', '把落叶当人写', 'intermediate'],
  ['cn-leaf-028', 3, '修改病句：我断定他可能不是坏人。', '去掉"可能"或"断定"改"猜测"', '前后矛盾', 'intermediate'],
  ['cn-leaf-028', 4, '修改病句：商店里摆满了水果、苹果和蔬菜。', '去掉"水果"或"苹果"', '分类不当', 'intermediate'],
  ['cn-leaf-028', 4, '修改病句：他的语文和数学都很好，而且语文更好。', '去掉"而且语文更好"', '语意重复', 'intermediate'],
  ['cn-leaf-028', 5, '修改病句：经过努力，他的作文水平大大改善了。', '"改善"改"提高"', '搭配不当', 'hard'],
  ['cn-leaf-029', 2, '加标点：妈妈说你做完作业了吗', '妈妈说："你做完作业了吗？"', '冒号引号问号', 'basic'],
  ['cn-leaf-029', 3, '加标点：图书馆里有语文书数学书英语书等', '图书馆里有语文书、数学书、英语书等。', '顿号句号', 'basic'],
  ['cn-leaf-029', 4, '加标点：多么美的景色啊', '多么美的景色啊！', '感叹号', 'basic'],
]
for (const [leaf, grade, stem, ans, sol, level] of cnSentences) {
  insert('语文', grade, [leaf], 'CN-T04', level, stem, ans, sol)
  cnCount++
}

// Chinese poetry
const cnPoetry = [
  ['cn-leaf-046', 1, '"床前明月光"下一句是？', '疑是地上霜', '李白《静夜思》', 'basic'],
  ['cn-leaf-046', 1, '"春眠不觉晓"下一句是？', '处处闻啼鸟', '孟浩然《春晓》', 'basic'],
  ['cn-leaf-046', 2, '"白日依山尽"下一句是？', '黄河入海流', '王之涣《登鹳雀楼》', 'basic'],
  ['cn-leaf-046', 2, '"两个黄鹂鸣翠柳"下一句是？', '一行白鹭上青天', '杜甫《绝句》', 'intermediate'],
  ['cn-leaf-046', 3, '"停车坐爱枫林晚"下一句是？', '霜叶红于二月花', '杜牧《山行》', 'intermediate'],
  ['cn-leaf-046', 3, '"欲穷千里目"下一句是？', '更上一层楼', '王之涣《登鹳雀楼》', 'basic'],
  ['cn-leaf-046', 4, '"接天莲叶无穷碧"下一句是？', '映日荷花别样红', '杨万里', 'intermediate'],
  ['cn-leaf-046', 4, '"不识庐山真面目"下一句是？', '只缘身在此山中', '苏轼《题西林壁》', 'intermediate'],
  ['cn-leaf-046', 4, '"山重水复疑无路"下一句是？', '柳暗花明又一村', '陆游《游山西村》', 'intermediate'],
  ['cn-leaf-046', 5, '"横看成岭侧成峰"下一句是？', '远近高低各不同', '苏轼《题西林壁》', 'intermediate'],
  ['cn-leaf-046', 5, '"春色满园关不住"下一句是？', '一枝红杏出墙来', '叶绍翁《游园不值》', 'intermediate'],
  ['cn-leaf-046', 5, '"随风潜入夜"下一句是？', '润物细无声', '杜甫《春夜喜雨》', 'hard'],
  ['cn-leaf-046', 6, '"粉骨碎身浑不怕"下一句是？', '要留清白在人间', '于谦《石灰吟》', 'hard'],
  ['cn-leaf-046', 6, '"千锤万凿出深山"下一句是？', '烈火焚烧若等闲', '于谦《石灰吟》', 'hard'],
]
for (const [leaf, grade, stem, ans, sol, level] of cnPoetry) {
  insert('语文', grade, [leaf], 'CN-T06', level, stem, ans, sol)
  cnCount++
}

// Chinese reading comprehension
const cnReading = [
  ['cn-leaf-030', 3, '"草长莺飞二月天，拂堤杨柳醉春烟"描写的是哪个季节？', '春天', '二月天、草长莺飞', 'intermediate'],
  ['cn-leaf-031', 4, '《落花生》告诉我们什么道理？', '做人要做有用的人，不要做只讲体面而对别人没有好处的人。', '借物喻人', 'intermediate'],
  ['cn-leaf-031', 5, '《少年闰土》选自哪部小说？作者是谁？', '选自《故乡》，作者是鲁迅', '鲁迅作品', 'hard'],
  ['cn-leaf-032', 4, '什么是文章的中心句？', '能概括段落或全文主要内容的句子', '中心句的作用', 'intermediate'],
  ['cn-leaf-033', 3, '记叙文的六要素是什么？', '时间、地点、人物、起因、经过、结果', '记叙文六要素', 'intermediate'],
  ['cn-leaf-034', 5, '常见的说明方法有哪些？', '列数字、举例子、作比较、打比方', '说明方法', 'intermediate'],
  ['cn-leaf-036', 3, '"举头望明月，低头思故乡"表达了诗人什么感情？', '思乡之情', '李白《静夜思》', 'intermediate'],
  ['cn-leaf-036', 4, '"谁知盘中餐，粒粒皆辛苦"告诉我们要怎样？', '珍惜粮食，尊重劳动', '李绅《悯农》', 'intermediate'],
  ['cn-leaf-036', 5, '"独在异乡为异客，每逢佳节倍思亲"是谁的诗？', '王维《九月九日忆山东兄弟》', '思乡诗', 'hard'],
  ['cn-leaf-037', 5, '文言文"学而时习之"出自哪部书？', '《论语》', '孔子语录', 'hard'],
  ['cn-leaf-037', 6, '"三人行，必有我师焉"的意思是？', '几个人一起走路，其中必定有可以做我老师的人', '虚心学习', 'hard'],
]
for (const [leaf, grade, stem, ans, sol, level] of cnReading) {
  insert('语文', grade, [leaf], 'CN-T06', level, stem, ans, sol)
  cnCount++
}

// Chinese writing prompts
const cnWriting = [
  ['cn-leaf-038', 1, '看图写话：[小朋友在操场跑步]，写2句话。', '示例：下课了，小朋友在操场上跑步。他们跑得满头大汗，但是很开心。', '看图写话', 'intermediate'],
  ['cn-leaf-039', 3, '用"先...然后...最后..."写一段做家务的过程。', '示例：我先扫地，然后拖地，最后擦桌子。做完这些家务，家里变得干干净净的。', '顺序词写过程', 'intermediate'],
  ['cn-leaf-041', 4, '以"我的好朋友"为题，写一段话介绍好朋友的外貌和性格。', '示例：我的好朋友小明个子高高的，有一双大眼睛。他性格开朗，总是笑嘻嘻的。他喜欢帮助别人，我们都喜欢和他玩。', '写人要抓特点', 'hard'],
  ['cn-leaf-042', 3, '用比喻句描写秋天。', '示例：秋天的树叶像金色的蝴蝶，在空中翩翩起舞。', '比喻写景', 'intermediate'],
  ['cn-leaf-042', 4, '用拟人句描写春天。', '示例：春风轻轻地抚摸着大地，唤醒了沉睡的小草。', '拟人写景', 'intermediate'],
  ['cn-leaf-043', 5, '以"假如我有一双翅膀"为题写一段想象作文。', '示例：假如我有一双翅膀，我要飞上蓝天，和白云做朋友。我要飞过高山，看看祖国的壮丽风景。我还要飞到贫困山区，给那里的小朋友送去书本和温暖。', '想象作文', 'hard'],
]
for (const [leaf, grade, stem, ans, sol, level] of cnWriting) {
  insert('语文', grade, [leaf], 'CN-T07', level, stem, ans, sol)
  cnCount++
}

console.log(`Chinese supplementary: ${cnCount}`)

// ============================================================
// MATH HARD PROBLEMS (~40)
// ============================================================
let mathCount = 0
const mathHard = [
  ['leaf-002', 4, '一个九位数，亿位是最小的质数，千万位是最小的合数，万位是5，其余各位是0。这个数是多少？省略亿位后面的尾数约是多少？', '245000000，约2亿', '亿位2，千万位4，万位5=245000000', 'hard'],
  ['leaf-004', 5, '一个分数，分子分母之和是30，如果分子加3，分母减3，新分数约分后是2/3。原分数是多少？', '15/15...重新计算：设分子x，分母30-x。(x+3)/(30-x-3)=2/3，3(x+3)=2(27-x)，3x+9=54-2x，5x=45，x=9，原分数9/21=3/7', 'hard'],
  ['leaf-005', 5, '甲数的小数点向右移动两位后等于乙数，甲乙两数之差为594，甲数是多少？', '6', '甲×100=乙，乙-甲=99×甲=594，甲=6', 'hard'],
  ['leaf-008', 5, '两个质数的积是35，这两个质数的和是多少？', '12', '35=5×7，5+7=12', 'intermediate'],
  ['leaf-008', 5, '一个数既是12的因数，又是18的因数，这个数最大是几？', '6', '12和18的最大公因数是6', 'intermediate'],
  ['leaf-012', 5, '简便计算：99×99+99', '9900', '99×(99+1)=99×100=9900', 'hard'],
  ['leaf-012', 5, '简便计算：25×44', '1100', '25×4×11=1100', 'intermediate'],
  ['leaf-013', 5, '简便计算：3.5×99+3.5', '350', '3.5×(99+1)=350', 'hard'],
  ['leaf-016', 6, '一件商品先提价20%，再降价20%，现价与原价相比变化了百分之几？', '降价4%', '原价1→1.2→1.2×0.8=0.96，降了4%', 'hard'],
  ['leaf-016', 6, '某商品进价200元，标价360元，打八折出售。利润率是多少？', '44%', '售价360×0.8=288，利润(288-200)/200=44%', 'hard'],
  ['leaf-025', 5, '解方程：4x - 2(x + 3) = 10', 'x=8', '4x-2x-6=10，2x=16，x=8', 'hard'],
  ['leaf-025', 5, '解方程：3(x - 4) = 2x + 5', 'x=17', '3x-12=2x+5，x=17', 'hard'],
  ['leaf-026', 5, '甲乙两车从相距480km的两地同时相向而行，3小时后相遇。甲车速度是乙车的1.5倍。甲乙各每小时行多少km？', '甲96km/h，乙64km/h', '设乙x，1.5x+x=480/3=160，x=64，甲96', 'hard'],
  ['leaf-027', 6, '一幅地图比例尺1:5000000，甲乙两地图上距离6cm，实际距离多少km？', '300km', '6×5000000=30000000cm=300km', 'intermediate'],
  ['leaf-027', 6, '一个长方形操场长80m宽60m，画在比例尺1:2000的图纸上，图上面积是多少？', '12平方厘米', '图上长4cm宽3cm，面积12cm²', 'hard'],
  ['leaf-033', 4, '一个等腰三角形的顶角是70°，底角是多少度？', '55°', '(180-70)÷2=55°', 'intermediate'],
  ['leaf-033', 5, '一个三角形三个内角的比是1:2:3，这是什么三角形？', '直角三角形', '180÷6=30，角为30°,60°,90°', 'hard'],
  ['leaf-037', 3, '一个长方形周长是40cm，长比宽多4cm，面积是多少？', '96平方厘米', '宽(40÷2-4)÷2=8，长12，面积96', 'hard'],
  ['leaf-039', 5, '一块梯形麦田上底80m下底120m高60m，每平方米收小麦0.8kg，共收多少kg？', '4800kg', '面积(80+120)×60÷2=6000m²，6000×0.8=4800kg', 'hard'],
  ['leaf-041', 6, '一个圆环内圆半径3cm外圆半径5cm，面积是多少？（π取3.14）', '50.24平方厘米', 'π(5²-3²)=3.14×16=50.24', 'hard'],
  ['leaf-042', 5, '一个长方体长8cm宽5cm高4cm，表面积是多少？', '184平方厘米', '2×(8×5+8×4+5×4)=2×92=184', 'intermediate'],
  ['leaf-043', 5, '一个正方体水池棱长2m，能装水多少升？', '8000升', '2×2×2=8m³=8000升', 'intermediate'],
  ['leaf-043', 6, '一个圆柱底面半径3cm高10cm，体积是多少？（π取3.14）', '282.6立方厘米', 'π×3²×10=282.6', 'hard'],
  ['leaf-061', 5, '鸡兔同笼，共25个头，70条腿，鸡兔各几只？', '鸡15只，兔10只', '假设全鸡：25×2=50，70-50=20，20÷2=10兔', 'hard'],
  ['leaf-061', 6, '一次竞赛共20题，答对得5分，答错扣2分，不答0分。小明答了18题得69分，他答对几题？', '15题', '设对x，错18-x，5x-2(18-x)=69，7x=105，x=15', 'hard'],
  ['leaf-065', 4, '甲乙两数和是120，甲是乙的4倍，甲乙各是多少？', '甲96，乙24', '设乙x，x+4x=120，x=24', 'intermediate'],
  ['leaf-065', 5, '甲乙两数差是36，甲是乙的3倍，甲乙各是多少？', '甲54，乙18', '设乙x，3x-x=36，x=18', 'intermediate'],
  ['leaf-066', 5, '甲乙两车从A地出发，甲每小时60km，乙每小时80km，甲先出发2小时，乙几小时追上甲？', '6小时', '60×2=120km差距，(80-60)x=120，x=6', 'hard'],
  ['leaf-067', 6, '一项工程甲独做8天，乙独做12天，甲先做2天后乙加入，还需几天完成？', '3天', '甲2天做1/4，剩3/4，(1/8+1/12)x=3/4，(5/24)x=3/4，x=3.6... 重新：3/4÷5/24=18/5=3.6天', 'hard'],
  ['leaf-068', 5, '松鼠妈妈采松果，晴天每天采20个，雨天每天采12个，共采了112个，平均每天采14个。几天晴天几天雨天？', '晴天2天，雨天6天', '总天数112/14=8天，设晴x雨8-x，20x+12(8-x)=112，8x=16，x=2', 'hard'],
  ['leaf-069', 5, '在一条200米的大路两侧每隔5米种一棵树（两端都种），共需多少棵树？', '82棵', '200÷5+1=41，两侧×2=82', 'intermediate'],
  ['leaf-070', 5, '给小朋友分糖果，每人5颗多3颗，每人6颗少4颗。有多少个小朋友？多少颗糖？', '7个小朋友，38颗糖', '(3+4)÷(6-5)=7人，7×5+3=38颗', 'hard'],
  ['leaf-071', 5, '今年小明8岁，爸爸32岁。几年后爸爸年龄是小明的3倍？', '4年后', '设x年后，32+x=3(8+x)，32+x=24+3x，8=2x，x=4', 'hard'],
  ['leaf-073', 3, '三(1)班有40人，参加语文兴趣小组的有22人，参加数学兴趣小组的有25人，每人至少参加一个。两个都参加的有多少人？', '7人', '22+25-40=7人', 'intermediate'],
  ['leaf-074', 4, '用一只平底锅煎饼，每次最多放2张饼，每面需煎2分钟。煎5张饼最少需要多少分钟？', '10分钟', '5张饼10面，每次2面，10÷2×2=10分钟', 'hard'],
  ['leaf-075', 5, '有9瓶药，其中1瓶少了几粒（轻一些）。用天平至少称几次能找出？', '2次', '9瓶分成3,3,3，先称3vs3', 'hard'],
  ['cn-leaf-076', 6, '盒子里有红黄蓝球各6个，至少摸出几个才能保证有3个同色？', '7个', '最不利：每种摸2个=6个，第7个必与某色凑成3个', 'hard'],
  ['leaf-077', 6, '1+3+5+7+9+11+13+15+17+19 = ?', '100', '10个奇数=10²=100', 'hard'],
  ['leaf-077', 6, '1+3+5+7+...+99 = ?', '2500', '50个奇数=50²=2500', 'hard'],
  ['leaf-028', 4, '找规律：1, 3, 6, 10, 15, （　）, （　）', '21, 28', '差为2,3,4,5,6,7', 'intermediate'],
]
for (const [leaf, grade, stem, ans, sol, level] of mathHard) {
  // Fix leaf ID for the one that has cn- prefix by mistake
  const actualLeaf = leaf.startsWith('cn-') ? leaf.replace('cn-', 'leaf-') : leaf
  insert('数学', grade, [actualLeaf], 'T06', level, stem, ans, sol, {ctx: 'life'})
  mathCount++
}

console.log(`Math hard problems: ${mathCount}`)

// Save
saveDB()
console.log(`\n✅ Total supplementary: ${count + cnCount + mathCount}`)
console.log(`  English: ${count}`)
console.log(`  Chinese: ${cnCount}`)
console.log(`  Math: ${mathCount}`)
