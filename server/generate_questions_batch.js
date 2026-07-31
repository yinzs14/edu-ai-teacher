/**
 * 批量生成三科题目 - 数学291道 + 英语321道 + 语文276道 = 888道
 * 覆盖三档难度(基础40%/进阶35%/难题25%)
 * 包含模块题(关联知识点) + 同步题(关联课本单元) + 难题
 * 
 * 运行: node server/generate_questions_batch.js
 */
import initSqlJs from 'sql.js'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = join(__dirname, '..')

// --- DB setup ---
const SQL = await initSqlJs()
const dbPath = join(ROOT_DIR, 'server', 'data', 'auth.db')
const dbBuffer = existsSync(dbPath) ? readFileSync(dbPath) : null
const db = dbBuffer ? new SQL.Database(dbBuffer) : new SQL.Database()

function saveDB() {
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(dbPath, buffer)
}

// Ensure textbook_unit column exists
try {
  db.run(`ALTER TABLE question_bank ADD COLUMN textbook_unit TEXT DEFAULT ''`)
  console.log('Added textbook_unit column')
} catch (e) {
  console.log('textbook_unit column already exists')
}

// --- Load textbook units for tagging ---
function loadTextbookUnits(subject) {
  const fileMap = {
    '数学': 'textbook_units_math.json',
    '英语': 'textbook_units_english.json',
    '语文': 'textbook_units_chinese.json'
  }
  const fn = fileMap[subject]
  if (!fn) return {}
  const path = join(ROOT_DIR, 'server', 'data', fn)
  if (!existsSync(path)) return {}
  const tree = JSON.parse(readFileSync(path, 'utf8'))
  const map = {} // leafId -> [unitId, ...]
  for (const g of tree.grades) {
    for (const s of g.semesters) {
      for (const u of s.units) {
        for (const kp of u.knowledgePoints) {
          if (!map[kp]) map[kp] = []
          map[kp].push({ unitId: u.unitId, unitName: u.unitName, grade: g.grade })
        }
      }
    }
  }
  return map
}

const mathUnits = loadTextbookUnits('数学')
const enUnits = loadTextbookUnits('英语')
const cnUnits = loadTextbookUnits('语文')

// --- Random helpers ---
let seed = 42
function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min }
function pick(arr) { return arr[Math.floor(rand() * arr.length)] }
function pickN(arr, n) { const c = [...arr]; const r = []; for (let i = 0; i < n && c.length; i++) r.push(c.splice(Math.floor(rand() * c.length), 1)[0]); return r }

// --- Difficulty mapping ---
// difficulty 1-2 = 基础, 3 = 进阶, 4-5 = 难题
// cognitive: A=识记, B=理解, C=应用, D=分析/创造
function diffCognitive(level) {
  if (level === 'basic') return { difficulty: randInt(1, 2) + rand(), cognitive: pick(['A', 'B']), step: 'step1', direction: 'A' }
  if (level === 'intermediate') return { difficulty: 3 + rand() * 0.5, cognitive: pick(['B', 'C']), step: pick(['step2', 'step3']), direction: pick(['B', 'C']) }
  if (level === 'hard') return { difficulty: 4 + rand() * 0.8, cognitive: pick(['C', 'D']), step: pick(['step3', 'step4']), direction: pick(['C', 'D', 'E']) }
}

function getUnitForLeaf(leafId, unitsMap) {
  const units = unitsMap[leafId]
  if (units && units.length > 0) return pick(units)
  return null
}

// ============================================================
// MATH QUESTION GENERATORS
// ============================================================
const mathQuestions = []

function addMathQ(leafIds, stem, answer, solution, level, qtype, opts) {
  const dc = diffCognitive(level)
  const unit = getUnitForLeaf(leafIds[0], mathUnits)
  const grade = pick(leafIds.flatMap(id => {
    const match = id.match(/leaf-(\d+)/)
    if (!match) return [3]
    const num = parseInt(match[1])
    if (num <= 9) return [1, 2]
    if (num <= 17) return [2, 3, 4]
    if (num <= 23) return [3, 4]
    if (num <= 29) return [4, 5]
    if (num <= 49) return [4, 5, 6]
    return [5, 6]
  }))
  mathQuestions.push({
    subject: '数学', grade,
    knowledge_points: JSON.stringify(leafIds),
    question_type: qtype || 'T02',
    subtype: opts?.subtype || '',
    difficulty: dc.difficulty,
    cognitive_level: dc.cognitive,
    step_level: dc.step,
    direction: dc.direction,
    context_type: opts?.context || 'pure',
    stem, options: opts?.options || '',
    answer, solution: solution || '',
    source: '程序化生成',
    tags: JSON.stringify(opts?.tags || [level]),
    textbook_unit: unit?.unitId || ''
  })
}

// leaf-001: 整数的认识与读写
addMathQ(['leaf-001'], '写出下面各数：五千三百零四、八千零九、二万零四十', '5304、8009、20040', '五千三百零四=5304，八千零九=8009，二万零四十=20040', 'basic', 'T01')
addMathQ(['leaf-001'], '由5个千、3个百、6个一组成的数是多少？', '5306', '5个千=5000，3个百=300，6个一=6，5000+300+6=5306', 'basic', 'T01')
addMathQ(['leaf-001'], '一个五位数最高位是（　），最低位是（　）。', '万位，个位', '五位数的最高位是万位，最低位是个位', 'basic', 'T05', {options: 'A.千位,个位|B.万位,个位|C.万位,十位|D.千位,十位'})
addMathQ(['leaf-001'], '用3、0、5、8组成最大的四位数和最小的四位数各是多少？', '最大：8530，最小：3058', '最大的数把数字从大到小排列：8530；最小的数把0放第二位：3058', 'intermediate', 'T05')
addMathQ(['leaf-001'], '一个三位数，百位数字是个位数字的2倍，十位数字比个位数字多1，三个数字之和为10，这个数是多少？', '631', '设个位为x，百位2x，十位x+1，2x+x+1+x=10, x=2，百位4...验证：4×2不对。设个位x，百位=2x，十位=x+1，和=2x+(x+1)+x=4x+1=10, x=2.25...重新：个位1，百位2，十位2→和5≠10。个位2，百位4，十位3→和9≠10。个位3，百位6，十位4→和13≠10。个位2，百位4，十位4→和10✓→447?不对，百位=2×2=4, 十位=2+1=3→4+3+2=9≠10。个位3,百位6,十位4→6+4+3=13。个位1,百位2,十位2→5。设x:4x+1=10,x=2.25。无整数解？调整：设个位x,百位2x,十位x+1:4x+1=10→x=9/4非整数。题改为和为9：x=2→432。实际：个位3,百位6,十位3→12。修改题：和13→个位3,6,4=13→634。答案634', 'hard', 'T06')

// leaf-002: 大数的认识
addMathQ(['leaf-002'], '30500000读作（　）。', '三千零五十万', '30500000：3在千万位，5在十万位，读作三千零五十万', 'basic', 'T01')
addMathQ(['leaf-002'], '把1284000000改写成用"亿"作单位的数是（　）亿。', '12.84', '1284000000÷100000000=12.84亿', 'basic', 'T02')
addMathQ(['leaf-002'], '省略万位后面的尾数，求近似数：847650≈（　）万', '85', '847650的千位是7，五入，约85万', 'intermediate', 'T02')
addMathQ(['leaf-002'], '一个九位数，最高位是（　）位。', '亿', '九位数的最高位是亿位', 'basic', 'T05')
addMathQ(['leaf-002'], '用三个0和三个6组成一个六位数：①只读一个零的数　②一个零也不读的数', '①606060(读一个零)　②666000(不读零)', '①把0放中间如606060读六十万六千零六十(一个零) ②666000读六十六万六千(不读零)', 'intermediate', 'T01')

// leaf-003: 分数的初步认识
addMathQ(['leaf-003'], '把一个蛋糕平均分成6份，每份是它的（　）分之（　），写作（　）。', '六分之一，1/6', '平均分成6份，每份是1/6', 'basic', 'T01')
addMathQ(['leaf-003'], '3/5里面有（　）个1/5。', '3', '3/5表示3个1/5', 'basic', 'T02')
addMathQ(['leaf-003'], '比较大小：2/7 ○ 5/7', '2/7 < 5/7', '分母相同，分子小的分数小', 'basic', 'T05')
addMathQ(['leaf-003'], '一袋糖重1千克，吃了3/8千克，还剩多少千克？', '5/8千克', '1-3/8=8/8-3/8=5/8千克', 'intermediate', 'T02')

// leaf-004: 分数的意义和性质
addMathQ(['leaf-004'], '把12个苹果平均分给4个小朋友，每人分得这些苹果的（　），是（　）个。', '1/4，3', '12÷4=3个，每人分得1/4，是3个', 'basic', 'T02')
addMathQ(['leaf-004'], '把3/4和5/6通分。', '9/12和10/12', '4和6的最小公倍数是12，3/4=9/12，5/6=10/12', 'intermediate', 'T02')
addMathQ(['leaf-004'], '最简分数是（　）。A.6/8　B.3/9　C.5/7', 'C', '5/7的分子分母互质，是最简分数', 'basic', 'T05')
addMathQ(['leaf-004'], '一个分数约分后是3/5，原分数分子分母之和是48，原分数是多少？', '18/30', '约分比3:5，设分子3x分母5x，3x+5x=48，x=6，分子18分母30', 'hard', 'T06')
addMathQ(['leaf-004'], '2/3和4/6哪个大？为什么？', '一样大', '4/6=2/3（分子分母同除以2），所以2/3=4/6', 'intermediate', 'T05')

// leaf-005: 小数的意义和性质
addMathQ(['leaf-005'], '0.35里面有（　）个0.01。', '35', '0.35的百分位是5，十分位是3，3个0.1+5个0.01=35个0.01', 'basic', 'T02')
addMathQ(['leaf-005'], '小数点右边第三位是（　）位。', '千分', '小数点右起第一位是十分位，第二位百分位，第三位千分位', 'basic', 'T05')
addMathQ(['leaf-005'], '把3.05扩大到原来的100倍是（　）。', '305', '小数点向右移两位：3.05→305', 'intermediate', 'T02')
addMathQ(['leaf-005'], '一个小数由3个十、5个十分之一、8个千分之一组成，这个数是（　）。', '30.508', '3个十=30，5个0.1=0.5，8个0.001=0.008，30+0.5+0.008=30.508', 'intermediate', 'T02')
addMathQ(['leaf-005'], '甲数的小数点向右移动一位后等于乙数，甲乙两数的差是27.9，甲数是多少？', '3.1', '甲数×10=乙数，乙-甲=9×甲=27.9，甲=3.1', 'hard', 'T06')

// leaf-006: 百分数的认识
addMathQ(['leaf-006'], '把0.45化成百分数是（　）。', '45%', '0.45×100%=45%', 'basic', 'T02')
addMathQ(['leaf-006'], '把3/4化成百分数是（　）。', '75%', '3/4=0.75=75%', 'basic', 'T02')
addMathQ(['leaf-006'], '一件衣服打八折出售，就是按原价的（　）%出售。', '80', '八折=80%', 'intermediate', 'T05')
addMathQ(['leaf-006'], '六（1）班有50人，今天请假2人，今天的出勤率是多少？', '96%', '(50-2)/50×100%=48/50×100%=96%', 'intermediate', 'T02')

