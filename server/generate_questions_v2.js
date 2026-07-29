// ==================== 程序化批量生成数学题（无需 API） ====================
// 用法: node server/generate_questions_v2.js
// 基于知识树和题型模板，程序化生成 200+ 道数学题

import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const TREE_PATH = join(ROOT_DIR, 'server', 'data', 'knowledge_tree.json')
const OUT_PATH = join(ROOT_DIR, 'server', 'data', 'seed_questions_generated.json')

// ==================== 题目生成器 ====================

// 年级数字中文映射
const GRADE_CN = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六' }

// 题型配置：每个知识点支持的题型+认知层级模板
function getTypeConfig(domainName, leafName) {
  const cfg = { types: ['T02'], levels: ['A','B'] }
  if (['数的认识','数的运算','式与方程'].some(k => domainName.includes(k) || leafName.includes(k))) {
    cfg.types = ['T01','T02','T03']
    cfg.levels = ['A','B','C']
  }
  if (domainName.includes('图形')) { cfg.types = ['T01','T02','T05','T06']; cfg.levels = ['A','B','C'] }
  if (domainName.includes('统计')) { cfg.types = ['T01','T02','T05']; cfg.levels = ['A','B'] }
  if (domainName.includes('综合')) { cfg.types = ['T05','T02']; cfg.levels = ['B','C','D'] }
  if (['画图策略','列表策略','搭配问题','集合思想'].some(k => leafName.includes(k))) {
    cfg.types = ['T02','T05','T08']; cfg.levels = ['B','C']
  }
  return cfg
}