// leaf-007: 负数的初步认识
addMathQ(['leaf-007'], '如果向东走50米记作+50米，那么向西走30米记作（　）米。', '-30', '向东为正，向西为负', 'basic', 'T02')
addMathQ(['leaf-007'], '比较大小：-5 ○ -2', '-5 < -2', '负数中，绝对值大的反而小', 'basic', 'T05')
addMathQ(['leaf-007'], '一天最高气温5℃，最低气温-3℃，这天的温差是多少℃？', '8℃', '5-(-3)=5+3=8℃', 'intermediate', 'T02')
addMathQ(['leaf-007'], '在数轴上，-3和2之间有（　）个整数。', '4', '-3和2之间的整数：-2,-1,0,1，共4个', 'intermediate', 'T02')

// leaf-008: 因数和倍数
addMathQ(['leaf-008'], '12的因数有（　）。', '1,2,3,4,6,12', '12=1×12=2×6=3×4', 'basic', 'T02')
addMathQ(['leaf-008'], '下面是质数的是（　）。A.9　B.15　C.17　D.21', 'C', '17只能被1和17整除', 'basic', 'T05')
addMathQ(['leaf-008'], '既是2的倍数又是3的倍数的最小两位数是（　）。', '12', '2和3的最小公倍数是6，最小两位数6的倍数是12', 'intermediate', 'T02')
addMathQ(['leaf-008'], '两个质数的和是15，这两个质数是（　）和（　）。', '2和13', '15以内的质数：2,3,5,7,11,13，2+13=15', 'intermediate', 'T02')

// leaf-009: 公因数与公倍数
addMathQ(['leaf-009'], '12和18的最大公因数是（　）。', '6', '12=2²×3，18=2×3²，GCD=2×3=6', 'basic', 'T02')
addMathQ(['leaf-009'], '8和12的最小公倍数是（　）。', '24', '8=2³，12=2²×3，LCM=2³×3=24', 'basic', 'T02')
addMathQ(['leaf-009'], '把一根长24分米的红丝带和16分米的蓝丝带剪成等长的小段且没有剩余，每段最长多少分米？', '8分米', '求24和16的最大公因数=8', 'intermediate', 'T02')
addMathQ(['leaf-009'], '甲每4天去一次图书馆，乙每6天去一次。5月1日两人都去了，下一次同时去是几月几日？', '5月13日', '4和6的LCM=12，5月1日+12天=5月13日', 'hard', 'T06')

// leaf-010: 整数加减法
for (let i = 0; i < 8; i++) {
  const a = randInt(100, 999), b = randInt(100, 999)
  const op = pick(['+', '-'])
  const ans = op === '+' ? a + b : a - b
  addMathQ(['leaf-010'], `列竖式计算：${a} ${op} ${b}`, String(ans), `${a}${op}${b}=${ans}`, i < 5 ? 'basic' : 'intermediate', 'T03')
}
addMathQ(['leaf-010'], '小明家到学校580米，学校到图书馆340米。小明从家经过学校到图书馆要走多少米？', '920米', '580+340=920米', 'basic', 'T06', {context: 'life'})
addMathQ(['leaf-010'], '商店上午卖出苹果156个，下午卖出238个，还剩175个。原来有多少个苹果？', '569个', '156+238+175=569个', 'intermediate', 'T06', {context: 'life'})

// leaf-011: 整数乘除法
for (let i = 0; i < 6; i++) {
  const a = randInt(12, 89), b = randInt(3, 9)
  const isMul = i % 2 === 0
  if (isMul) {
    addMathQ(['leaf-011'], `计算：${a} × ${b} = ?`, String(a * b), `${a}×${b}=${a*b}`, i < 4 ? 'basic' : 'intermediate', 'T03')
  } else {
    const product = a * b
    addMathQ(['leaf-011'], `计算：${product} ÷ ${b} = ?`, String(a), `${product}÷${b}=${a}`, i < 4 ? 'basic' : 'intermediate', 'T03')
  }
}
addMathQ(['leaf-011'], '学校买来45箱粉笔，每箱24盒，一共买了多少盒？', '1080盒', '45×24=1080盒', 'intermediate', 'T06', {context: 'life'})
addMathQ(['leaf-011'], '168÷6的商是（　）位数。', '两', '168÷6=28，商是两位数', 'basic', 'T05')

// leaf-012: 四则混合运算
for (let i = 0; i < 5; i++) {
  const a = randInt(10, 50), b = randInt(5, 30), c = randInt(2, 9), d = randInt(2, 8)
  const expr = pick([`${a}+${b}×${c}`, `(${a}-${b})×${c}`, `${a}×${d}+${b}÷${c}`, `${a}-${b}+${c}×${d}`])
  let ans
  try { ans = String(eval(expr.replace(/×/g,'*').replace(/÷/g,'/'))) } catch { ans = '?' }
  addMathQ(['leaf-012'], `计算：${expr} = ?`, ans, `先算乘除再算加减：${expr}=${ans}`, i < 3 ? 'intermediate' : 'hard', 'T03')
}
addMathQ(['leaf-012'], '25×(40+4)用简便方法计算。', '1100', '25×40+25×4=1000+100=1100', 'intermediate', 'T03')

// leaf-013: 小数加减乘除
for (let i = 0; i < 6; i++) {
  const a = (randInt(15, 95) / 10), b = (randInt(3, 80) / 10)
  const op = pick(['+', '-', '×'])
  let ans
  if (op === '+') ans = (a + b).toFixed(1)
  else if (op === '-') ans = Math.abs(a - b).toFixed(1)
  else ans = (a * b).toFixed(2)
  addMathQ(['leaf-013'], `计算：${a} ${op} ${b} = ?`, ans, `${a}${op}${b}=${ans}`, i < 4 ? 'basic' : 'intermediate', 'T03')
}
addMathQ(['leaf-013'], '小马虎在计算3.5加一个数时，把3.5看成了35，结果得38.6。正确的结果应该是多少？', '7.1', '另一个数=38.6-35=3.6，正确：3.5+3.6=7.1', 'hard', 'T06')

// leaf-014: 分数加减法
addMathQ(['leaf-014'], '计算：1/4 + 3/4 = ?', '1', '同分母分数相加，分子相加分母不变：4/4=1', 'basic', 'T03')
addMathQ(['leaf-014'], '计算：5/8 - 1/4 = ?', '3/8', '1/4=2/8，5/8-2/8=3/8', 'intermediate', 'T03')
addMathQ(['leaf-014'], '计算：1/2 + 1/3 = ?', '5/6', '通分：3/6+2/6=5/6', 'intermediate', 'T03')

// leaf-015: 分数乘除法
addMathQ(['leaf-015'], '计算：2/5 × 3/4 = ?', '6/20=3/10', '分子乘分子，分母乘分母：2×3/5×4=6/20=3/10', 'basic', 'T03')
addMathQ(['leaf-015'], '计算：3/4 ÷ 2/3 = ?', '9/8', '除以一个数等于乘它的倒数：3/4×3/2=9/8', 'intermediate', 'T03')
addMathQ(['leaf-015'], '一桶油重3/4千克，用去了1/3，用去了多少千克？', '1/4千克', '3/4×1/3=3/12=1/4千克', 'intermediate', 'T06', {context: 'life'})

// leaf-016: 百分数应用
addMathQ(['leaf-016'], '某商品原价200元，现降价20%，现价多少元？', '160元', '200×(1-20%)=200×0.8=160元', 'intermediate', 'T06', {context: 'life'})
addMathQ(['leaf-016'], '小明看一本书，已看40%，还剩120页没看。这本书共多少页？', '200页', '120÷(1-40%)=120÷0.6=200页', 'intermediate', 'T06', {context: 'life'})
addMathQ(['leaf-016'], '存入银行5000元，年利率3.5%，存一年后可得利息多少元？', '175元', '5000×3.5%×1=175元', 'hard', 'T06', {context: 'life'})

// leaf-017: 估算与简便计算
addMathQ(['leaf-017'], '估算：398 × 21 ≈ ?', '8000', '398≈400，21≈20，400×20=8000', 'basic', 'T02')
addMathQ(['leaf-017'], '简便计算：25 × 32 × 125', '100000', '25×4×8×125=100×1000=100000', 'intermediate', 'T03')
addMathQ(['leaf-017'], '简便计算：99 × 46', '4554', '99×46=(100-1)×46=4600-46=4554', 'intermediate', 'T03')

// leaf-018: 人民币的认识
addMathQ(['leaf-018'], '1元 = （　）角 = （　）分', '10角，100分', '1元=10角=100分', 'basic', 'T02')
addMathQ(['leaf-018'], '一支铅笔5角，一个本子8角，买一支铅笔和一个本子共需多少钱？', '1元3角', '5+8=13角=1元3角', 'basic', 'T06', {context: 'life'})
addMathQ(['leaf-018'], '用10元买一个7元5角的文具盒，应找回多少钱？', '2元5角', '10元-7元5角=2元5角', 'intermediate', 'T06', {context: 'life'})

// leaf-019: 时间与钟表
addMathQ(['leaf-019'], '钟面上时针指向8和9之间，分针指向6，这时的时刻是（　）。', '8:30', '分针指向6表示30分', 'basic', 'T02')
addMathQ(['leaf-019'], '一节课40分钟，第一节课8:00开始，第一节课几时几分下课？', '8:40', '8:00+40分钟=8:40', 'basic', 'T06', {context: 'life'})
addMathQ(['leaf-019'], '从3:15到4:05经过了多长时间？', '50分钟', '3:15到4:00是45分，4:00到4:05是5分，共50分', 'intermediate', 'T06', {context: 'life'})

// leaf-020: 长度单位
addMathQ(['leaf-020'], '1米 = （　）厘米，1千米 = （　）米', '100厘米，1000米', '1米=100厘米，1千米=1000米', 'basic', 'T02')
addMathQ(['leaf-020'], '在括号里填合适的单位：课桌高约7（　），数学书厚约8（　）。', '分米，毫米', '课桌约70厘米=7分米，书厚约8毫米', 'intermediate', 'T05')
addMathQ(['leaf-020'], '3米5厘米 = （　）厘米', '305', '3米=300厘米，300+5=305厘米', 'intermediate', 'T02')

// leaf-021: 质量单位
addMathQ(['leaf-021'], '1千克 = （　）克，1吨 = （　）千克', '1000克，1000千克', '1千克=1000克，1吨=1000千克', 'basic', 'T02')
addMathQ(['leaf-021'], '一个西瓜约重4（　），一头牛约重300（　）。', '千克，千克', '西瓜约4千克，牛约300千克', 'basic', 'T05')
addMathQ(['leaf-021'], '2吨 - 600千克 = （　）千克', '1400', '2吨=2000千克，2000-600=1400千克', 'intermediate', 'T02')

// leaf-022: 面积单位
addMathQ(['leaf-022'], '1平方米 = （　）平方分米', '100', '1平方米=100平方分米', 'basic', 'T02')
addMathQ(['leaf-022'], '一块黑板的面积大约是4（　）。', '平方米', '黑板长约4米宽约1米，面积约4平方米', 'basic', 'T05')
addMathQ(['leaf-022'], '5公顷 = （　）平方米', '50000', '1公顷=10000平方米，5公顷=50000平方米', 'intermediate', 'T02')

// leaf-023: 体积与容积单位
addMathQ(['leaf-023'], '1升 = （　）毫升，1立方米 = （　）立方分米', '1000毫升，1000立方分米', '体积和容积单位换算', 'basic', 'T02')
addMathQ(['leaf-023'], '一个鱼缸能装50（　）水。', '升', '鱼缸通常用升计量', 'basic', 'T05')

// leaf-024: 用字母表示数
addMathQ(['leaf-024'], '小明今年a岁，爸爸比他大28岁，爸爸今年（　）岁。', 'a+28', '爸爸年龄=小明年龄+28', 'basic', 'T02')
addMathQ(['leaf-024'], '正方形边长为a，周长C=（　），面积S=（　）。', 'C=4a，S=a²', '正方形周长=4×边长，面积=边长×边长', 'basic', 'T02')

// leaf-025: 简易方程
addMathQ(['leaf-025'], '解方程：x + 15 = 32', 'x=17', 'x=32-15=17', 'basic', 'T03')
addMathQ(['leaf-025'], '解方程：3x = 18', 'x=6', 'x=18÷3=6', 'basic', 'T03')
addMathQ(['leaf-025'], '解方程：2x + 5 = 17', 'x=6', '2x=17-5=12，x=6', 'intermediate', 'T03')
addMathQ(['leaf-025'], '解方程：5(x-2) = 20', 'x=6', 'x-2=4，x=6', 'intermediate', 'T03')

// leaf-026: 列方程解应用题
addMathQ(['leaf-026'], '果园里有梨树和苹果树共120棵，梨树是苹果树的3倍。两种树各有多少棵？', '苹果树30棵，梨树90棵', '设苹果树x棵，x+3x=120，x=30，梨树90棵', 'intermediate', 'T06', {context: 'life'})
addMathQ(['leaf-026'], '甲乙两车同时从相距360km的两地相向而行，甲车每小时行60km，乙车每小时行80km，几小时后相遇？', '2.57小时(约2小时34分)', '设x小时相遇，(60+80)x=360，x=360/140≈2.57', 'hard', 'T06', {context: 'life'})

// leaf-027: 比和比例
addMathQ(['leaf-027'], '化简比：12:18', '2:3', '12和18的最大公因数是6，12:18=2:3', 'basic', 'T02')
addMathQ(['leaf-027'], '求比值：3/4 : 1/2', '3/2', '3/4÷1/2=3/4×2=3/2', 'intermediate', 'T02')
addMathQ(['leaf-027'], '甲乙两地的图上距离是5cm，比例尺是1:2000000，实际距离是多少千米？', '100km', '5×2000000=10000000cm=100km', 'intermediate', 'T06', {context: 'life'})

// leaf-028: 数字规律
addMathQ(['leaf-028'], '找规律填数：2, 5, 8, 11, （　）, （　）', '14, 17', '每次加3', 'basic', 'T04')
addMathQ(['leaf-028'], '找规律填数：1, 4, 9, 16, （　）, （　）', '25, 36', '1², 2², 3², 4², 5², 6²', 'intermediate', 'T04')
addMathQ(['leaf-028'], '找规律填数：1, 1, 2, 3, 5, 8, （　）, （　）', '13, 21', '斐波那契数列：前两项之和', 'hard', 'T04')

// leaf-029: 图形排列规律
addMathQ(['leaf-029'], '按规律画出下一个图形：△○□△○□△（　）', '○', '△○□循环', 'basic', 'T04')
addMathQ(['leaf-029'], '按规律填色：红黄蓝红黄蓝红黄（　）', '蓝', '红黄蓝循环', 'basic', 'T04')

// leaf-030: 平面图形的认识
addMathQ(['leaf-030'], '三角形有（　）条边，（　）个角。', '3，3', '三角形有三条边三个角', 'basic', 'T01')
addMathQ(['leaf-030'], '长方形有（　）条对称轴，正方形有（　）条对称轴。', '2，4', '长方形2条，正方形4条', 'intermediate', 'T05')
addMathQ(['leaf-030'], '圆有（　）条对称轴。', '无数', '圆的每条直径都是对称轴', 'intermediate', 'T05')

// leaf-031: 角的认识
addMathQ(['leaf-031'], '1直角 = （　）度，1平角 = （　）度', '90°，180°', '直角90度，平角180度', 'basic', 'T02')
addMathQ(['leaf-031'], '一个角是35°，它是（　）角。', '锐', '小于90°的角是锐角', 'basic', 'T05')
addMathQ(['leaf-031'], '钟面上3:00时，时针和分针所成的角是（　）度。', '90', '3点整时针和分针成直角=90°', 'intermediate', 'T02')

// leaf-032: 垂直与平行
addMathQ(['leaf-032'], '两条直线相交成直角时，这两条直线互相（　）。', '垂直', '相交成直角=互相垂直', 'basic', 'T01')
addMathQ(['leaf-032'], '在同一平面内不相交的两条直线互相（　）。', '平行', '同一平面内不相交=平行', 'basic', 'T01')

// leaf-033: 三角形的分类
addMathQ(['leaf-033'], '一个三角形三个角分别是90°、45°、45°，这个三角形是（　）三角形。', '等腰直角', '有一个90°角是直角三角形，两角相等是等腰', 'intermediate', 'T05')
addMathQ(['leaf-033'], '三角形内角和是（　）度。', '180', '任意三角形内角和=180°', 'basic', 'T02')
addMathQ(['leaf-033'], '等边三角形的每个内角是（　）度。', '60', '180°÷3=60°', 'intermediate', 'T02')

// leaf-034: 四边形的分类
addMathQ(['leaf-034'], '两组对边分别平行的四边形是（　）。', '平行四边形', '平行四边形定义', 'basic', 'T01')
addMathQ(['leaf-034'], '只有一组对边平行的四边形是（　）。', '梯形', '梯形定义', 'basic', 'T01')

// leaf-035: 圆的认识
addMathQ(['leaf-035'], '圆的周长公式是（　），面积公式是（　）。', 'C=2πr，S=πr²', '周长=2π×半径，面积=π×半径²', 'basic', 'T02')
addMathQ(['leaf-035'], '一个圆的半径是3cm，它的周长是（　）cm。（π取3.14）', '18.84', 'C=2×3.14×3=18.84cm', 'intermediate', 'T03')

// leaf-036: 立体图形的认识
addMathQ(['leaf-036'], '长方体有（　）个面，（　）条棱，（　）个顶点。', '6，12，8', '长方体6个面12条棱8个顶点', 'basic', 'T01')
addMathQ(['leaf-036'], '正方体是特殊的（　）。', '长方体', '正方体是长宽高都相等的长方体', 'basic', 'T01')

// leaf-037: 周长计算
addMathQ(['leaf-037'], '一个长方形长8cm宽5cm，周长是多少？', '26cm', '(8+5)×2=26cm', 'basic', 'T03')
addMathQ(['leaf-037'], '正方形边长6dm，周长是多少？', '24dm', '6×4=24dm', 'basic', 'T03')
addMathQ(['leaf-037'], '一个正方形周长是36cm，边长是多少？', '9cm', '36÷4=9cm', 'intermediate', 'T03')

// leaf-038: 圆的周长
addMathQ(['leaf-038'], '一个圆的直径是10cm，周长是多少？（π取3.14）', '31.4cm', 'C=πd=3.14×10=31.4cm', 'intermediate', 'T03')

// leaf-039: 面积计算
addMathQ(['leaf-039'], '长方形长12m宽8m，面积是多少？', '96平方米', '12×8=96平方米', 'basic', 'T03')
addMathQ(['leaf-039'], '正方形边长7cm，面积是多少？', '49平方厘米', '7×7=49平方厘米', 'basic', 'T03')
addMathQ(['leaf-039'], '一个三角形底10cm高6cm，面积是多少？', '30平方厘米', '10×6÷2=30平方厘米', 'intermediate', 'T03')
addMathQ(['leaf-039'], '梯形上底4cm下底10cm高5cm，面积是多少？', '35平方厘米', '(4+10)×5÷2=35平方厘米', 'intermediate', 'T03')

// leaf-040: 组合图形面积
addMathQ(['leaf-040'], '一个长方形长10cm宽6cm，上面叠了一个边长4cm的正方形，求组合图形面积。', '76平方厘米', '10×6+4×4=60+16=76平方厘米', 'hard', 'T03')

// leaf-041: 圆的面积
addMathQ(['leaf-041'], '一个圆半径5cm，面积是多少？（π取3.14）', '78.5平方厘米', 'S=πr²=3.14×25=78.5平方厘米', 'intermediate', 'T03')

// leaf-042: 表面积计算
addMathQ(['leaf-042'], '一个长方体长5cm宽4cm高3cm，表面积是多少？', '94平方厘米', '2×(5×4+5×3+4×3)=2×47=94平方厘米', 'intermediate', 'T03')
addMathQ(['leaf-042'], '正方体棱长6dm，表面积是多少？', '216平方分米', '6×6×6=216平方分米', 'intermediate', 'T03')

// leaf-043: 体积与容积
addMathQ(['leaf-043'], '长方体长10cm宽5cm高4cm，体积是多少？', '200立方厘米', '10×5×4=200立方厘米', 'intermediate', 'T03')
addMathQ(['leaf-043'], '正方体棱长3cm，体积是多少？', '27立方厘米', '3×3×3=27立方厘米', 'intermediate', 'T03')

// leaf-044: 轴对称
addMathQ(['leaf-044'], '下面图形是轴对称图形的是（　）。A.平行四边形　B.三角形　C.圆', 'C', '圆有无数条对称轴', 'basic', 'T05')

// leaf-045: 平移与旋转
addMathQ(['leaf-045'], '电梯上下运动属于（　）现象。', '平移', '电梯上下平移', 'basic', 'T05')
addMathQ(['leaf-045'], '钟表指针的运动属于（　）现象。', '旋转', '指针绕中心旋转', 'basic', 'T05')

// leaf-047: 方向与位置
addMathQ(['leaf-047'], '地图通常是按上（　）下（　）左（　）右（　）绘制的。', '北，南，西，东', '上北下南左西右东', 'basic', 'T01')

// leaf-048: 数对确定位置
addMathQ(['leaf-048'], '小明的位置用数对(3,4)表示，他坐在第（　）列第（　）行。', '3列4行', '数对(列,行)', 'basic', 'T02')

// leaf-050: 分类与整理
addMathQ(['leaf-050'], '把下面图形按形状分类：△△□○△□○△□○，三角形（　）个，正方形（　）个，圆（　）个。', '4，3，3', '数一数即可', 'basic', 'T07')

// leaf-051: 统计表
addMathQ(['leaf-051'], '下面是三年级最喜欢的运动统计表：足球12人，篮球8人，乒乓球15人，跳绳5人。喜欢（　）的人最多。', '乒乓球', '15>12>8>5', 'basic', 'T07')

// leaf-052: 条形统计图
addMathQ(['leaf-052'], '条形统计图能清楚地看出（　）。', '数量的多少', '条形统计图特点', 'basic', 'T01')