// 随机整数
function ri(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
// 随机选一个
function rpick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// 生成题目
function makeQuestion(leaf, domainName, moduleName) {
  const grades = leaf.grades
  const g = rpick(grades)
  const cfg = getTypeConfig(domainName, leaf.name)
  const qType = rpick(cfg.types)
  const cog = rpick(cfg.levels)
  const gradeCN = GRADE_CN[g]

  // 根据知识点选择生成器
  const generators = {
    '整数的认识与读写': () => genNumberRecognition(g),
    '大数的认识': () => genLargeNumber(g),
    '分���的初步认识': () => genFractionIntro(g),
    '分数的意义和性质': () => genFractionProp(g),
    '小数的意义和性质': () => genDecimalProp(g),
    '百分数的认识': () => genPercentIntro(g),
    '负数的初步认识': () => genNegativeNum(g),
    '因数和倍数': () => genFactorMultiple(g),
    '公因数与公倍数': () => genGcdLcm(g),
    '整数加减法': () => genIntAddSub(g),
    '整数乘除法': () => genIntMulDiv(g),
    '四则混合运算': () => genMixedOps(g),
    '小数加减乘除': () => genDecimalOps(g),
    '分数加减法': () => genFracAddSub(g),
    '分数乘除法': () => genFracMulDiv(g),
    '百分数应用': () => genPercentApp(g),
    '估算与简便计算': () => genEstimate(g),
    '人民币的认识': () => genRmb(g),
    '时间与钟表': () => genTime(g),
    '长度单位': () => genLength(g),
    '质量单位': () => genMass(g),
    '面积单位': () => genAreaUnit(g),
    '体积与容积单位': () => genVolumeUnit(g),
    '用字母表示数': () => genLetterNum(g),
    '简易方程': () => genSimpleEq(g),
    '列方程解应用题': () => genEqWordProblem(g),
    '比和比例': () => genRatio(g),
    '数字规律': () => genNumberPattern(g),
    '图形排列规律': () => genShapePattern(g),
    '平面图形的认识': () => genPlaneShape(g),
    '角的认识': () => genAngle(g),
    '垂直与平行': () => genParallelPerp(g),
    '三角形的分类': () => genTriangle(g),
    '四边形���分类': () => genQuadrilateral(g),
    '圆的认识': () => genCircleIntro(g),
    '立体图形的认识': () => genSolidIntro(g),
    '周长计算': () => genPerimeter(g),
    '圆的周长': () => genCirclePerim(g),
    '面积计算（基础）': () => genArea(g),
    '组合图形面积': () => genCompositeArea(g),
    '圆的面积': () => genCircleArea(g),
    '表面积计算': () => genSurfaceArea(g),
    '体积与容积': () => genVolume(g),
    '轴对称': () => genSymmetry(g),
    '平移与旋转': () => genTransform(g),
    '图形的缩放': () => genScale(g),
    '方向与位置': () => genDirection(g),
    '数对确定位置': () => genCoordinate(g),
    '比例尺': () => genMapScale(g),
    '分类与整理': () => genClassify(g),
    '统计表': () => genTable(g),
    '条形统计图': () => genBarChart(g),
    '折线统计图': () => genLineChart(g),
    '扇形统计图': () => genPieChart(g),
    '平均数': () => genAverage(g),
    '众数和中位数': () => genModeMedian(g),
    '确定与不确定': () => genProbability(g),
    '概率初步': () => genProbCalc(g),
    '画图策略': () => genDrawStrategy(g),
    '列表策略': () => genListStrategy(g),
    '假设与转化': () => genHypothesis(g),
    '从条件/问题入手': () => genAnalyzeStrategy(g),
    '等量代换': () => genSubstitution(g),
    '归一与归总': () => genNormalization(g),
    '和差倍问题': () => genSumDiff(g),
    '行程问题': () => genTravel(g),
    '工程问题': () => genWork(g),
    '鸡兔同笼': () => genChickenRabbit(g),
    '植树问题': () => genTreePlanting(g),
    '盈亏问题': () => genProfitLoss(g),
    '年龄问题': () => genAge(g),
    '搭配问题': () => genCombo(g),
    '集合思想': () => genSet(g),
    '优化问题': () => genOptimize(g),
    '找次品': () => genFindDefect(g),
    '鸽巢原理': () => genPigeonhole(g),
    '数与形': () => genNumShape(g),
  }

  const gen = generators[leaf.name]
  if (!gen) {
    return [makeGenericQuestion(leaf, g, qType, cog, domainName)]
  }

  const results = gen()
  return results.map(r => ({
    subject: '数学',
    grade: g,
    knowledgePoints: [leaf.id],
    questionType: r.type || qType,
    subtype: '',
    difficulty: r.difficulty || 0.5,
    cognitiveLevel: r.cognitive || cog,
    stepLevel: r.steps || 'step1',
    direction: r.direction || (cog === 'A' ? 'K' : cog === 'B' ? 'U' : 'A'),
    contextType: r.context || (r.type === 'T05' ? 'life' : 'pure'),
    stem: r.stem,
    options: r.options || [],
    answer: r.answer,
    solution: r.solution,
    source: '程序生成',
    tags: [leaf.name, domainName],
  }))
}

// ==================== 各知识点生成器 ====================

function genNumberRecognition(g) {
  if (g === 1) {
    return [
      { stem: '在计数器上，十位上有3颗珠子，个位上有5颗珠子，这个数是____。', answer: '35', solution: '十位3表示30，个位5表示5，合起来是35。', type: 'T02', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
      { stem: '7个十和6个一组成的数是____。', answer: '76', solution: '7个十是70，6个一是6，70+6=76。', type: 'T02', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
      { stem: '从右边起，第一位是____位，第二位是____位。', answer: '个 十', solution: '数位顺序：从右边起第一位是个位，第二位是十位。', type: 'T02', difficulty: 0.15, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    ]
  }
  if (g === 2) {
    return [
      { stem: '3080 读作：______。', answer: '三千零八十', solution: '从高位读起，千位3读三千，百位0不读，十位8读八十，个位0不读。中间有0只读一个零。', type: 'T02', difficulty: 0.3, cognitive: 'B', steps: 'step1', direction: 'K', context: 'pure' },
      { stem: '5个千、3个百和2个一组成的数是(  )。\nA. 5302  B. 5320  C. 5032  D. 532', answer: 'A', options: ['5302','5320','5032','532'], solution: '5个千=5000，3个百=300，2个一=2，5000+300+2=5302。', type: 'T01', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
    ]
  }
  return []
}

function genLargeNumber(g) {
  const nums = [
    { stem: '50870040 读作：______。', answer: '五千零八十七万零四十', solution: '分级：5087|0040。万级5087读五千零八十七万，个级0040读零四十。', type: 'T02', difficulty: 0.4, cognitive: 'B', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '把 3608000000 改写成用"亿"作单位的数是______亿。', answer: '36.08', solution: '3608000000 = 36.08亿。小数点向左移动8位。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '下面的数中，只读一个零的是(  )。\nA. 8006400  B. 8006004  C. 8060040  D. 8060400', answer: 'A', options: ['8006400','8006004','8060040','8060400'], solution: 'A读八百万六千四百，只读一个零(百万位)\nB读八百万六千零四，读一个零\nC读八百零六万零四十，读两个零\nD读八百零六万零四百，读两个零\nA和B都只读一个零，选A。', type: 'T01', difficulty: 0.45, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
  ]
  return nums.slice(0, g <= 3 ? 2 : 3)
}

function genFractionIntro(g) {
  return [
    { stem: '把一个月饼平均分成4份，每份是这个月饼的____。', answer: '1/4', solution: '平均分成4份，每份是四分之一，写作1/4。', type: 'T02', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'life' },
    { stem: '在下面的分数中，最大的是(  )。\nA. 1/3  B. 1/4  C. 1/5  D. 1/2', answer: 'D', options: ['1/3','1/4','1/5','1/2'], solution: '分子相同（都是1）时，分母越小分数越大。2<3<4<5，所以1/2最大。', type: 'T01', difficulty: 0.3, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
    { stem: '3/8 的分子是____，分母是____，表示把一个整体平均分成____份，取其中的____份。', answer: '3 8 8 3', solution: '分数3/8，分子是3，分母是8，表示平均分成8份取3份。', type: 'T02', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
  ]
}

function genFractionProp(g) {
  return [
    { stem: '把 3/4 的分子和分母同时乘5，得到的分数是____，与原分数____（相等/不相等）。', answer: '15/20 相等', solution: '分子3×5=15，分母4×5=20，分数值不变。这是分数的基本性质。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '约分：18/24 = ____', answer: '3/4', solution: '18和24的最大公因数是6，分子分母同时除以6：18÷6=3，24÷6=4。', type: 'T02', difficulty: 0.4, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
    { stem: '通分：2/3 和 5/6，通分后分别是____和____。', answer: '4/6 5/6', solution: '3和6的最小公倍数是6。2/3 = 4/6，5/6不变。', type: 'T02', difficulty: 0.4, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
  ]
}

function genDecimalProp(g) {
  return [
    { stem: '0.38 里面有____个百分之一。', answer: '38', solution: '0.38的计数单位是0.01（百分之一），有38个。', type: 'T02', difficulty: 0.25, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '把 3.05 的小数点向右移动两位是____，相当于扩大到原数的____倍。', answer: '305 100', solution: '小数点向右移动两位，相当于乘100。', type: 'T02', difficulty: 0.3, cognitive: 'B', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '在 0.8、0.80、0.800 中，数值最大的是(  )。\nA. 0.8  B. 0.80  C. 0.800  D. 一样大', answer: 'D', options: ['0.8','0.80','0.800','一样大'], solution: '小数的末尾添上0或去掉0，小数的大小不变。三个数相等。', type: 'T01', difficulty: 0.3, cognitive: 'B', steps: 'step1', direction: 'U', context: 'pure' },
  ]
}

function genPercentIntro(g) {
  return [
    { stem: '45% 读作______，表示______。', answer: '百分之四十五 45/100', solution: '45%读作百分之四十五，表示百分之四十五，即45/100。', type: 'T02', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '把 3/5 化成百分数是______。', answer: '60%', solution: '3/5 = 0.6 = 60%。先化小数再化百分数。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '今年的产量是去年的120%，表示今年比去年增产____%。', answer: '20', solution: '120% - 100% = 20%，比去年增产20%。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'U', context: 'life' },
  ]
}

function genNegativeNum(g) {
  return [
    { stem: '零上5℃记作+5℃，那么零下3℃记作____℃。', answer: '-3', solution: '零上为正，零下为负。', type: 'T02', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'life' },
    { stem: '在 -3、0、2、-1.5 中，最小的数是____。', answer: '-3', solution: '负数 < 0 < 正数。在负数中，绝对值大的反而小。|-3|=3 > |-1.5|=1.5，所以-3 < -1.5。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
  ]
}

function genFactorMultiple(g) {
  return [
    { stem: '12的因数有______。', answer: '1,2,3,4,6,12', solution: '12=1×12=2×6=3×4，所以12的因数有1,2,3,4,6,12。', type: 'T02', difficulty: 0.35, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '下列哪个数是3的倍数？(  )\nA. 25  B. 42  C. 50  D. 71', answer: 'B', options: ['25','42','50','71'], solution: '3的倍数：各位数字之和是3的倍数。4+2=6是3的倍数。', type: 'T01', difficulty: 0.3, cognitive: 'B', steps: 'step1', direction: 'U', context: 'pure' },
    { stem: '在1-20中，既是偶数又是质数的数是____。', answer: '2', solution: '质数中只有2是偶数，其他质数都是奇数。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step1', direction: 'U', context: 'pure' },
  ]
}

function genGcdLcm(g) {
  return [
    { stem: '18和24的最大公因数是____。', answer: '6', solution: '18的因数：1,2,3,6,9,18；24的因数：1,2,3,4,6,8,12,24。最大公因数是6。', type: 'T02', difficulty: 0.4, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
    { stem: '两个数的最大公因数是4，最小公倍数是24，如果其中一个是8，另一个是____。', answer: '12', solution: '两数之积 = 最大公因数 × 最小公倍数 = 4×24=96。96÷8=12。', type: 'T02', difficulty: 0.55, cognitive: 'C', steps: 'step3', direction: 'A', context: 'pure' },
  ]
}

function genIntAddSub(g) {
  const a = ri(10, 99), b = ri(10, 99)
  const total = ri(30,80), give = ri(5, Math.min(25, total-5))
  return [
    { stem: `${a} + ${b} = ____`, answer: `${a+b}`, solution: `${a}+${b}=${a+b}`, type: 'T02', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: `小明有${total}张卡片，送给小华${give}张，还剩____张。`, answer: `${total-give}`, solution: `${total}-${give}=${total-give}张`, type: 'T02', difficulty: 0.25, cognitive: 'B', steps: 'step2', direction: 'A', context: 'life' },
  ]
}

function genIntMulDiv(g) {
  if (g <= 2) {
    const a = ri(1,9), b = ri(1,9)
    return [
      { stem: `${a} × ${b} = ____`, answer: `${a*b}`, solution: `${a}×${b}=${a*b}`, type: 'T02', difficulty: 0.15, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
      { stem: `${a*b} ÷ ${a} = ____`, answer: `${b}`, solution: `${a*b}÷${a}=${b}`, type: 'T02', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    ]
  }
  const a = ri(10,99), b = ri(2,9)
  return [
    { stem: `${a} × ${b} = ____`, answer: `${a*b}`, solution: `${b}×${a%10}=${b*(a%10)}，${b}×${Math.floor(a/10)*10}=${b*Math.floor(a/10)*10}，相加得${a*b}。`, type: 'T02', difficulty: 0.3, cognitive: 'A', steps: 'step2', direction: 'K', context: 'pure' },
    { stem: `${a*b} ÷ ${b} = ____`, answer: `${a}`, solution: `验算：${a}×${b}=${a*b}，所以${a*b}÷${b}=${a}。`, type: 'T02', difficulty: 0.3, cognitive: 'A', steps: 'step2', direction: 'K', context: 'pure' },
  ]
}

function genMixedOps(g) {
  return [
    { stem: '25 × (4 + 8) = 25 × 4 + ____ × 8', answer: '25', solution: '乘法分配律：a×(b+c)=a×b+a×c。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '125 × 32 × 25 = ____', answer: '100000', solution: '125×32×25 = 125×(8×4)×25 = (125×8)×(4×25) = 1000×100 = 100000', type: 'T02', difficulty: 0.5, cognitive: 'C', steps: 'step3', direction: 'A', context: 'pure' },
    { stem: '计算：240 ÷ 15 = ____', answer: '16', solution: '240÷15 = 240÷(3×5) = 240÷3÷5 = 80÷5 = 16（或240÷15=16直接算）', type: 'T02', difficulty: 0.4, cognitive: 'B', steps: 'step2', direction: 'A', context: 'pure' },
  ]
}

function genDecimalOps(g) {
  const a = (ri(10,99)/10).toFixed(1), b = (ri(10,99)/10).toFixed(1)
  const count = ri(3,8)
  const total = (parseFloat(a) * count).toFixed(1)
  return [
    { stem: `${a} + ${b} = ____`, answer: `${(parseFloat(a)+parseFloat(b)).toFixed(1)}`, solution: '小数点对齐，按整数加法计算，最后点小数点。', type: 'T02', difficulty: 0.3, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: `一支铅笔${a}元，小明买了${count}支，一共需要____元。`, answer: total, solution: `${a}×${count}=${total}元`, type: 'T05', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'A', context: 'life' },
  ]
}

function genFracAddSub(g) {
  return [
    { stem: '1/4 + 3/4 = ____', answer: '1', solution: '同分母分数相加，分母不变，分子相加：1+3=4，4/4=1。', type: 'T02', difficulty: 0.25, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '2/3 - 1/6 = ____', answer: '1/2', solution: '先通分：2/3=4/6，4/6-1/6=3/6=1/2。', type: 'T02', difficulty: 0.4, cognitive: 'B', steps: 'step2', direction: 'A', context: 'pure' },
    { stem: '妈妈用去一桶油的1/4，又用去2/5，两次一共用去这桶油的____。', answer: '13/20', solution: '1/4+2/5=5/20+8/20=13/20。', type: 'T05', difficulty: 0.45, cognitive: 'C', steps: 'step2', direction: 'A', context: 'life' },
  ]
}

function genFracMulDiv(g) {
  return [
    { stem: '2/3 × 3/4 = ____', answer: '1/2', solution: '分数乘法：分子相乘2×3=6，分母相乘3×4=12，6/12=1/2。', type: 'T02', difficulty: 0.35, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '5/8 ÷ 5 = ____', answer: '1/8', solution: '分数除以整数：5/8÷5=5/8×1/5=1/8。', type: 'T02', difficulty: 0.4, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
    { stem: '一个数的3/4是15，这个数是____。', answer: '20', solution: '设这个数为x，3/4 x = 15，x = 15 ÷ 3/4 = 15 × 4/3 = 20。', type: 'T05', difficulty: 0.5, cognitive: 'C', steps: 'step2', direction: 'A', context: 'pure' },
  ]
}

function genPercentApp(g) {
  return [
    { stem: '一件衣服原价200元，打八折后的价格是____元。', answer: '160', solution: '八折=80%，200×80%=200×0.8=160元。', type: 'T05', difficulty: 0.35, cognitive: 'B', steps: 'step1', direction: 'A', context: 'life' },
    { stem: '银行存款10000元，年利率3%，一年后利息是____元。', answer: '300', solution: '利息=本金×利率=10000×3%=300元。', type: 'T05', difficulty: 0.4, cognitive: 'B', steps: 'step1', direction: 'A', context: 'life' },
  ]
}

function genEstimate(g) {
  return [
    { stem: '估算：498 + 305 ≈ ____', answer: '约800', solution: '498≈500，305≈300，500+300=800。', type: 'T02', difficulty: 0.25, cognitive: 'B', steps: 'step1', direction: 'U', context: 'pure' },
    { stem: '99 × 101，下面哪个估算最接近准确值？(  )\nA. 100×100=10000  B. 90×100=9000  C. 100×110=11000  D. 99×100=9900', answer: 'A', options: ['100×100=10000','90×100=9000','100×110=11000','99×100=9900'], solution: '99×101=9999，100×100=10000最接近。', type: 'T01', difficulty: 0.3, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
  ]
}

// 常见的量
function genRmb(g) {
  return [
    { stem: '1元 = ____角 = ____分', answer: '10 100', solution: '1元=10角，1角=10分，所以1元=100分。', type: 'T02', difficulty: 0.1, cognitive: 'A', steps: 'step1', direction: 'K', context: 'life' },
    { stem: '小明买一个3元5角的面包，付了10元，应找回____元____角。', answer: '6 5', solution: '10元-3元5角=6元5角。', type: 'T05', difficulty: 0.25, cognitive: 'B', steps: 'step2', direction: 'A', context: 'life' },
  ]
}

function genTime(g) {
  if (g <= 2) {
    return [
      { stem: '钟面上，分针指向12，时针指向7，是____时。', answer: '7', solution: '分针指向12表示整点，时针指向7就是7时。', type: 'T02', difficulty: 0.15, cognitive: 'A', steps: 'step1', direction: 'K', context: 'life' },
      { stem: '半小时 = ____分钟', answer: '30', solution: '1小时=60分钟，半小时=30分钟。', type: 'T02', difficulty: 0.15, cognitive: 'A', steps: 'step1', direction: 'K', context: 'life' },
    ]
  }
  return [
    { stem: '电影14:30开始，16:00结束，放映了____小时____分钟。', answer: '1 30', solution: '16:00-14:30=1小时30分钟。', type: 'T05', difficulty: 0.3, cognitive: 'B', steps: 'step2', direction: 'A', context: 'life' },
  ]
}

function genLength(g) {
  return [
    { stem: '3千米 = ____米', answer: '3000', solution: '1千米=1000米，3×1000=3000米。', type: 'T02', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '将下列长度从小到大排列：30分米、3米、300厘米、3千米。\n____ < ____ < ____ < ____', answer: '3米 300厘米 30分米 3千米', solution: '统一单位：3米=300厘米，30分米=300厘米，300厘米，3千米=300000厘米。', type: 'T02', difficulty: 0.4, cognitive: 'B', steps: 'step3', direction: 'U', context: 'pure' },
  ]
}

function genMass(g) {
  return [
    { stem: '5吨 = ____千克', answer: '5000', solution: '1吨=1000千克，5×1000=5000千克。', type: 'T02', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '一个苹果约重200____（克/千克/吨）', answer: '克', solution: '苹果较轻，用克作单位。', type: 'T02', difficulty: 0.25, cognitive: 'B', steps: 'step1', direction: 'U', context: 'life' },
  ]
}

function genAreaUnit(g) {
  return [
    { stem: '200平方分米 = ____平方米', answer: '2', solution: '1平方米=100���方分米，200÷100=2平方米。', type: 'T02', difficulty: 0.25, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '一个操场的面积约是5000(  )。\nA. 平方厘米  B. 平方分米  C. 平方米  D. 公顷', answer: 'C', options: ['平方厘米','平方分米','平方米','公顷'], solution: '操场面积用平方米表示合适。', type: 'T01', difficulty: 0.3, cognitive: 'B', steps: 'step1', direction: 'U', context: 'life' },
  ]
}

function genVolumeUnit(g) {
  return [
    { stem: '5升 = ____毫升', answer: '5000', solution: '1升=1000毫升，5×1000=5000毫升。', type: 'T02', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '一个长方体容器从里面量长30厘米、宽20厘米、高10厘米，它的容积是____立方厘米，合____升。', answer: '6000 6', solution: 'V=30×20×10=6000立方厘米=6升（1升=1000立方厘米）。', type: 'T02', difficulty: 0.45, cognitive: 'C', steps: 'step3', direction: 'A', context: 'pure' },
  ]
}

function genLetterNum(g) {
  return [
    { stem: '每支铅笔x元，买5支需要____元。', answer: '5x', solution: '5×x = 5x元。字母和数字相乘，数字在前省略乘号。', type: 'T02', difficulty: 0.25, cognitive: 'A', steps: 'step1', direction: 'K', context: 'life' },
    { stem: '当 a=3, b=4 时，2a+3b 的值是____。', answer: '18', solution: '2×3+3×4=6+12=18。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'A', context: 'pure' },
  ]
}

function genSimpleEq(g) {
  return [
    { stem: '解方程：x + 15 = 32，x = ____', answer: '17', solution: '等式两边同时减去15：x+15-15=32-15，x=17。', type: 'T02', difficulty: 0.3, cognitive: 'B', steps: 'step1', direction: 'A', context: 'pure' },
    { stem: '解方程：3x = 18，x = ____', answer: '6', solution: '两边同时除以3：3x÷3=18÷3，x=6。', type: 'T02', difficulty: 0.3, cognitive: 'B', steps: 'step1', direction: 'A', context: 'pure' },
  ]
}

function genEqWordProblem(g) {
  const a = ri(20,50), b = ri(10,a-5)
  const x = Math.floor((a+b)/2)
  return [
    { stem: `小明和小华一共有${a}张卡片，小明比小华多${b}张。小明有____张卡片。`, answer: `${x}`, solution: `设小明有x张，小华有x-${b}张。x+(x-${b})=${a}，2x=${a+b}，x=${x}。小明${x}张，小华${a-x}张。`, type: 'T05', difficulty: 0.5, cognitive: 'C', steps: 'step3', direction: 'A', context: 'life' },
    { stem: '甲数是乙数的3倍，甲数比乙数多12。乙数是____。', answer: '6', solution: '设乙数为x，甲数=3x。3x-x=12，2x=12，x=6。', type: 'T05', difficulty: 0.45, cognitive: 'C', steps: 'step3', direction: 'A', context: 'pure' },
  ]
}

function genRatio(g) {
  return [
    { stem: '化简比：24:36 = ____:____', answer: '2 3', solution: '24和36的最大公因数是12，24÷12=2，36÷12=3，最简比2:3。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
    { stem: '在比例尺1:5000000的地图上，3厘米代表实际距离____千米。', answer: '150', solution: '3×5000000=15000000厘米=150千米。', type: 'T05', difficulty: 0.45, cognitive: 'C', steps: 'step2', direction: 'A', context: 'life' },
  ]
}

function genNumberPattern(g) {
  if (g <= 2) {
    return [
      { stem: '找规律填数：2, 4, 6, 8, ____, 12', answer: '10', solution: '每次加2，8+2=10。', type: 'T02', difficulty: 0.2, cognitive: 'B', steps: 'step1', direction: 'U', context: 'pure' },
      { stem: '找规律：1, 3, 5, 7, ____, 11', answer: '9', solution: '奇数数列，每次加2。7+2=9。', type: 'T02', difficulty: 0.25, cognitive: 'B', steps: 'step1', direction: 'U', context: 'pure' },
    ]
  }
  return [
    { stem: '找规律：1, 4, 9, 16, ____, 36', answer: '25', solution: '1²=1, 2²=4, 3²=9, 4²=16, 5²=25。是平方数列。', type: 'T02', difficulty: 0.45, cognitive: 'C', steps: 'step2', direction: 'U', context: 'pure' },
  ]
}

function genShapePattern(g) {
  return [
    { stem: '观察图形排列：△ □ △ □ △ □ ____，下一个图形是____。', answer: '△', solution: '△和□交替出现，□后面是△。', type: 'T02', difficulty: 0.2, cognitive: 'B', steps: 'step1', direction: 'U', context: 'pure' },
  ]
}

// 图形与几何
function genPlaneShape(g) {
  if (g <= 2) {
    return [
      { stem: '黑板的面是____形。', answer: '长方', solution: '黑板的面有4个直角，对边相等，是长方形。', type: 'T02', difficulty: 0.1, cognitive: 'A', steps: 'step1', direction: 'K', context: 'life' },
    ]
  }
  return [
    { stem: '下面图形中，不是四边形的是(  )。\nA. 长方形  B. 正方形  C. 三角形  D. 平行四边形', answer: 'C', options: ['长方形','正方形','三角形','平行四边形'], solution: '三角形有3条边，是三角形不是四边形。', type: 'T01', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
  ]
}

function genAngle(g) {
  if (g <= 2) {
    return [
      { stem: '三角板上最大的角是____角。', answer: '直', solution: '三角板上最大的角是90度的直角。', type: 'T02', difficulty: 0.15, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    ]
  }
  return [
    { stem: '一个周角 = ____个平角 = ____个直角', answer: '2 4', solution: '周角=360°，平角=180°，直角=90°。360÷180=2，360÷90=4。', type: 'T02', difficulty: 0.3, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
    { stem: '下午3时整，钟面上时针和分针的夹角是____度，是____角。', answer: '90 直', solution: '3时整，时针指向3，分针指向12，夹角90°（直角）。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'U', context: 'life' },
  ]
}

function genParallelPerp(g) {
  return [
    { stem: '长方形中，相邻的两条边互相____，相对的两条边互相____。', answer: '垂直 平行', solution: '相邻边夹角90°互相垂直，对边不相交互相平行。', type: 'T02', difficulty: 0.3, cognitive: 'B', steps: 'step1', direction: 'U', context: 'pure' },
  ]
}

function genTriangle(g) {
  return [
    { stem: '一个三角形的三个角分别是50°、60°、70°，按角分类是____三角形。', answer: '锐角', solution: '三个角都小于90°，是锐角三角形。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
    { stem: '三角形任意两边之和____第三边。\nA. 大于  B. 等于  C. 小于  D. 小于或等于', answer: 'A', options: ['大于','等于','小于','小于或等于'], solution: '三角形任意两边之和大于第三边。', type: 'T01', difficulty: 0.3, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
  ]
}

function genQuadrilateral(g) {
  return [
    { stem: '____是特殊的平行四边形，它的四个角都是直角。', answer: '长方形', solution: '长方形对边平行且相等，四角为直角，是特殊的平行四边形。', type: 'T02', difficulty: 0.3, cognitive: 'B', steps: 'step1', direction: 'K', context: 'pure' },
  ]
}

function genCircleIntro(g) {
  return [
    { stem: '画圆时，____决定圆的位置，____决定圆的大小。', answer: '圆心 半径', solution: '圆心确定位置，半径确定大小。', type: 'T02', difficulty: 0.25, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
  ]
}

function genSolidIntro(g) {
  return [
    { stem: '长方体有____个面，____条棱，____个顶点。', answer: '6 12 8', solution: '长方体由6个长方形面围成，12条棱，8个顶点。', type: 'T02', difficulty: 0.25, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
  ]
}

function genPerimeter(g) {
  const L = ri(5,15), W = ri(3,L-1)
  const ironLen = ri(16,40)
  return [
    { stem: `一个长方形长${L}厘米、宽${W}厘米，它的周长是____厘米。`, answer: `${2*(L+W)}`, solution: `周长=(长+宽)×2=(${L}+${W})×2=${2*(L+W)}厘米。`, type: 'T02', difficulty: 0.3, cognitive: 'B', steps: 'step2', direction: 'A', context: 'pure' },
    { stem: `用一根长${ironLen}厘米的铁丝围成一个正方形，边长是____厘米。`, answer: `${ironLen/4}`, solution: `正方形边长=周长÷4=${ironLen}÷4=${ironLen/4}厘米。`, type: 'T05', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'A', context: 'life' },
  ]
}

function genCirclePerim(g) {
  const r = ri(3,10)
  const c = (2 * 3.14 * r).toFixed(1)
  return [
    { stem: `一个圆形花坛的半径是${r}米，绕花坛走一圈是____米。（π取3.14）`, answer: c, solution: `C=2πr=2×3.14×${r}=${c}米。`, type: 'T05', difficulty: 0.4, cognitive: 'B', steps: 'step2', direction: 'A', context: 'life' },
  ]
}

function genArea(g) {
  const formulas = [
    { type: 'T02', stem: '一个正方形边长8厘米，面积是____平方厘米。', answer: '64', solution: '正方形面积=边长×边长=8×8=64平方厘米。' },
    { type: 'T02', stem: '一个平行四边形底12厘米、高5厘米，面积是____平方厘米。', answer: '60', solution: '平行四边形面积=底×高=12×5=60平方厘米。' },
    { type: 'T02', stem: '一个三角形底10厘米、高6厘米，面积是____平方厘米。', answer: '30', solution: '三角形面积=底×高÷2=10×6÷2=30平方厘米。' },
    { type: 'T02', stem: '一个梯形���底4厘米、下底8厘米、高6厘米，面积是____平方厘米。', answer: '36', solution: '梯形面积=(上底+下底)×高÷2=(4+8)×6÷2=36平方厘米。' },
  ]
  return formulas.slice(0, g <= 3 ? 2 : g <= 4 ? 3 : 4).map(f => ({
    ...f,
    difficulty: 0.3,
    cognitive: 'B',
    steps: 'step2',
    direction: 'A',
    context: 'pure',
  }))
}

function genCompositeArea(g) {
  return [
    { stem: '如图，一个长方形长12厘米宽8厘米，去掉一个边长4厘米的正方形后，剩余面积是____平方厘米。', answer: '80', solution: '长方形面积12×8=96平方厘米，正方形面积4×4=16平方厘米，96-16=80平方厘米。', type: 'T05', difficulty: 0.45, cognitive: 'C', steps: 'step3', direction: 'A', context: 'pure' },
  ]
}

function genCircleArea(g) {
  const r = ri(3,8)
  const a = (3.14 * r * r).toFixed(1)
  return [
    { stem: `一个圆的半径是${r}厘米，它的面积是____平方厘米。（π取3.14）`, answer: a, solution: `S=πr²=3.14×${r}×${r}=${a}平方厘米。`, type: 'T02', difficulty: 0.4, cognitive: 'B', steps: 'step2', direction: 'A', context: 'pure' },
  ]
}

function genSurfaceArea(g) {
  return [
    { stem: '一个正方体棱长5厘米，它的表面积是____平方厘米。', answer: '150', solution: '正方体表面积=6×棱长²=6×5×5=150平方厘米。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'A', context: 'pure' },
    { stem: '一个长方体长8厘米、宽5厘米、高3厘米，表面积是____平方厘米。', answer: '158', solution: 'S=2×(8×5+8×3+5×3)=2×(40+24+15)=2×79=158平方厘米。', type: 'T02', difficulty: 0.45, cognitive: 'C', steps: 'step3', direction: 'A', context: 'pure' },
  ]
}

function genVolume(g) {
  const r = ri(2,5), h = ri(3,8)
  const v = (Math.PI * r * r * h / 3).toFixed(1)
  return [
    { stem: '一个长方体长6厘米、宽4厘米、高3厘米，体积是____立方厘米。', answer: '72', solution: 'V=长×宽×高=6×4×3=72立方厘米。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'A', context: 'pure' },
    { stem: `一个圆锥底面半径${r}厘米，高${h}厘米，体积是____立方厘米。（π取3.14）`, answer: v, solution: `V=1/3πr²h=1/3×3.14×${r}²×${h}≈${v}立方厘米`, type: 'T05', difficulty: 0.55, cognitive: 'C', steps: 'step3', direction: 'A', context: 'pure' },
  ]
}

function genSymmetry(g) {
  return [
    { stem: '正方形有____条对称轴。', answer: '4', solution: '正方形有4条对称轴：两条对角线、两条对边中点连线。', type: 'T02', difficulty: 0.3, cognitive: 'B', steps: 'step1', direction: 'U', context: 'pure' },
    { stem: '下面的字母中，是轴对称图形的是(  )。\nA. F  B. G  C. A  D. N', answer: 'C', options: ['F','G','A','N'], solution: 'A沿中间竖线对折可以重合，是轴对称。', type: 'T01', difficulty: 0.3, cognitive: 'B', steps: 'step1', direction: 'U', context: 'pure' },
  ]
}

function genTransform(g) {
  return [
    { stem: '升国旗时，国旗的运动是____现象。', answer: '平��', solution: '国旗沿直线向上移动，是平移。', type: 'T02', difficulty: 0.2, cognitive: 'B', steps: 'step1', direction: 'U', context: 'life' },
    { stem: '电风扇叶片的转动是____现象。', answer: '旋转', solution: '叶片绕中心点转动，是旋转。', type: 'T02', difficulty: 0.2, cognitive: 'B', steps: 'step1', direction: 'U', context: 'life' },
  ]
}

function genScale(g) {
  return [
    { stem: '一个长方形的长和宽都按2:1放大，放大后的面积是原面积的____倍。', answer: '4', solution: '面积放大倍数是长度放大倍数的平方。2×2=4。', type: 'T05', difficulty: 0.45, cognitive: 'C', steps: 'step2', direction: 'U', context: 'pure' },
  ]
}

function genDirection(g) {
  return [
    { stem: '早晨太阳从____方升起，这时你的影子朝向____方。', answer: '东 西', solution: '太阳从东方升起，影子在相反方向（西方）。', type: 'T02', difficulty: 0.25, cognitive: 'B', steps: 'step1', direction: 'U', context: 'life' },
  ]
}

function genCoordinate(g) {
  return [
    { stem: '用数对表示位置时，一般先说____，后说____。', answer: '列 行', solution: '数对格式(列,行)，列在前行在后。', type: 'T02', difficulty: 0.2, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
    { stem: '点A的位置用数对表示是(3,5)，表示在第____列、第____行。', answer: '3 5', solution: '(3,5)表示第3列第5行。', type: 'T02', difficulty: 0.25, cognitive: 'B', steps: 'step1', direction: 'U', context: 'pure' },
  ]
}

function genMapScale(g) {
  return [
    { stem: '在比例尺1:2000000的地图上，5厘米代表实际距离____千米。', answer: '100', solution: '5×2000000=10000000厘米=100千米。', type: 'T05', difficulty: 0.4, cognitive: 'C', steps: 'step2', direction: 'A', context: 'life' },
  ]
}

// 统计与概率
function genClassify(g) {
  return [
    { stem: '把下面的水果分类：苹果、香蕉、橘子、苹果、香蕉、苹果\n苹果有____个，香蕉有____个，橘子有____个。', answer: '3 2 1', solution: '数每个出现次数：苹果3次、香蕉2次、橘子1次。', type: 'T02', difficulty: 0.2, cognitive: 'B', steps: 'step1', direction: 'U', context: 'life' },
  ]
}

function genTable(g) {
  return [
    { stem: '下面是某班同学最喜欢的颜色统计：红色8人，蓝色12人，绿色5人。喜欢蓝色比喜欢绿色的多____人。', answer: '7', solution: '12-5=7人。', type: 'T05', difficulty: 0.25, cognitive: 'B', steps: 'step2', direction: 'A', context: 'school' },
  ]
}

function genBarChart(g) {
  return [
    { stem: '条形统计图中，直条越长表示数量____。', answer: '越多', solution: '条形统计图用直条长短表示数量，越长越多。', type: 'T02', difficulty: 0.15, cognitive: 'A', steps: 'step1', direction: 'K', context: 'pure' },
  ]
}

function genLineChart(g) {
  const months = ['1月','2月','3月','4月','5月','6月']
  const temps = [5,8,15,20,25,30]
  return [
    { stem: `下面是某城市上半年月平均气温统计：
${months.map((m,i) => `${m}: ${temps[i]}℃`).join('，')}

气温上升最快的是____月到____月。`, answer: '2 3', solution: '1→2月: 8-5=3℃；2→3月: 15-8=7℃（最大）→上升最快。', type: 'T05', difficulty: 0.4, cognitive: 'C', steps: 'step3', direction: 'A', context: 'life' },
  ]
}

function genPieChart(g) {
  return [
    { stem: '扇形统计图中，某个部分占总数的25%，对应的圆心角是____度。', answer: '90', solution: '360°×25%=360°×0.25=90°。', type: 'T02', difficulty: 0.4, cognitive: 'B', steps: 'step2', direction: 'U', context: 'pure' },
  ]
}

function genAverage(g) {
  return [
    { stem: '小明语文92分、数学98分、英语89分，三科平均分是____分。', answer: '93', solution: '(92+98+89)÷3=279÷3=93分。', type: 'T05', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'A', context: 'school' },
    { stem: '五个数的平均数是20，其中四个数分别是18、22、19、21，第五个数是____。', answer: '20', solution: '和=20×5=100，第五个数=100-18-22-19-21=20。', type: 'T05', difficulty: 0.45, cognitive: 'C', steps: 'step3', direction: 'A', context: 'pure' },
  ]
}

function genModeMedian(g) {
  return [
    { stem: '数据：12, 15, 12, 18, 12, 20，众数是____。', answer: '12', solution: '12出现了3次，出现次数最多，是众数。', type: 'T02', difficulty: 0.3, cognitive: 'B', steps: 'step1', direction: 'U', context: 'pure' },
  ]
}

function genProbability(g) {
  return [
    { stem: '盒子里有5个红球和1个白球，任意摸一个球。下面说法正确的是(  )。\nA. 一定是红球  B. 不可能是白球  C. 摸到红球的可能性大  D. 摸到红球和白球的可能性一样大', answer: 'C', options: ['一定是红球','不可能是白球','摸到红球的可能性大','摸到红球和白球的可能性一样大'], solution: '红球多，摸到的可能性大，但白球也可能摸到。', type: 'T01', difficulty: 0.35, cognitive: 'B', steps: 'step2', direction: 'U', context: 'life' },
  ]
}

function genProbCalc(g) {
  return [
    { stem: '一个袋子里有3个红球和2个黄球，任意摸一个球，摸到红球的可能性是____。（用分数表示）', answer: '3/5', solution: '红球数÷总数=3÷5=3/5。', type: 'T02', difficulty: 0.35, cognitive: 'B', steps: 'step1', direction: 'A', context: 'life' },
  ]
}

// 综合与实践
function genDrawStrategy(g) {
  return [
    { stem: '小明和小红共有30本书，小明是小红的2倍。小明有____本，小红有____本。', answer: '20 10', solution: '画线段图：小红1份，小明2份，共3份=30本，每份10本。小明20本，小红10本。', type: 'T05', difficulty: 0.4, cognitive: 'C', steps: 'step3', direction: 'A', context: 'school' },
  ]
}

function genListStrategy(g) {
  return [
    { stem: '用1、2、3三个数字可以组成____个不同的两位数。（数字不重复）', answer: '6', solution: '列表：12,13,21,23,31,32。共6个。', type: 'T05', difficulty: 0.35, cognitive: 'B', steps: 'step3', direction: 'A', context: 'pure' },
  ]
}

function genHypothesis(g) {
  return [
    { stem: '小明买了5支铅笔和3本笔记本，共花11元。已知每本笔记本2元，每支铅笔____元。', answer: '1', solution: '3本笔记本2×3=6元，铅笔总价11-6=5元，5支铅笔5元，每支1元。', type: 'T05', difficulty: 0.45, cognitive: 'C', steps: 'step3', direction: 'A', context: 'life' },
  ]
}

function genAnalyzeStrategy(g) {
  return [
    { stem: '食堂买来一批大米，每天吃30千克，可以吃20天。如果每天吃25千克，可以吃____天。', answer: '24', solution: '总量=30×20=600千克，600÷25=24天。', type: 'T05', difficulty: 0.4, cognitive: 'C', steps: 'step3', direction: 'A', context: 'life' },
  ]
}

function genSubstitution(g) {
  return [
    { stem: '已知□+□+○=16，□+○=10，求□=____，○=____。', answer: '6 4', solution: '□+□+○=16 → □+(□+○)=16 → □+10=16 → □=6。代入□+○=10 → 6+○=10 → ○=4。', type: 'T05', difficulty: 0.5, cognitive: 'C', steps: 'step3', direction: 'A', context: 'pure' },
  ]
}

function genNormalization(g) {
  return [
    { stem: '3台拖拉机4小时耕60亩地，照这样计算，5台拖拉机6小时能耕____亩地。', answer: '150', solution: '1台1小时耕60÷3÷4=5亩。5台6小时耕5×5×6=150亩。', type: 'T05', difficulty: 0.5, cognitive: 'C', steps: 'step3', direction: 'A', context: 'life' },
  ]
}

function genSumDiff(g) {
  return [
    { stem: '两个数的和是48，差是12，这两个数分别是____和____。', answer: '30 18', solution: '较大数=(和+差)÷2=(48+12)÷2=30，较小数=(48-12)÷2=18。', type: 'T05', difficulty: 0.45, cognitive: 'C', steps: 'step2', direction: 'A', context: 'pure' },
  ]
}

function genTravel(g) {
  return [
    { stem: '甲乙两地相距360千米，客车每小时行60千米，货车每小时行40千米。两车同时从两地相对开出，____小时后相遇。', answer: '3.6', solution: '速度和60+40=100千米/时，相遇时间360÷100=3.6小时。', type: 'T05', difficulty: 0.5, cognitive: 'C', steps: 'step3', direction: 'A', context: 'life' },
    { stem: '小明和小华从相距200米的A、B两地同时相向而行，小明每秒跑5米，小华每秒跑3米，____秒后两人相距40米。', answer: '20', solution: '速度和5+3=8米/秒，需要共同走200-40=160米，160÷8=20秒。', type: 'T05', difficulty: 0.6, cognitive: 'D', steps: 'step3', direction: 'A', context: 'life' },
  ]
}

function genWork(g) {
  return [
    { stem: '一项工程，甲单独做需要10天完成，乙单独做需要15天完成。两人合作需要____天完成���', answer: '6', solution: '甲效率1/10，乙效率1/15。合作效率1/10+1/15=3/30+2/30=5/30=1/6。需要1÷(1/6)=6天。', type: 'T05', difficulty: 0.55, cognitive: 'C', steps: 'step3', direction: 'A', context: 'life' },
  ]
}

function genChickenRabbit(g) {
  return [
    { stem: '笼子里有鸡和兔共10只，共有28条腿。鸡有____只，兔有____只。', answer: '6 4', solution: '假设全是鸡：10×2=20条腿，28-20=8条差，每只兔比鸡多2条腿，8÷2=4只兔。鸡10-4=6只。', type: 'T05', difficulty: 0.55, cognitive: 'C', steps: 'step3', direction: 'A', context: 'life' },
  ]
}

function genTreePlanting(g) {
  return [
    { stem: '一条路长200米，每隔5米栽一棵树（两端都栽），一共栽____棵树。', answer: '41', solution: '棵数=间隔数+1=200÷5+1=40+1=41棵。', type: 'T05', difficulty: 0.4, cognitive: 'C', steps: 'step2', direction: 'A', context: 'life' },
  ]
}

function genProfitLoss(g) {
  return [
    { stem: '用一根绳子量井深，折成3折量，绳子露出井口2米；折成4折量，绳子刚好到井口。井深____米，绳长____米。', answer: '6 24', solution: '设井深x米。3(x+2)=4x，3x+6=4x，x=6。绳长3×(6+2)=24米。', type: 'T05', difficulty: 0.6, cognitive: 'D', steps: 'step3', direction: 'A', context: 'life' },
  ]
}

function genAge(g) {
  return [
    { stem: '今年爸爸36岁，小明8岁。____年前爸爸的年龄是小明的8倍。', answer: '4', solution: '设x年前：36-x=8×(8-x)，36-x=64-8x，7x=28，x=4。', type: 'T05', difficulty: 0.55, cognitive: 'D', steps: 'step3', direction: 'A', context: 'life' },
  ]
}

function genCombo(g) {
  return [
    { stem: '小明有3件上衣和2条裤子，每次穿一件上衣和一条裤子，有____种不同的穿法。', answer: '6', solution: '3×2=6种。用乘法原理。', type: 'T05', difficulty: 0.3, cognitive: 'B', steps: 'step2', direction: 'A', context: 'life' },
  ]
}

function genSet(g) {
  return [
    { stem: '某班有30人，其中喜欢篮球的有18人，喜欢足球的有15人，两种都喜欢的至少有____人。', answer: '3', solution: '至少=18+15-30=3人。（韦恩图：A+B-总数=交集最小值）', type: 'T05', difficulty: 0.5, cognitive: 'C', steps: 'step2', direction: 'A', context: 'school' },
  ]
}

function genOptimize(g) {
  return [
    { stem: '妈妈用平底锅烙饼，每次最多烙2张，两面各需3分钟。烙3张饼最少需要____分钟。', answer: '9', solution: '方案：先烙1号2号正面3分钟→1号反面+3号正面3分钟→2号反面+3号反面3分钟。共9分钟。', type: 'T05', difficulty: 0.5, cognitive: 'C', steps: 'step3', direction: 'A', context: 'life' },
  ]
}

function genFindDefect(g) {
  return [
    { stem: '有8个球，其中1个是次品（较轻），用天平至少称____次能找出来。', answer: '2', solution: '第一次：3个vs3个。如不平衡→次品在轻的3个中，第二次1个vs1个即可找出。如平衡→次品在剩下2个中，再称一次。', type: 'T05', difficulty: 0.55, cognitive: 'D', steps: 'step3', direction: 'R', context: 'pure' },
  ]
}

function genPigeonhole(g) {
  return [
    { stem: '把5个苹果放进4个抽屉，至少有____个抽屉里放了2个或以上的苹果。', answer: '1', solution: '5÷4=1余1，根据鸽巢原理，至少有一个抽屉放了2个苹果。', type: 'T05', difficulty: 0.45, cognitive: 'C', steps: 'step2', direction: 'R', context: 'pure' },
  ]
}

function genNumShape(g) {
  return [
    { stem: '用小棒摆正方形：摆1个用4根，摆2个用7根，摆3个用10根。摆n个正方形需要____根小棒。', answer: '3n+1', solution: '规律：4,7,10（每次+3）。首项4，公差3，an=4+(n-1)×3=3n+1。', type: 'T08', difficulty: 0.55, cognitive: 'C', steps: 'step3', direction: 'R', context: 'pure' },
  ]
}

// 通用生成器（兜底）
function makeGenericQuestion(leaf, g, qType, cog, domainName) {
  return {
    subject: '数学', grade: g,
    knowledgePoints: [leaf.id],
    questionType: qType, subtype: '',
    difficulty: cog === 'A' ? 0.25 : cog === 'B' ? 0.4 : 0.55,
    cognitiveLevel: cog,
    stepLevel: qType === 'T05' ? 'step2' : 'step1',
    direction: cog === 'A' ? 'K' : cog === 'B' ? 'U' : 'A',
    contextType: qType === 'T05' ? 'life' : 'pure',
    stem: `【${leaf.name}】${leaf.description}。请完成相关练习。`,
    answer: '',
    solution: '',
    source: '程序生成',
    tags: [leaf.name, domainName],
  }
}

// ==================== 主函数 ====================

function main() {
  console.log('=== 程序化批量生成数学题 ===')
  
  const tree = JSON.parse(readFileSync(TREE_PATH, 'utf-8'))
  const domains = tree.dimensions.dim1.domains
  
  let allQuestions = []
  
  for (const domain of domains) {
    for (const mod of domain.modules) {
      console.log(`  ${domain.name} > ${mod.name} (${mod.leaves.length}个知识点)`)
      for (const leaf of mod.leaves) {
        const qs = makeQuestion(leaf, domain.name, mod.name)
        allQuestions = allQuestions.concat(qs)
      }
    }
  }
  
  // 清理空答案/空解题思路的题目
  allQuestions = allQuestions.filter(q => q.stem && q.answer)
  
  writeFileSync(OUT_PATH, JSON.stringify(allQuestions, null, 2), 'utf-8')
  
  console.log(`\n=== 完成 ===`)
  console.log(`总计生成: ${allQuestions.length} 道题`)
  
  // 统计
  const gradeDist = {}, typeDist = {}, domainDist = {}
  for (const q of allQuestions) {
    gradeDist[q.grade] = (gradeDist[q.grade] || 0) + 1
    typeDist[q.questionType] = (typeDist[q.questionType] || 0) + 1
    for (const kp of (q.knowledgePoints || [])) {
      const leaf = tree.dimensions.dim1.leafIndex?.[kp]
      if (leaf) domainDist[leaf.domain] = (domainDist[leaf.domain] || 0) + 1
    }
  }
  console.log('年级分布:', JSON.stringify(gradeDist))
  console.log('题型分布:', JSON.stringify(typeDist))
  console.log('领域分布:', JSON.stringify(domainDist))
}

main()