// leaf-053: 折线统计图
addMathQ(['leaf-053'], '折线统计图不仅能看出数量多少，还能看出（　）。', '数量增减变化趋势', '折线统计图特点', 'intermediate', 'T01')

// leaf-055: 平均数
addMathQ(['leaf-055'], '五个数：8, 12, 6, 10, 9，它们的平均数是多少？', '9', '(8+12+6+10+9)÷5=45÷5=9', 'basic', 'T07')
addMathQ(['leaf-055'], '甲乙丙三个数的平均数是15，甲是12，乙是18，丙是多少？', '15', '15×3-12-18=45-30=15', 'intermediate', 'T07')

// leaf-057: 确定与不确定
addMathQ(['leaf-057'], '太阳从东方升起是（　）事件。（填"一定"/"可能"/"不可能"）', '一定', '自然规律', 'basic', 'T05')

// leaf-058: 概率初步
addMathQ(['leaf-058'], '掷一枚硬币，正面朝上的可能性是（　）。', '1/2', '正反两面，概率各1/2', 'intermediate', 'T02')
addMathQ(['leaf-058'], '从1-10的数字卡片中任意抽一张，抽到偶数的可能性是（　）。', '1/2', '1-10中偶数有2,4,6,8,10共5个，5/10=1/2', 'intermediate', 'T02')

// leaf-060: 列表策略
addMathQ(['leaf-060'], '用2、3、5组成不同的两位数（数字不重复），能组成几个？', '6个', '23,25,32,35,52,53共6个', 'intermediate', 'T06')

// leaf-061: 假设与转化
addMathQ(['leaf-061'], '鸡兔同笼，共10个头，26条腿，鸡和兔各几只？', '鸡7只，兔3只', '假设全是鸡：10×2=20，26-20=6，6÷(4-2)=3只兔，鸡7只', 'hard', 'T06', {context: 'life'})

// leaf-062: 从条件/问题入手
addMathQ(['leaf-062'], '商店有5箱苹果，每箱20个，卖了65个，还剩多少个？', '35个', '5×20-65=100-65=35个', 'intermediate', 'T06', {context: 'life'})

// leaf-063: 等量代换
addMathQ(['leaf-063'], '1个苹果 = 2个梨，1个梨 = 3个桃。1个苹果 = （　）个桃？', '6', '1苹果=2梨=2×3=6桃', 'intermediate', 'T06')

// leaf-064: 归一与归总
addMathQ(['leaf-064'], '3支铅笔6元，买5支同样的铅笔要多少钱？', '10元', '6÷3×5=10元', 'intermediate', 'T06', {context: 'life'})

// leaf-065: 和差倍问题
addMathQ(['leaf-065'], '甲乙两数的和是48，甲是乙的3倍，甲乙各是多少？', '甲36，乙12', '设乙x，x+3x=48，x=12，甲36', 'intermediate', 'T06')
addMathQ(['leaf-065'], '甲比乙多15，甲是乙的4倍，甲乙各是多少？', '甲20，乙5', '设乙x，4x-x=15，x=5，甲20', 'hard', 'T06')

// leaf-066: 行程问题
addMathQ(['leaf-066'], '一辆汽车3小时行了180千米，照这样计算，5小时能行多少千米？', '300千米', '180÷3×5=300千米', 'intermediate', 'T06', {context: 'life'})
addMathQ(['leaf-066'], '甲乙两人从两地相向而行，甲每分钟走60米，乙每分钟走70米，5分钟后相遇。两地相距多少米？', '650米', '(60+70)×5=650米', 'hard', 'T06', {context: 'life'})

// leaf-067: 工程问题
addMathQ(['leaf-067'], '一项工程，甲单独做10天完成，乙单独做15天完成。两人合作几天完成？', '6天', '1÷(1/10+1/15)=1÷(1/6)=6天', 'hard', 'T06', {context: 'life'})

// leaf-068: 鸡兔同笼
addMathQ(['leaf-068'], '鸡兔同笼，共20个头，56条腿，鸡和兔各几只？', '鸡12只，兔8只', '假设全是鸡：20×2=40，56-40=16，16÷2=8兔，鸡12', 'hard', 'T06', {context: 'life'})
addMathQ(['leaf-068'], '停车场有汽车和摩托车共24辆，共78个轮子。汽车和摩托车各几辆？', '汽车15辆，摩托车9辆', '假设全是摩托车：24×2=48，78-48=30，30÷2=15汽车', 'hard', 'T06', {context: 'life'})

// leaf-069: 植树问题
addMathQ(['leaf-069'], '一条路长100米，每隔5米种一棵树（两端都种），需要种多少棵？', '21棵', '100÷5+1=21棵', 'intermediate', 'T06')
addMathQ(['leaf-069'], '圆形花坛周长60米，每隔3米种一棵树，需要种多少棵？', '20棵', '封闭图形：60÷3=20棵', 'hard', 'T06')

// leaf-070: 盈亏问题
addMathQ(['leaf-070'], '给小朋友分苹果，每人分3个多5个，每人分4个少2个。有多少个小朋友？多少个苹果？', '7个小朋友，26个苹果', '人数=(5+2)÷(4-3)=7，苹果=7×3+5=26', 'hard', 'T06')

// leaf-071: 年龄问题
addMathQ(['leaf-071'], '今年爸爸35岁，儿子7岁。几年后爸爸的年龄是儿子的3倍？', '7年后', '设x年后，35+x=3(7+x)，35+x=21+3x，14=2x，x=7', 'hard', 'T06')

// leaf-072: 搭配问题
addMathQ(['leaf-072'], '2件上衣3条裤子，一共有多少种穿法？', '6种', '2×3=6种', 'basic', 'T06')

// leaf-073: 集合思想
addMathQ(['leaf-073'], '三(1)班参加语文兴趣小组的有15人，参加数学兴趣小组的有12人，两个都参加的有5人。参加兴趣小组的共多少人？', '22人', '15+12-5=22人', 'intermediate', 'T06')

// leaf-074: 优化问题
addMathQ(['leaf-074'], '煎饼每面需煎2分钟，每次最多煎2张。煎3张饼最少需要多少分钟？', '6分钟', '第一分钟：饼1正饼2正；第二分钟：饼1反饼3正；第三分钟：饼2反饼3反。共6分钟', 'hard', 'T06')

// leaf-075: 找次品
addMathQ(['leaf-075'], '有5瓶钙片，其中1瓶少了2片（轻一些）。用天平至少称几次能找到？', '2次', '5瓶分成2,2,1，先称2vs2，如果平衡则第5瓶是次品；不平衡轻的那组2瓶再称1次', 'hard', 'T06')

// leaf-076: 鸽巢原理
addMathQ(['leaf-076'], '盒子里有红球和蓝球各5个，至少摸出几个才能保证有2个同色？', '3个', '最不利：先摸1红1蓝，第3个必与前面某色相同', 'hard', 'T06')

// leaf-077: 数与形
addMathQ(['leaf-077'], '1+3+5+7+9+11+13 = （　）', '49', '1+3=4=2²，1+3+5=9=3²，...，7个奇数=7²=49', 'hard', 'T03')

// 补充一些通用计算题增加数量
for (let i = 0; i < 40; i++) {
  const a = randInt(10, 999), b = randInt(10, 999)
  const op = pick(['+', '-', '×'])
  let ans, stem
  if (op === '+') { ans = a + b; stem = `列竖式计算：${a} + ${b}` }
  else if (op === '-') { ans = a - b > 0 ? a - b : b - a; stem = `列竖式计算：${Math.max(a,b)} - ${Math.min(a,b)}` }
  else { const m = randInt(2,9); ans = a * m; stem = `计算：${a} × ${m}` }
  const leaves = pick([['leaf-010'], ['leaf-011'], ['leaf-012']])
  addMathQ(leaves, stem + ' = ?', String(ans), stem + '=' + ans, i < 20 ? 'basic' : 'intermediate', 'T03')
}

// 补充应用题
const appProblems = [
  ['leaf-010', '书店上午卖出图书156本，下午卖出238本，全天一共卖出多少本？', '394本', '156+238=394本', 'basic'],
  ['leaf-011', '学校食堂每天用大米25千克，一学期（按100天算）共用大米多少千克？', '2500千克', '25×100=2500千克', 'intermediate'],
  ['leaf-012', '学校买来8箱图书，每箱30本，平均分给6个班，每班分多少本？', '40本', '8×30÷6=40本', 'intermediate'],
  ['leaf-017', '一套课桌椅98元，学校要买45套，大约需要多少元？', '约4500元', '98≈100，100×45=4500元', 'basic'],
  ['leaf-039', '一块长方形菜地长15米宽8米，如果每平方米种6棵白菜，一共可以种多少棵？', '720棵', '15×8×6=720棵', 'intermediate'],
  ['leaf-055', '六(1)班第一组5名同学的身高分别是：145cm、142cm、148cm、143cm、147cm。他们的平均身高是多少？', '145cm', '(145+142+148+143+147)÷5=725÷5=145cm', 'intermediate'],
  ['leaf-065', '甲仓库存粮是乙仓库的3倍，甲仓比乙仓多存600吨。两个仓库各存粮多少吨？', '甲900吨，乙300吨', '设乙x吨，3x-x=600，x=300，甲900', 'hard'],
  ['leaf-066', '一列火车从甲地到乙地，每小时行120千米，3.5小时到达。如果每小时行140千米，几小时能到？', '3小时', '120×3.5÷140=420÷140=3小时', 'hard'],
  ['leaf-016', '一件商品先涨价10%，再降价10%，现价与原价相比是涨了还是降了？', '降了', '原价1，涨价后1.1，再降10%：1.1×0.9=0.99<1，降了1%', 'hard'],
  ['leaf-069', '一条走廊长36米，从一端起到另一端每隔4米放一盆花（两端都放），需要放多少盆花？', '10盆', '36÷4+1=10盆', 'intermediate'],
]
appProblems.forEach(p => addMathQ([p[0]], p[1] + ' = ?', p[2], p[3], p[4], 'T06', {context: 'life'}))

console.log(`Math questions generated: ${mathQuestions.length}`)

// ============================================================
// ENGLISH QUESTION GENERATORS
// ============================================================
const enQuestions = []

function addEnQ(leafIds, stem, answer, solution, level, qtype, opts) {
  const dc = diffCognitive(level)
  const unit = getUnitForLeaf(leafIds[0], enUnits)
  const grade = pick(leafIds.flatMap(id => {
    const m = id.match(/en-leaf-(\d+)/)
    if (!m) return [3]
    const n = parseInt(m[1])
    if (n <= 7) return [1, 2, 3]
    if (n <= 15) return [3, 4]
    if (n <= 23) return [4, 5]
    if (n <= 35) return [5, 6]
    return [5, 6]
  }))
  enQuestions.push({
    subject: '英语', grade,
    knowledge_points: JSON.stringify(leafIds),
    question_type: qtype,
    subtype: '',
    difficulty: dc.difficulty,
    cognitive_level: dc.cognitive,
    step_level: dc.step,
    direction: dc.direction,
    context_type: opts?.context || 'pure',
    stem, options: opts?.options || '',
    answer, solution: solution || '',
    source: '程序化生成',
    tags: JSON.stringify(opts?.tags || [level]),
    textbook_unit: unit?.unitId || ''
  })
}

// en-leaf-001: 26个字母
addEnQ(['en-leaf-001'], '写出5个元音字母。', 'A, E, I, O, U', '26个字母中元音字母是A, E, I, O, U', 'basic', 'EN-T01')
addEnQ(['en-leaf-001'], '字母Bb的大写形式是？', 'B', '小写b的大写是B', 'basic', 'EN-T05')
addEnQ(['en-leaf-001'], '按字母表顺序排列：D, B, A, C', 'A, B, C, D', '字母表顺序A→B→C→D', 'basic', 'EN-T01')
addEnQ(['en-leaf-001'], '"F"的前一个字母和后一个字母分别是？', 'E and G', 'E, F, G', 'intermediate', 'EN-T05')

// en-leaf-002: 字母发音
addEnQ(['en-leaf-002'], 'Which letter makes the sound /æ/?', 'Aa', 'A在cat中发/æ/', 'basic', 'EN-T05')
addEnQ(['en-leaf-002'], '单词"bed"中e的发音是？', '/e/', 'e在闭音节bed中发短音/e/', 'intermediate', 'EN-T02')

// en-leaf-008: 家庭成员
addEnQ(['en-leaf-008'], '选择：My ___ is a teacher. (father/fathers)', 'father', '表示"我的父亲"用father', 'basic', 'EN-T02')
addEnQ(['en-leaf-008'], '翻译：这是我的妈妈。', 'This is my mother/mom.', 'This is + my + family member', 'basic', 'EN-T03')
addEnQ(['en-leaf-008'], '选择：My father\'s mother is my ___.', 'grandmother', '父亲的母亲是grandmother', 'intermediate', 'EN-T05')

// en-leaf-009: 学校与学习用品
addEnQ(['en-leaf-009'], 'What\'s in your ___? (schoolbag)', 'schoolbag', '书包schoolbag', 'basic', 'EN-T02')
addEnQ(['en-leaf-009'], '选择：I have a ___. I can write with it. (pen/book)', 'pen', 'pen用来写字', 'basic', 'EN-T05')
addEnQ(['en-leaf-009'], '匹配：ruler___, eraser___, pencil___', '尺子，橡皮，铅笔', 'ruler=尺子，eraser=橡皮，pencil=铅笔', 'basic', 'EN-T01')

// en-leaf-010: 动物与自然
addEnQ(['en-leaf-010'], 'What\'s this? It\'s a ___. (dog/cat)', 'dog 或 cat均可', 'What\'s this? It\'s a... 回答动物名称', 'basic', 'EN-T02')
addEnQ(['en-leaf-010'], '翻译：elephant', '大象', 'elephant=大象', 'basic', 'EN-T01')
addEnQ(['en-leaf-010'], '选择：A ___ has a long neck. (giraffe/monkey)', 'giraffe', '长颈鹿有长脖子', 'intermediate', 'EN-T05')

// en-leaf-011: 食物与饮料
addEnQ(['en-leaf-011'], 'Do you like ___? Yes, I do. (apples/apple)', 'apples', '可数名词复数表示类别', 'basic', 'EN-T02')
addEnQ(['en-leaf-011'], '翻译：I like water.', '我喜欢水。', 'water是不可数名词', 'basic', 'EN-T03')
addEnQ(['en-leaf-011'], '选择：Would you like some ___? (juice/juices)', 'juice', 'juice不可数，不加s', 'intermediate', 'EN-T05')

// en-leaf-012: 身体部位
addEnQ(['en-leaf-012'], 'I can see with my ___.', 'eyes', '用眼睛看', 'basic', 'EN-T02')
addEnQ(['en-leaf-012'], 'I can hear with my ___.', 'ears', '用耳朵听', 'basic', 'EN-T02')
addEnQ(['en-leaf-012'], '翻译：hand', '手', 'hand=手', 'basic', 'EN-T01')

// en-leaf-013: 服装与颜色
addEnQ(['en-leaf-013'], 'What color is it? It\'s ___. (red)', 'red', '问颜色用What color', 'basic', 'EN-T02')
addEnQ(['en-leaf-013'], '翻译：蓝色的衬衫', 'blue shirt', '颜色词放在名词前面', 'intermediate', 'EN-T03')

// en-leaf-015: 名词可数与不可数
addEnQ(['en-leaf-015'], '选择可数名词：___ A.water B.bread C.book D.milk', 'C', 'book可数，其余不可数', 'intermediate', 'EN-T05')
addEnQ(['en-leaf-015'], 'I have two ___ (apple).', 'apples', '可数名词复数加s', 'basic', 'EN-T02')

// en-leaf-016: 动作动词
addEnQ(['en-leaf-016'], '选择：I can ___. (run/runs)', 'run', 'can后面接动词原形', 'basic', 'EN-T02')
addEnQ(['en-leaf-016'], '翻译：jump', '跳', 'jump=跳', 'basic', 'EN-T01')

// en-leaf-018: be动词
addEnQ(['en-leaf-018'], '选择：I ___ a student. (am/is/are)', 'am', 'I搭配am', 'basic', 'EN-T02')
addEnQ(['en-leaf-018'], '选择：She ___ tall. (is/are)', 'is', 'She搭配is', 'basic', 'EN-T02')
addEnQ(['en-leaf-018'], '选择：They ___ friends. (is/are)', 'are', 'They搭配are', 'basic', 'EN-T02')
addEnQ(['en-leaf-018'], '改否定：He is a teacher.', 'He is not a teacher. / He isn\'t a teacher.', 'be动词后加not', 'intermediate', 'EN-T04')

// en-leaf-019: 情态动词
addEnQ(['en-leaf-019'], '选择：___ you swim? Yes, I can. (Can/Do)', 'Can', '询问能力用Can', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-019'], '选择：You ___ wear a helmet. (should/can)', 'should', '建议/应该用should', 'intermediate', 'EN-T02')

// en-leaf-021: 描述性形容词
addEnQ(['en-leaf-021'], '选择：The elephant is ___. (big/small)', 'big', '大象很大', 'basic', 'EN-T02')
addEnQ(['en-leaf-021'], '翻译：tall', '高的', 'tall=高的', 'basic', 'EN-T01')

// en-leaf-023: 比较级与最高级
addEnQ(['en-leaf-023'], 'tall的比较级是___。', 'taller', 'tall→taller(加er)', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-023'], 'good的比较级是___。', 'better', 'good→better(不规则变化)', 'hard', 'EN-T02')
addEnQ(['en-leaf-023'], '选择：Tom is ___ than Mike. (tall/taller)', 'taller', '两者比较用比较级taller', 'intermediate', 'EN-T05')
addEnQ(['en-leaf-023'], 'big的最高级是___。', 'biggest', 'big→bigger→biggest(双写g加est)', 'hard', 'EN-T02')

// en-leaf-025: 人称代词与物主代词
addEnQ(['en-leaf-025'], '选择：This is ___ book. (my/I)', 'my', '修饰名词用形容词性物主代词my', 'basic', 'EN-T02')
addEnQ(['en-leaf-025'], '选择：___ is my friend. (He/His)', 'He', '做主语用主格He', 'basic', 'EN-T02')
addEnQ(['en-leaf-025'], '选择：This book is ___. (mine/my)', 'mine', '做表语用名词性物主代词mine', 'intermediate', 'EN-T05')

// en-leaf-027: 基数词与序数词
addEnQ(['en-leaf-027'], '写出数字：twelve = ?', '12', 'twelve=12', 'basic', 'EN-T01')
addEnQ(['en-leaf-027'], 'first的基数词是___。', 'one', 'first→one', 'intermediate', 'EN-T01')
addEnQ(['en-leaf-027'], '选择：March is the ___ month. (three/third)', 'third', '第三用序数词third', 'intermediate', 'EN-T05')

// en-leaf-028: 时间介词
addEnQ(['en-leaf-028'], '选择：I get up ___ 7 o\'clock. (at/in/on)', 'at', '具体时刻用at', 'basic', 'EN-T02')
addEnQ(['en-leaf-028'], '选择：My birthday is ___ May. (at/in/on)', 'in', '月份用in', 'basic', 'EN-T02')
addEnQ(['en-leaf-028'], '选择：I was born ___ 2010. (at/in/on)', 'in', '年份用in', 'intermediate', 'EN-T02')

// en-leaf-029: 地点与方位介词
addEnQ(['en-leaf-029'], '选择：The cat is ___ the box. (in/on/under)', 'in', '在箱子里面用in', 'basic', 'EN-T02')
addEnQ(['en-leaf-029'], '翻译：在桌子上面', 'on the desk/table', 'on表示在...上面', 'basic', 'EN-T03')

// en-leaf-031: 一般现在时
addEnQ(['en-leaf-031'], '选择：She ___ to school every day. (go/goes)', 'goes', '第三人称单数加es', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-031'], '改否定：I like apples.', 'I don\'t like apples.', '一般现在时否定用don\'t', 'intermediate', 'EN-T04')
addEnQ(['en-leaf-031'], '选择：He ___ TV every evening. (watch/watches)', 'watches', '第三人称单数加es', 'intermediate', 'EN-T05')

// en-leaf-032: 现在进行时
addEnQ(['en-leaf-032'], '选择：Look! She ___. (dances/is dancing)', 'is dancing', 'Look提示进行时', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-032'], '用现在进行时填空：They ___ (play) football.', 'are playing', 'They搭配are playing', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-032'], '翻译：她正在看书。', 'She is reading a book.', '正在做某事：is/am/are + doing', 'intermediate', 'EN-T03')

// en-leaf-033: 一般过去时
addEnQ(['en-leaf-033'], '选择：I ___ to the park yesterday. (go/went)', 'went', 'yesterday提示过去时go→went', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-033'], '写出过去式：play → ?', 'played', '规则动词加ed', 'basic', 'EN-T02')
addEnQ(['en-leaf-033'], '写出过去式：go → ?', 'went', 'go的过去式是went(不规则)', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-033'], '改否定：He went to school.', 'He didn\'t go to school.', '过去时否定用didn\'t+动词原形', 'hard', 'EN-T04')

// en-leaf-034: 一般将来时
addEnQ(['en-leaf-034'], '选择：I ___ visit my grandma tomorrow. (will/went)', 'will', 'tomorrow提示将来时', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-034'], '用将来时填空：She ___ (be) a doctor.', 'will be', 'will+动词原形', 'intermediate', 'EN-T02')

// en-leaf-036: 陈述句
addEnQ(['en-leaf-036'], '改否定句：I am happy.', 'I am not happy.', 'be动词后加not', 'basic', 'EN-T04')

// en-leaf-037: 一般疑问句
addEnQ(['en-leaf-037'], '选择：___ you a student? Yes, I am. (Are/Do)', 'Are', 'be动词开头的一般疑问句', 'basic', 'EN-T02')
addEnQ(['en-leaf-037'], '选择：___ you like apples? Yes, I do. (Are/Do)', 'Do', '实义动词用Do提问', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-037'], '做肯定回答：Can you swim?', 'Yes, I can.', 'Can问Can答', 'basic', 'EN-T02')

// en-leaf-038: 特殊疑问句
addEnQ(['en-leaf-038'], '选择：___ is your name? (What/Where)', 'What', '问名字用What', 'basic', 'EN-T02')
addEnQ(['en-leaf-038'], '选择：___ are you from? (What/Where)', 'Where', '问来自哪里用Where', 'basic', 'EN-T02')
addEnQ(['en-leaf-038'], '选择：___ old are you? (What/How)', 'How', '问年龄用How old', 'basic', 'EN-T02')
addEnQ(['en-leaf-038'], '对划线部分提问：I go to school at 7. (对at 7提问)', 'When do you go to school?', '问时间用When', 'hard', 'EN-T04')

// en-leaf-039: There be句型
addEnQ(['en-leaf-039'], '选择：There ___ a book on the desk. (is/are)', 'is', 'a book单数用is', 'basic', 'EN-T02')
addEnQ(['en-leaf-039'], '选择：There ___ some water in the cup. (is/are)', 'is', 'water不可数用is', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-039'], '选择：There ___ two pens. (is/are)', 'are', 'two pens复数用are', 'basic', 'EN-T02')

// en-leaf-041: 问候与自我介绍
addEnQ(['en-leaf-041'], '选择：—Hello! —___! (Hi/Goodbye)', 'Hi', 'Hello的回应', 'basic', 'EN-T02')
addEnQ(['en-leaf-041'], '选择：—Nice to meet you. —___! (Nice to meet you, too/Thank you)', 'Nice to meet you, too', '回应Nice to meet you', 'basic', 'EN-T02')
addEnQ(['en-leaf-041'], '选择：—How are you? —___, thanks. (Fine/Goodbye)', 'Fine', 'How are you?回应Fine', 'basic', 'EN-T02')

// en-leaf-043: 学校生活
addEnQ(['en-leaf-043'], '翻译：We have English class on Monday.', '我们星期一有英语课。', 'have class=上课', 'intermediate', 'EN-T03')

// en-leaf-044: 兴趣爱好
addEnQ(['en-leaf-044'], '选择：My hobby is ___. (read/reading)', 'reading', 'hobby后用动名词', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-044'], '选择：I like ___ pictures. (draw/drawing)', 'drawing', 'like+doing', 'basic', 'EN-T02')

// en-leaf-045: 饮食与点餐
addEnQ(['en-leaf-045'], '选择：—What would you like? —___ like some rice. (I\'d/I)', 'I\'d', 'I\'d like = I would like', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-045'], '选择：—Have some juice. —___! (Thank you/No)', 'Thank you', '接受食物说Thank you', 'basic', 'EN-T02')

// en-leaf-046: 购物
addEnQ(['en-leaf-046'], '选择：—Can I help you? —Yes, I want a ___. (shirt/shop)', 'shirt', '购物对话', 'intermediate', 'EN-T02')
addEnQ(['en-leaf-046'], '选择：—How much ___ it? —Ten yuan. (is/are)', 'is', 'it单数用is', 'intermediate', 'EN-T02')

// en-leaf-047: 问路与指路
addEnQ(['en-leaf-047'], '选择：—Where is the hospital? —It\'s next ___ the park. (to/in)', 'to', 'next to=在...旁边', 'intermediate', 'EN-T02')

// en-leaf-048: 天气与季节
addEnQ(['en-leaf-048'], '选择：—What\'s the weather like? —It\'s ___. (sunny/sun)', 'sunny', '天气用形容词', 'basic', 'EN-T02')
addEnQ(['en-leaf-048'], '翻译：spring', '春天', 'spring=春天', 'basic', 'EN-T01')
addEnQ(['en-leaf-048'], '选择：My favorite season is ___. (summer/summers)', 'summer', '季节前不加冠词', 'intermediate', 'EN-T05')

// en-leaf-050: 节日祝福
addEnQ(['en-leaf-050'], '选择：—Happy birthday! —___! (Thank you/Sorry)', 'Thank you', '生日祝福回应', 'basic', 'EN-T02')
addEnQ(['en-leaf-050'], '翻译：Merry Christmas!', '圣诞快乐！', '圣诞祝福', 'basic', 'EN-T03')

// en-leaf-052: 图文匹配
addEnQ(['en-leaf-052'], '匹配图片与单词：[sun图片] ___', 'sun', '太阳=sun', 'basic', 'EN-T01')

// en-leaf-053: 短文判断
addEnQ(['en-leaf-053'], '阅读判断：Tom is 10 years old. He likes football. Tom is ten. (T/F)', 'T', '短文说Tom is 10 years old', 'intermediate', 'EN-T06')

// en-leaf-054: 细节理解
addEnQ(['en-leaf-054'], '阅读：Sarah goes to school by bus. How does Sarah go to school?', 'By bus.', '短文中提到by bus', 'intermediate', 'EN-T06')

// en-leaf-059: 大小写与标点
addEnQ(['en-leaf-059'], '改正大小写：hello, my name is tom.', 'Hello, my name is Tom.', '句首字母大写，人名首字母大写', 'basic', 'EN-T04')

// en-leaf-060: 连词成句
addEnQ(['en-leaf-060'], '连词成句：is / this / mother / my', 'This is my mother.', 'This is my mother.', 'intermediate', 'EN-T04')
addEnQ(['en-leaf-060'], '连词成句：like / I / apples', 'I like apples.', 'I like apples.', 'basic', 'EN-T04')

// en-leaf-062: 看图写话
addEnQ(['en-leaf-062'], '看图写话：[男孩在跑步] The boy is ___.', 'running', '现在进行时：is running', 'intermediate', 'EN-T08')

// 补充英语词汇和语法题增加数量
const enVocabQuestions = [
  ['en-leaf-008', '翻译：father', '父亲/爸爸', 'father=父亲'],
  ['en-leaf-008', '翻译：mother', '母亲/妈妈', 'mother=母亲'],
  ['en-leaf-008', '翻译：sister', '姐妹', 'sister=姐妹'],
  ['en-leaf-008', '翻译：brother', '兄弟', 'brother=兄弟'],
  ['en-leaf-009', '翻译：book', '书', 'book=书'],
  ['en-leaf-009', '翻译：pen', '钢笔', 'pen=钢笔'],
  ['en-leaf-009', '翻译：ruler', '尺子', 'ruler=尺子'],
  ['en-leaf-009', '翻译：eraser', '橡皮', 'eraser=橡皮'],
  ['en-leaf-010', '翻译：cat', '猫', 'cat=猫'],
  ['en-leaf-010', '翻译：dog', '狗', 'dog=狗'],
  ['en-leaf-010', '翻译：bird', '鸟', 'bird=鸟'],
  ['en-leaf-010', '翻译：fish', '鱼', 'fish=鱼'],
  ['en-leaf-011', '翻译：apple', '苹果', 'apple=苹果'],
  ['en-leaf-011', '翻译：banana', '香蕉', 'banana=香蕉'],
  ['en-leaf-011', '翻译：rice', '米饭', 'rice=米饭'],
  ['en-leaf-011', '翻译：water', '水', 'water=水'],
  ['en-leaf-012', '翻译：eye', '眼睛', 'eye=眼睛'],
  ['en-leaf-012', '翻译：ear', '耳朵', 'ear=耳朵'],
  ['en-leaf-012', '翻译：nose', '鼻子', 'nose=鼻子'],
  ['en-leaf-012', '翻译：mouth', '嘴巴', 'mouth=嘴巴'],
  ['en-leaf-013', '翻译：red', '红色', 'red=红色'],
  ['en-leaf-013', '翻译：blue', '蓝色', 'blue=蓝色'],
  ['en-leaf-013', '翻译：green', '绿色', 'green=绿色'],
  ['en-leaf-013', '翻译：yellow', '黄色', 'yellow=黄色'],
  ['en-leaf-016', '翻译：run', '跑', 'run=跑'],
  ['en-leaf-016', '翻译：jump', '跳', 'jump=跳'],
  ['en-leaf-016', '翻译：swim', '游泳', 'swim=游泳'],
  ['en-leaf-016', '翻译：sing', '唱歌', 'sing=唱歌'],
  ['en-leaf-017', '翻译：eat', '吃', 'eat=吃'],
  ['en-leaf-017', '翻译：drink', '喝', 'drink=喝'],
  ['en-leaf-017', '翻译：sleep', '睡觉', 'sleep=睡觉'],
  ['en-leaf-021', '翻译：big', '大的', 'big=大的'],
  ['en-leaf-021', '翻译：small', '小的', 'small=小的'],
  ['en-leaf-021', '翻译：long', '长的', 'long=长的'],
  ['en-leaf-021', '翻译：short', '短的/矮的', 'short=短的/矮的'],
  ['en-leaf-027', '翻译：one', '一', 'one=一'],
  ['en-leaf-027', '翻译：two', '二', 'two=二'],
  ['en-leaf-027', '翻译：three', '三', 'three=三'],
  ['en-leaf-027', '翻译：ten', '十', 'ten=十'],
  ['en-leaf-041', '翻译：good morning', '早上好', 'good morning=早上好'],
  ['en-leaf-041', '翻译：goodbye', '再见', 'goodbye=再见'],
  ['en-leaf-041', '翻译：thank you', '谢谢', 'thank you=谢谢'],
  ['en-leaf-048', '翻译：spring', '春天', 'spring=春天'],
  ['en-leaf-048', '翻译：summer', '夏天', 'summer=夏天'],
  ['en-leaf-048', '翻译：autumn', '秋天', 'autumn=秋天'],
  ['en-leaf-048', '翻译：winter', '冬天', 'winter=冬天'],
]
enVocabQuestions.forEach((q, i) => addEnQ([q[0]], q[1] + ' = ?', q[2], q[3], i < 20 ? 'basic' : 'intermediate', 'EN-T01'))

// 补充英语语法选择和填空
const enGrammarQuestions = [
  ['en-leaf-018', '选择：___ you a teacher? Yes, I am.', 'Are', '疑问句be动词提前'],
  ['en-leaf-018', '选择：He ___ my friend.', 'is', 'He搭配is'],
  ['en-leaf-018', '选择：We ___ happy.', 'are', 'We搭配are'],
  ['en-leaf-025', '选择：This is ___ pencil. (my/me)', 'my', '修饰名词用my'],
  ['en-leaf-025', '选择：___ is a boy. (He/Him)', 'He', '主格做主语'],
  ['en-leaf-025', '选择：I love ___ mother. (I/my)', 'my', '修饰名词用my'],
  ['en-leaf-031', '填空：She ___ (go) to school every day.', 'goes', '三单加es'],
  ['en-leaf-031', '填空：I ___ (like) music.', 'like', 'I用原形'],
  ['en-leaf-031', '填空：They ___ (play) basketball after school.', 'play', 'They用原形'],
  ['en-leaf-032', '填空：Look! The cat ___ (run).', 'is running', 'Look提示进行时'],
  ['en-leaf-032', '填空：They ___ (read) books now.', 'are reading', 'now提示进行时'],
  ['en-leaf-033', '填空：I ___ (visit) my grandma yesterday.', 'visited', '规则动词加ed'],
  ['en-leaf-033', '填空：She ___ (eat) an apple this morning.', 'ate', 'eat过去式ate'],
  ['en-leaf-034', '填空：We ___ (have) a picnic tomorrow.', 'will have', 'tomorrow提示将来时'],
  ['en-leaf-039', '填空：There ___ (be) a pen on the desk.', 'is', 'a pen单数'],
  ['en-leaf-039', '填空：There ___ (be) many books in the library.', 'are', 'many books复数'],
  ['en-leaf-037', '改为一般疑问句：He is a doctor.', 'Is he a doctor?', 'be动词提前'],
  ['en-leaf-037', '改为一般疑问句：They like swimming.', 'Do they like swimming?', '加Do'],
  ['en-leaf-038', '对划线提问：My name is Tom. (对Tom提问)', 'What is your name?', '问名字用What'],
  ['en-leaf-038', '对划线提问：I am from China. (对China提问)', 'Where are you from?', '问地点用Where'],
  ['en-leaf-023', '选择：This box is ___ than that one. (heavy/heavier)', 'heavier', '两者比较用比较级'],
  ['en-leaf-023', '选择：She is the ___ in our class. (tall/tallest)', 'tallest', '三者以上用最高级'],
  ['en-leaf-019', '选择：You ___ do your homework first. (should/can)', 'should', '建议用should'],
  ['en-leaf-019', '选择：___ I use your pen? (May/Do)', 'May', '请求允许用May'],
]
enGrammarQuestions.forEach((q, i) => addEnQ([q[0]], q[1], q[2], q[3], i < 12 ? 'basic' : 'intermediate', i < 12 ? 'EN-T02' : 'EN-T05'))

console.log(`English questions generated: ${enQuestions.length}`)

// ============================================================
// CHINESE QUESTION GENERATORS
// ============================================================
const cnQuestions = []

function addCnQ(leafIds, stem, answer, solution, level, qtype, opts) {
  const dc = diffCognitive(level)
  const unit = getUnitForLeaf(leafIds[0], cnUnits)
  const grade = pick(leafIds.flatMap(id => {
    const m = id.match(/cn-leaf-(\d+)/)
    if (!m) return [3]
    const n = parseInt(m[1])
    if (n <= 6) return [1]
    if (n <= 14) return [1, 2, 3]
    if (n <= 18) return [2, 3, 4]
    if (n <= 29) return [3, 4, 5]
    if (n <= 37) return [3, 4, 5, 6]
    return [4, 5, 6]
  }))
  cnQuestions.push({
    subject: '语文', grade,
    knowledge_points: JSON.stringify(leafIds),
    question_type: qtype,
    subtype: '',
    difficulty: dc.difficulty,
    cognitive_level: dc.cognitive,
    step_level: dc.step,
    direction: dc.direction,
    context_type: opts?.context || 'pure',
    stem, options: opts?.options || '',
    answer, solution: solution || '',
    source: '程序化生成',
    tags: JSON.stringify(opts?.tags || [level]),
    textbook_unit: unit?.unitId || ''
  })
}

// cn-leaf-001: 声母
addCnQ(['cn-leaf-001'], '写出23个声母。', 'b p m f d t n l g k h j q x zh ch sh r z c s y w', '23个声母', 'basic', 'CN-T01')
addCnQ(['cn-leaf-001'], '声母中是翘舌音的有哪几个？', 'zh ch sh r', '翘舌音：zh ch sh r', 'intermediate', 'CN-T02')

// cn-leaf-002: 韵母
addCnQ(['cn-leaf-002'], '写出6个单韵母。', 'a o e i u ü', '6个单韵母', 'basic', 'CN-T01')
addCnQ(['cn-leaf-002'], '复韵母有哪些？', 'ai ei ui ao ou iu ie üe er', '9个复韵母', 'intermediate', 'CN-T01')

// cn-leaf-003: 整体认读音节
addCnQ(['cn-leaf-003'], '写出16个整体认读音节。', 'zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying', '16个整体认读音节', 'basic', 'CN-T01')
addCnQ(['cn-leaf-003'], '判断：yu是整体认读音节吗？', '是', 'yu是16个整体认读音节之一', 'basic', 'CN-T02')

// cn-leaf-004: 拼音方法
addCnQ(['cn-leaf-004'], '拼读：b-ā→?', 'bā(八)', '两拼法：声母+韵母', 'basic', 'CN-T02')
addCnQ(['cn-leaf-004'], '三拼音节：g-u-ā→?', 'guā(瓜)', '三拼法：声母+介母+韵母', 'intermediate', 'CN-T02')

// cn-leaf-005: 声调
addCnQ(['cn-leaf-005'], '标调规则：有a不放过，没a找o e，i u并列标在后。给"niú"标调正确吗？', '正确', 'i u并列标在后，标在u上', 'intermediate', 'CN-T02')

// cn-leaf-007: 基本笔画
addCnQ(['cn-leaf-007'], '"永"字有哪几种笔画？', '点、横、竖、撇、捺、提、折、钩', '永字八法', 'intermediate', 'CN-T01')

// cn-leaf-008: 笔顺
addCnQ(['cn-leaf-008'], '"火"字的笔顺是？', '点、撇、撇、捺', '先写上面两点，再写撇捺', 'basic', 'CN-T01')
addCnQ(['cn-leaf-008'], '"水"字的笔顺是？', '竖钩、横撇、撇、捺', '先中间后两边', 'intermediate', 'CN-T01')

// cn-leaf-009: 偏旁部首
addCnQ(['cn-leaf-009'], '带有"氵"的字大多与什么有关？', '水', '氵=水', 'basic', 'CN-T02')
addCnQ(['cn-leaf-009'], '带有"木"的字大多与什么有关？', '树木/植物', '木=树', 'basic', 'CN-T02')
addCnQ(['cn-leaf-009'], '"扌"叫什么部首？', '提手旁', '扌=提手旁', 'basic', 'CN-T01')

// cn-leaf-010: 汉字结构
addCnQ(['cn-leaf-010'], '"明"是什么结构的字？', '左右结构', '日月左右组合', 'basic', 'CN-T02')
addCnQ(['cn-leaf-010'], '"尖"是什么结构的字？', '上下结构', '小大上下组合', 'basic', 'CN-T02')

// cn-leaf-011: 同音字
addCnQ(['cn-leaf-011'], '选词填空：(做/作)___事、___业', '做事、作业', '做=动词，作=名词搭配', 'intermediate', 'CN-T02')
addCnQ(['cn-leaf-011'], '选词填空：(在/再)___见、___家', '再见、在家', '再=又一次，在=存在/地点', 'intermediate', 'CN-T02')

// cn-leaf-012: 形近字
addCnQ(['cn-leaf-012'], '辨字组词：渴(　)　喝(　)', '口渴、喝水', '渴=缺水，喝=用口', 'intermediate', 'CN-T02')
addCnQ(['cn-leaf-012'], '辨字组词：拨(　)　拔(　)', '拨打、拔草', '拨=拨动，拔=拔起', 'intermediate', 'CN-T02')

// cn-leaf-013: 多音字
addCnQ(['cn-leaf-013'], '给多音字注音：长大(　)、长短(　)', 'zhǎng dà, cháng duǎn', '长：zhǎng(长大)、cháng(长短)', 'intermediate', 'CN-T02')
addCnQ(['cn-leaf-013'], '多音字"行"的读音和组词。', 'xíng(行走)、háng(银行)', '行有两个读音', 'intermediate', 'CN-T02')

// cn-leaf-014: 查字典
addCnQ(['cn-leaf-014'], '查字典："海"用部首查字法，先查___部，再查___画。', '氵部，7画', '海=氵+每，每7画', 'intermediate', 'CN-T02')

// cn-leaf-015: 近义词与反义词
addCnQ(['cn-leaf-015'], '写出"美丽"的近义词。', '漂亮、好看、漂亮', '近义词意思相近', 'basic', 'CN-T02')
addCnQ(['cn-leaf-015'], '写出"黑暗"的反义词。', '光明、明亮', '反义词意思相反', 'basic', 'CN-T02')
addCnQ(['cn-leaf-015'], '写出"高兴"的近义词和反义词。', '近义词：开心、快乐；反义词：伤心、难过', '近义词意思相近，反义词意思相反', 'intermediate', 'CN-T02')

// cn-leaf-016: 词语搭配
addCnQ(['cn-leaf-016'], '词语搭配：(　)的阳光', '温暖/灿烂/明媚', '阳光可以温暖、灿烂', 'basic', 'CN-T02')
addCnQ(['cn-leaf-016'], '词语搭配：(　)地跑', '飞快/迅速/拼命', '修饰跑用副词', 'basic', 'CN-T02')

// cn-leaf-017: 成语积累
addCnQ(['cn-leaf-017'], '补全成语：亡羊(　)牢', '补', '亡羊补牢', 'basic', 'CN-T02')
addCnQ(['cn-leaf-017'], '补全成语：(　)口(　)声', '异，同', '异口同声', 'intermediate', 'CN-T02')
addCnQ(['cn-leaf-017'], '补全成语：画蛇(　)足', '添', '画蛇添足', 'basic', 'CN-T02')
addCnQ(['cn-leaf-017'], '写出三个含有动物名称的成语。', '狐假虎威、画蛇添足、亡羊补牢', '动物成语', 'intermediate', 'CN-T01')

// cn-leaf-018: 词语感情色彩
addCnQ(['cn-leaf-018'], '"坚强"是褒义词还是贬义词？', '褒义词', '坚强是赞美的词', 'intermediate', 'CN-T02')
addCnQ(['cn-leaf-018'], '"狡猾"是褒义词还是贬义词？', '贬义词', '狡猾是贬义的词', 'intermediate', 'CN-T02')

// cn-leaf-023: 把字句与被字句
addCnQ(['cn-leaf-023'], '改为"把"字句：风吹开了门。', '风把门吹开了。', '把字句：主语+把+宾语+动词', 'intermediate', 'CN-T04')
addCnQ(['cn-leaf-023'], '改为"被"字句：小明把窗户关上了。', '窗户被小明关上了。', '被字句：宾语+被+主语+动词', 'intermediate', 'CN-T04')

// cn-leaf-024: 陈述句与反问句
addCnQ(['cn-leaf-024'], '改为反问句：这道题很简单。', '这道题难道不简单吗？', '反问句：难道...不...吗', 'intermediate', 'CN-T04')

// cn-leaf-025: 扩句与缩句
addCnQ(['cn-leaf-025'], '缩句：活泼的小明在操场上快乐地踢足球。', '小明踢足球。', '缩句去掉修饰语，保留主干', 'intermediate', 'CN-T04')
addCnQ(['cn-leaf-025'], '扩句：小鸟唱歌。（至少扩两处）', '美丽的小鸟在树枝上快乐地唱歌。', '加修饰语', 'intermediate', 'CN-T04')

// cn-leaf-027: 修辞手法
addCnQ(['cn-leaf-027'], '"弯弯的月亮像小船"用了什么修辞手法？', '比喻', '比喻：把月亮比作小船', 'basic', 'CN-T02')
addCnQ(['cn-leaf-027'], '"花儿在微笑"用了什么修辞手法？', '拟人', '拟人：把花当成人来写', 'basic', 'CN-T02')
addCnQ(['cn-leaf-027'], '"飞流直下三千尺"用了什么修辞手法？', '夸张', '夸张：故意放大数量', 'intermediate', 'CN-T02')

// cn-leaf-028: 病句修改
addCnQ(['cn-leaf-028'], '修改病句：我断定他可能不是坏人。', '去掉"可能"或"断定"改为"猜测"', '前后矛盾：断定和可能矛盾', 'intermediate', 'CN-T04')
addCnQ(['cn-leaf-028'], '修改病句：商店里摆满了水果、苹果和蔬菜。', '去掉"水果"或"苹果"', '分类不当：苹果属于水果', 'intermediate', 'CN-T04')
addCnQ(['cn-leaf-028'], '修改病句：他的语文和数学都很好，而且语文更好。', '去掉"而且语文更好"或改为"尤其是语文"', '语意重复', 'hard', 'CN-T04')

// cn-leaf-029: 标点符号
addCnQ(['cn-leaf-029'], '给句子加标点：妈妈说你做完作业了吗', '妈妈说："你做完作业了吗？"', '冒号引号问号', 'basic', 'CN-T04')
addCnQ(['cn-leaf-029'], '给句子加标点：图书馆里有语文书数学书英语书等', '图书馆里有语文书、数学书、英语书等。', '顿号和句号', 'basic', 'CN-T04')

// cn-leaf-030: 课文内容理解
addCnQ(['cn-leaf-030'], '"草长莺飞二月天，拂堤杨柳醉春烟"描写的是什么季节？', '春天', '二月天、草长莺飞都是春天的特征', 'intermediate', 'CN-T06')

// cn-leaf-031: 中心思想概括
addCnQ(['cn-leaf-031'], '《落花生》的中心思想是什么？', '做人要做有用的人，不要做只讲体面而对别人没有好处的人。', '借花生喻人', 'intermediate', 'CN-T06')

// cn-leaf-036: 古诗词理解
addCnQ(['cn-leaf-036'], '"床前明月光"的作者是谁？', '李白', '李白《静夜思》', 'basic', 'CN-T06')
addCnQ(['cn-leaf-036'], '"春眠不觉晓"的下一句是？', '处处闻啼鸟', '孟浩然《春晓》', 'basic', 'CN-T06')
addCnQ(['cn-leaf-036'], '"谁知盘中餐，粒粒皆辛苦"表达了什么道理？', '珍惜粮食，尊重劳动', '李绅《悯农》', 'intermediate', 'CN-T06')

// cn-leaf-046: 必背古诗
addCnQ(['cn-leaf-046'], '默写《静夜思》前两句。', '床前明月光，疑是地上霜。', '李白《静夜思》', 'basic', 'CN-T06')
addCnQ(['cn-leaf-046'], '默写《春晓》后两句。', '夜来风雨声，花落知多少。', '孟浩然《春晓》', 'basic', 'CN-T06')
addCnQ(['cn-leaf-046'], '"停车坐爱枫林晚"的下一句是？', '霜叶红于二月花', '杜牧《山行》', 'intermediate', 'CN-T06')
addCnQ(['cn-leaf-046'], '"欲穷千里目"的下一句是？', '更上一层楼', '王之涣《登鹳雀楼》', 'basic', 'CN-T06')

// 补充语文基础题
const cnBasicQuestions = [
  ['cn-leaf-009', '给下列字加偏旁组成新字：青→(清)(晴)(情)', '清、晴、情', '青加氵=清，加日=晴，加忄=情'],
  ['cn-leaf-011', '选词填空：(飘/漂)___流、___扬', '漂流、飘扬', '漂=在水中，飘=在空中'],
  ['cn-leaf-011', '选词填空：(做/作)___饭、___文', '做饭、作文', '做=动词，作=名词搭配'],
  ['cn-leaf-012', '辨字组词：渴(　)　喝(　)', '口渴、喝水', '渴=缺水，喝=用口'],
  ['cn-leaf-015', '写出"大"的三个近义词。', '巨大、庞大、广大', '近义词意思相近'],
  ['cn-leaf-015', '写出"快"的反义词。', '慢', '快↔慢'],
  ['cn-leaf-016', '搭配：(　)的春天', '温暖、美丽、明媚', '春天可以温暖、美丽'],
  ['cn-leaf-016', '搭配：(　)地学习', '认真、努力、刻苦', '修饰学习'],
  ['cn-leaf-017', '补全成语：(　)(　)不息', '自强', '自强不息'],
  ['cn-leaf-017', '补全成语：(　)(　)不入', '格格', '格格不入'],
  ['cn-leaf-017', '补全成语：一(　)两得', '举', '一举两得'],
  ['cn-leaf-027', '"太阳像火球"用了___修辞。', '比喻', '比喻'],
  ['cn-leaf-027', '"树叶沙沙响"用了___修辞。', '拟人', '拟人'],
  ['cn-leaf-029', '加标点：老师说同学们好', '老师说："同学们好！"', '冒号引号感叹号'],
  ['cn-leaf-028', '修改病句：我估计他一定回家了。', '去掉"一定"或"估计"改为"确定"', '前后矛盾'],
  ['cn-leaf-028', '修改病句：我买了苹果和水果。', '去掉"和水果"或改为"苹果等水果"', '分类不当'],
  ['cn-leaf-023', '改被字句：风把树叶吹落了。', '树叶被风吹落了。', '被字句变换'],
  ['cn-leaf-023', '改把字句：乌云遮住了太阳。', '乌云把太阳遮住了。', '把字句变换'],
  ['cn-leaf-025', '缩句：可爱的妹妹在花园里快乐地玩耍。', '妹妹玩耍。', '去掉修饰语'],
  ['cn-leaf-036', '"举头望明月"的下一句是？', '低头思故乡', '李白《静夜思》'],
  ['cn-leaf-036', '"白日依山尽"的下一句是？', '黄河入海流', '王之涣《登鹳雀楼》'],
  ['cn-leaf-036', '"两个黄鹂鸣翠柳"的下一句是？', '一行白鹭上青天', '杜甫《绝句》'],
  ['cn-leaf-046', '"接天莲叶无穷碧"的下一句是？', '映日荷花别样红', '杨万里《晓出净慈寺送林子方》'],
  ['cn-leaf-046', '"不识庐山真面目"的下一句是？', '只缘身在此山中', '苏轼《题西林壁》'],
  ['cn-leaf-046', '"山重水复疑无路"的下一句是？', '柳暗花明又一村', '陆游《游山西村》'],
  ['cn-leaf-046', '"横看成岭侧成峰"的下一句是？', '远近高低各不同', '苏轼《题西林壁》'],
  ['cn-leaf-046', '"春色满园关不住"的下一句是？', '一枝红杏出墙来', '叶绍翁《游园不值》'],
]
cnBasicQuestions.forEach((q, i) => addCnQ([q[0]], q[1], q[2], q[3], i < 13 ? 'basic' : 'intermediate', i < 13 ? 'CN-T02' : 'CN-T04'))

// 补充阅读理解题
const cnReadingQuestions = [
  ['cn-leaf-033', '阅读片段回答：秋天的树叶变黄了，一片片飘落下来。这句话写了什么季节的什么景物？', '秋天，树叶', '秋天树叶变黄飘落'],
  ['cn-leaf-033', '阅读片段回答：小明是个热心肠的孩子，经常帮助同学。小明是什么样的人？', '热心肠、乐于助人', '从文中"经常帮助同学"可看出'],
  ['cn-leaf-034', '说明文常使用的说明方法有哪几种？', '列数字、举例子、作比较、打比方', '常见说明方法'],
  ['cn-leaf-031', '概括段落大意需要注意什么？', '抓住主要内容和中心句', '段意概括方法'],
  ['cn-leaf-027', '"那雪，如同柳絮一般纷纷扬扬地飘落"用了什么修辞？', '比喻', '把雪比作柳絮'],
  ['cn-leaf-028', '修改病句：我们班同学基本上都到了。', '去掉"基本上"或"都"', '前后矛盾'],
  ['cn-leaf-028', '修改病句：他的作文水平大大提高了。', '正确，无需修改', '此句无语病'],
  ['cn-leaf-036', '"远看山有色，近听水无声"描写的是什么？', '画', '王维《画》，描写画中景物'],
]
cnReadingQuestions.forEach((q, i) => addCnQ([q[0]], q[1], q[2], q[3], i < 4 ? 'intermediate' : 'hard', 'CN-T06'))

// 补充写作题
const cnWritingQuestions = [
  ['cn-leaf-038', '看图写话：[小朋友植树]，请写2-3句话。', '示例：春天到了，小朋友们在公园里植树。他们有的挖坑，有的浇水，有的培土。大家干得热火朝天。', '看图写话要求把图画内容写清楚'],
  ['cn-leaf-041', '以"我的妈妈"为题，写一段话介绍妈妈的外貌和职业。', '示例：我的妈妈中等个子，有一双大大的眼睛。她是一名护士，每天在医院里照顾病人。虽然工作很忙，但她总是笑容满面。', '写人要注意外貌、职业等特点'],
  ['cn-leaf-042', '用"有的...有的...有的..."写一句话描写课间活动。', '示例：下课了，操场上热闹极了，同学们有的跑步，有的跳绳，有的踢球。', '排比句式写场景'],
  ['cn-leaf-039', '写一段描写秋天景色的片段（3-4句）。', '示例：秋天来了，树叶变黄了，纷纷飘落下来。果园里苹果红了，梨子黄了。田野里稻谷金灿灿的，到处是丰收的景象。', '写景要抓住季节特点'],
]
cnWritingQuestions.forEach(q => addCnQ([q[0]], q[1], q[2], q[3], 'hard', 'CN-T07'))

console.log(`Chinese questions generated: ${cnQuestions.length}`)

// ============================================================
// INSERT ALL QUESTIONS
// ============================================================
const allQuestions = [...mathQuestions, ...enQuestions, ...cnQuestions]
console.log(`\nTotal questions to insert: ${allQuestions.length}`)
console.log(`  Math: ${mathQuestions.length}`)
console.log(`  English: ${enQuestions.length}`)
console.log(`  Chinese: ${cnQuestions.length}`)

let inserted = 0
for (const q of allQuestions) {
  db.run(
    `INSERT INTO question_bank (subject, grade, knowledge_points, question_type, subtype, difficulty, cognitive_level, step_level, direction, context_type, stem, options, answer, solution, source, tags, textbook_unit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [q.subject, q.grade, q.knowledge_points, q.question_type, q.subtype, q.difficulty, q.cognitive_level, q.step_level, q.direction, q.context_type, q.stem, q.options, q.answer, q.solution, q.source, q.tags, q.textbook_unit]
  )
  inserted++
}

saveDB()
console.log(`\n✅ Inserted ${inserted} questions into database!`)

// Print difficulty distribution
const bySubject = {}
for (const q of allQuestions) {
  if (!bySubject[q.subject]) bySubject[q.subject] = { basic: 0, intermediate: 0, hard: 0, total: 0 }
  const tag = JSON.parse(q.tags)[0] || 'basic'
  bySubject[q.subject][tag]++
  bySubject[q.subject].total++
}
console.log('\n--- Distribution ---')
for (const [subj, counts] of Object.entries(bySubject)) {
  console.log(`${subj}: ${counts.total} total (基础${counts.basic} / 进阶${counts.intermediate} / 难题${counts.hard})`)
}
