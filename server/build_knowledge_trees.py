#!/usr/bin/env python3
"""
构建小学数学+英语+语文全学科知识树
基于2022版新课标（PEP英语/部编版语文）
"""
import json, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def make_leaf_id(subject_prefix, idx):
    return f"{subject_prefix}-leaf-{idx:03d}"

def build_math_tree():
    """已有数学知识树，直接读取"""
    path = os.path.join(BASE_DIR, 'data', 'knowledge_tree.json')
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def build_english_tree():
    leaf_counter = [0]
    
    def leaf(name, grades, desc):
        leaf_counter[0] += 1
        return {
            "id": make_leaf_id("en", leaf_counter[0]),
            "name": name,
            "grades": grades,
            "description": desc
        }
    
    return {
        "subject": "英语",
        "version": "2.0",
        "dimensions": {
            "dim1": {
                "name": "知识叶子树",
                "description": "小学英语知识点层级体系（PEP版/2022新课标）",
                "domains": [
                    {
                        "id": "EN-D1",
                        "name": "语音与字母",
                        "icon": "microphone",
                        "modules": [
                            {
                                "id": "EN-D1-M1",
                                "name": "字母与发音",
                                "leaves": [
                                    leaf("26个字母的认读与书写", [1,2], "字母名、字母形的大小写书写、字母表顺序"),
                                    leaf("字母在单词中的发音", [1,2,3], "元音字母a/e/i/o/u在开闭音节中的基本发音"),
                                    leaf("辅音字母组合发音", [3,4], "ch/sh/th/wh/ph/ck/ng等常见辅音组合发音规则"),
                                ]
                            },
                            {
                                "id": "EN-D1-M2",
                                "name": "语音规则",
                                "leaves": [
                                    leaf("开音节与闭音节", [3,4], "元音字母在开音节发字母本音，闭音节发短音"),
                                    leaf("重音与语调", [4,5,6], "单词重音、句子重音、升调和降调的基本运用"),
                                    leaf("连读与失去爆破", [5,6], "辅音+元音连读、爆破音的失去爆破现象"),
                                    leaf("句子节奏与意群", [5,6], "按意群朗读、停顿，把握英语句子的节奏感"),
                                ]
                            }
                        ]
                    },
                    {
                        "id": "EN-D2",
                        "name": "词汇",
                        "icon": "notebook",
                        "modules": [
                            {
                                "id": "EN-D2-M1",
                                "name": "名词",
                                "leaves": [
                                    leaf("家庭成员与人物称谓", [1,2,3], "father/mother/brother/sister/teacher/friend等"),
                                    leaf("学校与学习用品", [1,2,3], "book/pen/pencil/ruler/schoolbag/classroom等"),
                                    leaf("动物与自然", [2,3,4], "cat/dog/bird/fish/tree/flower/river/mountain等"),
                                    leaf("食物与饮料", [2,3,4], "rice/noodle/bread/milk/water/juice/fruit/vegetable等"),
                                    leaf("身体部位与健康", [3,4], "head/eye/nose/mouth/hand/foot等，及ill/headache等"),
                                    leaf("服装与颜色", [3,4], "shirt/dress/shoes/hat，red/blue/green/yellow等颜色词"),
                                    leaf("地点与建筑", [4,5,6], "school/hospital/park/library/supermarket/cinema等"),
                                    leaf("不可数名词与可数名词", [4,5,6], "water/milk/rice等不可数名词，名词单复数变化规则"),
                                ]
                            },
                            {
                                "id": "EN-D2-M2",
                                "name": "动词",
                                "leaves": [
                                    leaf("动作动词", [1,2,3], "run/jump/swim/fly/eat/drink/read/write/play等"),
                                    leaf("日常生活动词", [2,3,4], "get up/wash/brush/go to school/go home/go to bed等"),
                                    leaf("be动词的用法", [3,4,5], "am/is/are在不同人称中的使用，was/were的过去形式"),
                                    leaf("情态动词", [4,5,6], "can/can't表示能力，must/should表示义务建议，may表示可能"),
                                    leaf("动词的时态变化", [5,6], "动词原形→第三人称单数→现在分词→过去式的规则与不规则变化"),
                                ]
                            },
                            {
                                "id": "EN-D2-M3",
                                "name": "形容词、副词与代词",
                                "leaves": [
                                    leaf("描述性形容词", [2,3,4], "big/small/tall/short/beautiful/interesting等事物描述词"),
                                    leaf("感觉与情绪形容词", [3,4,5], "happy/sad/angry/tired/excited/bored/worried等"),
                                    leaf("比较级与最高级", [5,6], "形容词/副词比较级(-er)和最高级(-est)的构成与使用"),
                                    leaf("频度副词", [4,5,6], "always/usually/often/sometimes/never在句中的位置"),
                                    leaf("人称代词与物主代词", [3,4,5], "主格/宾格，形容词性物主代词/名词性物主代词"),
                                    leaf("指示代词与疑问词", [3,4,5], "this/that/these/those，what/who/where/when/why/how"),
                                ]
                            },
                            {
                                "id": "EN-D2-M4",
                                "name": "数词、介词与连词",
                                "leaves": [
                                    leaf("基数词与序数词", [3,4,5], "1-100基数词，1st-31st序数词，年月日表达"),
                                    leaf("时间介词", [3,4,5], "at/in/on表示时间，before/after/from...to"),
                                    leaf("地点与方位介词", [3,4,5], "in/on/under/behind/near/between/next to等"),
                                    leaf("并列连词", [5,6], "and/but/or/so连接并列成分或并列句"),
                                ]
                            }
                        ]
                    },
                    {
                        "id": "EN-D3",
                        "name": "语法",
                        "icon": "edit",
                        "modules": [
                            {
                                "id": "EN-D3-M1",
                                "name": "时态",
                                "leaves": [
                                    leaf("一般现在时", [4,5], "表示经常性动作或状态，主语三单时动词+s/es"),
                                    leaf("现在进行时", [4,5], "be(am/is/are)+V-ing表示正在进行的动作"),
                                    leaf("一般过去时", [5,6], "动词过去式（规则+ed/不规则变化），yesterday/last week等"),
                                    leaf("一般将来时", [5,6], "will+V原形 / be going to+V原形表示将来的计划"),
                                    leaf("现在完成时（入门）", [6], "have/has+过去分词，already/yet/ever/never"),
                                ]
                            },
                            {
                                "id": "EN-D3-M2",
                                "name": "句型结构",
                                "leaves": [
                                    leaf("陈述句（肯定/否定）", [3,4,5], "主语+谓语+...，否定句加don't/doesn't/didn't/won't"),
                                    leaf("一般疑问句", [3,4,5], "Be/Do/Does/Did/Will提前，Yes/No回答"),
                                    leaf("特殊疑问句", [4,5,6], "Wh-疑问词(What/Who/Where/When/Why/How)引导的特殊疑问句"),
                                    leaf("There be句型", [4,5], "There is/are...表示某处存在某物，就近原则"),
                                    leaf("祈使句", [3,4,5], "肯定祈使(V原形开头)、否定祈使(Don't+V原形)、Let's..."),
                                ]
                            }
                        ]
                    },
                    {
                        "id": "EN-D4",
                        "name": "话题交际",
                        "icon": "chat-dot-square",
                        "modules": [
                            {
                                "id": "EN-D4-M1",
                                "name": "个人与社会",
                                "leaves": [
                                    leaf("问候与自我介绍", [1,2,3], "Hello/Hi/Good morning/My name is.../I'm...years old"),
                                    leaf("介绍他人与家庭", [2,3,4], "This is my.../He/She is.../There are...people in my family"),
                                    leaf("学校生活", [3,4,5], "What class do you have?/My favourite subject is..."),
                                    leaf("兴趣爱好", [4,5,6], "I like.../My hobby is.../What do you like doing?"),
                                ]
                            },
                            {
                                "id": "EN-D4-M2",
                                "name": "日常生活",
                                "leaves": [
                                    leaf("饮食与点餐", [3,4,5], "I'd like.../What would you like?/How much is it?"),
                                    leaf("购物", [4,5], "Can I help you?/How much is...?/It's...yuan"),
                                    leaf("问路与指路", [5,6], "Where is the...?/Go straight/Turn left/right/next to"),
                                    leaf("天气与季节", [4,5], "What's the weather like?/It's sunny/rainy/windy..."),
                                    leaf("打电话", [5,6], "Hello, this is...speaking/May I speak to...?/Can I take a message?"),
                                ]
                            },
                            {
                                "id": "EN-D4-M3",
                                "name": "节日与计划",
                                "leaves": [
                                    leaf("节日祝福", [3,4,5], "Happy New Year!/Merry Christmas!/Happy Children's Day!"),
                                    leaf("制订计划与邀请", [5,6], "What are you going to do?/Would you like to...?/Let's..."),
                                ]
                            }
                        ]
                    },
                    {
                        "id": "EN-D5",
                        "name": "阅读理解",
                        "icon": "reading",
                        "modules": [
                            {
                                "id": "EN-D5-M1",
                                "name": "基础阅读",
                                "leaves": [
                                    leaf("图文匹配", [1,2,3], "根据图片选择正确的单词或句子，连线配对"),
                                    leaf("短文判断正误", [3,4], "阅读3-5句短文，判断陈述的True/False"),
                                    leaf("细节理解", [4,5,6], "从短文中提取时间、地点、人物、事件等具体信息"),
                                    leaf("主旨大意", [5,6], "概括短文中心思想、选择最佳标题"),
                                    leaf("推理判断", [5,6], "根据上下文推断隐含信息、人物态度或感情"),
                                ]
                            },
                            {
                                "id": "EN-D5-M2",
                                "name": "综合阅读",
                                "leaves": [
                                    leaf("完形填空", [5,6], "根据上下文选择正确单词填入短文空白"),
                                    leaf("任务型阅读", [5,6], "读后完成表格、回答问题、排序等综合任务"),
                                ]
                            }
                        ]
                    },
                    {
                        "id": "EN-D6",
                        "name": "书面表达",
                        "icon": "edit-pen",
                        "modules": [
                            {
                                "id": "EN-D6-M1",
                                "name": "句子书写",
                                "leaves": [
                                    leaf("大小写与标点", [3,4], "句首字母大写、专有名词大写、句末标点正确使用"),
                                    leaf("连词成句", [3,4,5], "将打乱顺序的单词按正确语序组成句子"),
                                    leaf("仿写句子", [4,5], "按照范例句式替换关键词写出新句子"),
                                ]
                            },
                            {
                                "id": "EN-D6-M2",
                                "name": "短文写作",
                                "leaves": [
                                    leaf("看图写���", [3,4,5], "根据图片用3-5句话描述场景或故事"),
                                    leaf("话题作文", [5,6], "围绕给定话题（如My family/My day/My favourite season）写5-8句"),
                                    leaf("应用文写作", [5,6], "写电子邮件、明信片、便条、邀请函等"),
                                ]
                            }
                        ]
                    }
                ]
            },
            "dim2": {
                "name": "题型分类",
                "description": "英语题目的呈现形式和答题方式",
                "categories": {
                    "EN-T01": {"name": "选择题", "description": "从多个选项中选出正确答案"},
                    "EN-T02": {"name": "填空题", "description": "填写单词或短语"},
                    "EN-T03": {"name": "连词成句", "description": "将单词按正确语序排列成句"},
                    "EN-T04": {"name": "判断题", "description": "判断陈述的正误（True/False或√/×）"},
                    "EN-T05": {"name": "匹配题", "description": "将左右两栏对应项连线或配对"},
                    "EN-T06": {"name": "完形填空", "description": "短文留空，选择正确单词填入"},
                    "EN-T07": {"name": "阅读理解", "description": "阅读短文后回答问题"},
                    "EN-T08": {"name": "写作题", "description": "根据要求写句子或短文"},
                    "EN-T09": {"name": "听力题", "description": "听录音后作答"},
                    "EN-T10": {"name": "综合题", "description": "跨模块多技能综合考察"}
                }
            },
            "dim3": {
                "name": "认知层级",
                "levels": {
                    "A": {"name": "识记", "description": "能回忆和再现单词、短语、语法规则"},
                    "B": {"name": "理解", "description": "能理解语句含义，进行简单转换和判断"},
                    "C": {"name": "应用", "description": "在新情境中运用语言知识进行交际"},
                    "D": {"name": "综合", "description": "综合多项语言技能解决复杂任务"}
                }
            },
            "dim4": {
                "name": "解题步骤层级",
                "levels": {
                    "step1": {"name": "单步操作", "description": "直接识别或套用"},
                    "step2": {"name": "双步推理", "description": "需要两步思考"},
                    "step3": {"name": "多步分析", "description": "3步及以上逻辑链条"},
                    "step4": {"name": "策略选择", "description": "需选择最优方法"}
                }
            },
            "dim5": {
                "name": "考察方向",
                "categories": {
                    "K": {"name": "知识再认", "description": "考察对单词、短语、规则的记忆"},
                    "U": {"name": "理解判断", "description": "考察对语言现象的理解和判断"},
                    "A": {"name": "应用解决", "description": "考察运用语言知识完成任务的能力"},
                    "R": {"name": "推理分析", "description": "考察逻辑推理和文本分析能力"},
                    "E": {"name": "综合创造", "description": "考察创造性表达和综合运用能力"}
                }
            },
            "dim6": {
                "name": "情境类型",
                "categories": {
                    "pure": {"name": "纯语言情境", "description": "无现实背景的纯语言练习"},
                    "life": {"name": "生活情境", "description": "家庭、购物、出行等日常生活场景"},
                    "school": {"name": "校园情境", "description": "课堂、操场、图书馆等学校场景"},
                    "cross": {"name": "跨文化情境", "description": "涉及中西文化对比、节日、习俗等"}
                }
            }
        }
    }

def build_chinese_tree():
    leaf_counter = [0]
    
    def leaf(name, grades, desc):
        leaf_counter[0] += 1
        return {
            "id": make_leaf_id("cn", leaf_counter[0]),
            "name": name,
            "grades": grades,
            "description": desc
        }
    
    return {
        "subject": "语文",
        "version": "2.0",
        "dimensions": {
            "dim1": {
                "name": "知识叶子树",
                "description": "小学语文知识点层级体系（部编版/2022新课标）",
                "domains": [
                    {
                        "id": "CN-D1",
                        "name": "汉语拼音",
                        "icon": "microphone",
                        "modules": [
                            {
                                "id": "CN-D1-M1",
                                "name": "声母与韵母",
                                "leaves": [
                                    leaf("声母（23个）", [1], "bpmf/dtnl/gkh/jqx/zh ch sh r/z c s/yw的认读与书写"),
                                    leaf("韵母（24个）", [1], "单韵母aoeiuü、复韵母、鼻韵母的认读与书写"),
                                    leaf("整体认读音节（16个）", [1], "zhi/chi/shi/ri/zi/ci/si/yi/wu/yu/ye/yue/yuan/yin/yun/ying"),
                                ]
                            },
                            {
                                "id": "CN-D1-M2",
                                "name": "拼读规则",
                                "leaves": [
                                    leaf("两拼法与三拼法", [1], "声母+韵母两拼，声母+介母+韵母三拼"),
                                    leaf("声调与标调规则", [1], "阴阳上去四声，标在a/o/e/i/u/ü上的规则"),
                                    leaf("ü上两点省略规则", [1], "j/q/x/y与ü相拼时ü上两点省略"),
                                ]
                            }
                        ]
                    },
                    {
                        "id": "CN-D2",
                        "name": "识字与写字",
                        "icon": "edit",
                        "modules": [
                            {
                                "id": "CN-D2-M1",
                                "name": "汉字的构成",
                                "leaves": [
                                    leaf("基本笔画", [1,2], "点横竖撇捺提折钩8种基本笔画及复合笔画的规范书写"),
                                    leaf("笔顺规则", [1,2], "先横后竖/先撇后捺/从上到下/从左到右/从外到内/先中间后两边"),
                                    leaf("偏旁部首", [1,2,3], "常见偏旁（氵、亻、口、木、艹、扌、钅等）及部首查字法"),
                                    leaf("汉字结构", [2,3], "独体字、上下结构、左右结构、包围结构（全包围/半包围）"),
                                ]
                            },
                            {
                                "id": "CN-D2-M2",
                                "name": "字的辨析",
                                "leaves": [
                                    leaf("同音字辨析", [2,3,4], "字音相同但字形字义不同的字（如：在/再，做/作，的/地/得）"),
                                    leaf("形近字辨析", [2,3,4], "字形相近容易混淆的字（如：己/已/巳，拔/拨，未/末）"),
                                    leaf("多音字", [2,3,4,5,6], "一字多音，在不同词语中读音不同（如：好hǎo/hào，长cháng/zhǎng）"),
                                    leaf("查字典", [2,3], "音序查字法（按拼音查）和部首查字法（按部首查）"),
                                ]
                            }
                        ]
                    },
                    {
                        "id": "CN-D3",
                        "name": "词语",
                        "icon": "notebook",
                        "modules": [
                            {
                                "id": "CN-D3-M1",
                                "name": "词语理解与积累",
                                "leaves": [
                                    leaf("近义词与反义词", [2,3,4,5], "分辨近义词的细微差别和感情色彩，掌握常见反义词对"),
                                    leaf("词语搭配", [2,3,4], "量词搭配（一只/一条/一张）、形容词+名词、动词+名词的正确搭配"),
                                    leaf("成语积累", [3,4,5,6], "常见成语的理解与运用（如：画蛇添足、亡羊补牢、守株待兔）"),
                                    leaf("词语的感情色彩", [4,5,6], "褒义词、贬义词、中性词的辨别与恰当使用"),
                                ]
                            },
                            {
                                "id": "CN-D3-M2",
                                "name": "关联词语",
                                "leaves": [
                                    leaf("并列关系", [3,4], "既……又……、一边……一边……、不是……而是……"),
                                    leaf("递进关系", [4,5], "不但……而且……、不仅……还……、……甚至……"),
                                    leaf("转折与因果", [4,5,6], "虽然……但是……、因为……所以……、既然……就……"),
                                    leaf("条件与假设", [5,6], "只有……才……、只要……就……、如果……就……、即使……也……"),
                                ]
                            }
                        ]
                    },
                    {
                        "id": "CN-D4",
                        "name": "句子",
                        "icon": "tickets",
                        "modules": [
                            {
                                "id": "CN-D4-M1",
                                "name": "句式与变换",
                                "leaves": [
                                    leaf('「把」字句与「被」字句', [3,4], '「把」字句与「被」字句的相互转换'),
                                    leaf("陈述句与反问句", [4,5], "陈述句与反问句的相互转换，体会反问句的表达效果"),
                                    leaf("扩句与缩句", [4,5], "给句子添加修饰成分使其具体生动，去掉修饰成分保留主干"),
                                    leaf("直接引语与间接引语", [5,6], "把直接叙述改为转述（人称和标点的变化）"),
                                ]
                            },
                            {
                                "id": "CN-D4-M2",
                                "name": "修辞与病句",
                                "leaves": [
                                    leaf("修辞手法", [3,4,5,6], "比喻（明喻/暗喻）、拟人、排比、夸张、设问、反问的辨别与运用"),
                                    leaf("病句修改", [3,4,5,6], "成分残缺/搭配不当/语序颠倒/重复啰嗦/前后矛盾/分类不当的识别与修改"),
                                    leaf("标点符号", [2,3,4,5], "句号/逗号/顿号/分号/问号/感叹号/冒号/引号/省略号/破折号的正确使用"),
                                ]
                            }
                        ]
                    },
                    {
                        "id": "CN-D5",
                        "name": "阅读",
                        "icon": "reading",
                        "modules": [
                            {
                                "id": "CN-D5-M1",
                                "name": "课内阅读",
                                "leaves": [
                                    leaf("课文内容理解", [1,2,3,4,5,6], "把握课文主要内容，梳理文章脉络和结构"),
                                    leaf("中心思想概括", [3,4,5,6], "理解文章主旨，体会作者表达的思想感情"),
                                    leaf("关键词句理解", [3,4,5,6], "联系上下文理解含义深刻的词句，品味表达效果"),
                                ]
                            },
                            {
                                "id": "CN-D5-M2",
                                "name": "课外阅读",
                                "leaves": [
                                    leaf("记叙文阅读", [3,4,5,6], "理清六要素（时间/地点/人物/起因/经过/结果），分析人物形象"),
                                    leaf("说明文阅读", [4,5,6], "把握说明对象特征，识别说明方法（列数字/举例子/作比较/打比方）"),
                                    leaf("非连续性文本阅读", [4,5,6], "阅读图表/广告/说明书/路线图等，提取和整合信息"),
                                ]
                            },
                            {
                                "id": "CN-D5-M3",
                                "name": "古诗文阅读",
                                "leaves": [
                                    leaf("古诗词理解", [1,2,3,4,5,6], "读准字音、理解诗意、想象画面、体会情感"),
                                    leaf("文言文入门", [5,6], "借助注释理解文言文大意（如：《杨氏之子》《伯牙鼓琴》）"),
                                ]
                            }
                        ]
                    },
                    {
                        "id": "CN-D6",
                        "name": "写作",
                        "icon": "edit-pen",
                        "modules": [
                            {
                                "id": "CN-D6-M1",
                                "name": "基础写作",
                                "leaves": [
                                    leaf("看图写话", [1,2], "单幅图/多幅图：观察画面、合理想象、通顺表达"),
                                    leaf("片段写作", [3,4], "围绕一个意思写清楚一段话，注意句与句的连贯"),
                                    leaf("日记与周记", [3,4], "记录生活中的见闻感受，格式规范"),
                                ]
                            },
                            {
                                "id": "CN-D6-M2",
                                "name": "文体写作",
                                "leaves": [
                                    leaf("写人记事", [4,5,6], "通过具体事例表现人物特点，抓住外貌/语言/动作/神态/心理描写"),
                                    leaf("写景状物", [3,4,5], "按顺序观察，抓住事物特点，恰当运用修辞"),
                                    leaf("想象作文", [4,5,6], "合理想象，情节完整，主题健康（如：未来世界、童话续写）"),
                                ]
                            },
                            {
                                "id": "CN-D6-M3",
                                "name": "应用文写作",
                                "leaves": [
                                    leaf("书信与通知", [4,5], "书信格式（称呼/正文/祝福语/署名/日期），通知格式"),
                                    leaf("读后感与观后感", [5,6], "引述内容→谈感受→联系实际→总结升华"),
                                ]
                            }
                        ]
                    },
                    {
                        "id": "CN-D7",
                        "name": "古诗文积累",
                        "icon": "collection",
                        "modules": [
                            {
                                "id": "CN-D7-M1",
                                "name": "古诗词背诵",
                                "leaves": [
                                    leaf("1-2年级必背古诗", [1,2], "《咏鹅》《静夜思》《悯农》《春晓》《登鹳雀楼》等15首"),
                                    leaf("3-4年级必背古诗", [3,4], "《望庐山瀑布》《绝句》《元日》《题西林壁》《出塞》等25首"),
                                    leaf("5-6年级必背古诗", [5,6], "《示儿》《己亥杂诗》《石灰吟》《竹石》《七律·长征》等35首"),
                                ]
                            },
                            {
                                "id": "CN-D7-M2",
                                "name": "古诗赏析",
                                "leaves": [
                                    leaf("意象与意境", [4,5,6], "理解诗中的常见意象（月/柳/梅/菊/雁/流水等），体会诗歌意境"),
                                    leaf("名句赏析与默写", [3,4,5,6], "理解经典名句的含义，能够准确默写古诗名句"),
                                ]
                            }
                        ]
                    },
                    {
                        "id": "CN-D8",
                        "name": "口语交际与综合",
                        "icon": "chat-dot-square",
                        "modules": [
                            {
                                "id": "CN-D8-M1",
                                "name": "口语交际",
                                "leaves": [
                                    leaf("倾听与复述", [1,2,3], "认真听别人讲话，能复述大意和精彩情节"),
                                    leaf("讲述与讨论", [3,4,5], "有条理地讲述见闻，积极参与讨论，表达自己的观点"),
                                    leaf("劝说与辩论", [5,6], "根据对象和场合进行劝说，简单辩论中清晰陈述观点"),
                                ]
                            },
                            {
                                "id": "CN-D8-M2",
                                "name": "综合性学习",
                                "leaves": [
                                    leaf("信息搜集与整理", [4,5,6], "通过图书馆、网络等搜集资料，分类整理并呈现"),
                                    leaf("语文实践活动", [3,4,5,6], "手抄报/读书汇报/课本剧表演/演讲比赛等综合性语文活动"),
                                ]
                            }
                        ]
                    }
                ]
            },
            "dim2": {
                "name": "题型分类",
                "description": "语文题目的呈现形式和答题方式",
                "categories": {
                    "CN-T01": {"name": "选择题", "description": "从多个选项中选出正确答案"},
                    "CN-T02": {"name": "填空题", "description": "在空白处填写字词或短语"},
                    "CN-T03": {"name": "看拼音写词语", "description": "根据拼音写出对应的汉字词语"},
                    "CN-T04": {"name": "判断题", "description": "判断陈述的正误"},
                    "CN-T05": {"name": "连线/匹配题", "description": "将对应项连线配对"},
                    "CN-T06": {"name": "改错题", "description": "修改病句或改正错别字"},
                    "CN-T07": {"name": "阅读理解", "description": "阅读短文后回答问题"},
                    "CN-T08": {"name": "写作题", "description": "根据要求写作文或片段"},
                    "CN-T09": {"name": "古诗默写", "description": "根据上下文或情境默写古诗名句"},
                    "CN-T10": {"name": "表达题", "description": "仿写句子、口语交际等语言表达"}
                }
            },
            "dim3": {
                "name": "认知层级",
                "levels": {
                    "A": {"name": "识记", "description": "能回忆和再现字词、古诗、文学常识"},
                    "B": {"name": "理解", "description": "能理解词语含义、句意和文意"},
                    "C": {"name": "应用", "description": "运用语言知识和技巧完成表达任务"},
                    "D": {"name": "综合", "description": "综合多项能力进行鉴赏、评价和创造"}
                }
            },
            "dim4": {
                "name": "解题步骤层级",
                "levels": {
                    "step1": {"name": "单步操作", "description": "直接识别或回忆即可作答"},
                    "step2": {"name": "双步推理", "description": "需要两步思考"},
                    "step3": {"name": "多步分析", "description": "需要3步及以上分析"},
                    "step4": {"name": "综合鉴赏", "description": "需结合背景、文意、技法综合赏析"}
                }
            },
            "dim5": {
                "name": "考察方向",
                "categories": {
                    "K": {"name": "识记积累", "description": "考察对字词、古诗、文学常识的积累"},
                    "U": {"name": "理解分析", "description": "考察对文本内容和语言的理解分析"},
                    "A": {"name": "表达运用", "description": "考察语言运用和书面表达能力"},
                    "R": {"name": "鉴赏评价", "description": "考察对文本的欣赏和评价能力"},
                    "E": {"name": "探究创新", "description": "考察探究性学习和创造性表达"}
                }
            },
            "dim6": {
                "name": "情境类型",
                "categories": {
                    "pure": {"name": "纯语言情境", "description": "无现实背景的语言知识练习"},
                    "life": {"name": "生活情境", "description": "家庭、社会等日常生活中的语言运用"},
                    "culture": {"name": "文化情境", "description": "涉及传统文化、经典文学等"},
                    "cross": {"name": "跨学科情境", "description": "与科学、历史、美术等其他学科关联"}
                }
            }
        }
    }

if __name__ == '__main__':
    data_dir = os.path.join(BASE_DIR, 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    # 英语知识树
    en_tree = build_english_tree()
    en_path = os.path.join(data_dir, 'knowledge_tree_english.json')
    with open(en_path, 'w', encoding='utf-8') as f:
        json.dump(en_tree, f, ensure_ascii=False, indent=2)
    print(f"✅ English knowledge tree: {en_path}")
    
    # 语文知识树
    cn_tree = build_chinese_tree()
    cn_path = os.path.join(data_dir, 'knowledge_tree_chinese.json')
    with open(cn_path, 'w', encoding='utf-8') as f:
        json.dump(cn_tree, f, ensure_ascii=False, indent=2)
    print(f"✅ Chinese knowledge tree: {cn_path}")
    
    # 统计
    def count_leaves(tree):
        count = 0
        for domain in tree['dimensions']['dim1']['domains']:
            for mod in domain['modules']:
                count += len(mod['leaves'])
        return count
    
    print(f"\n📊 Knowledge Tree Statistics:")
    print(f"   English: {count_leaves(en_tree)} leaf nodes")
    print(f"   Chinese: {count_leaves(cn_tree)} leaf nodes")
    math_tree = build_math_tree()
    print(f"   Math (existing): {len(math_tree['leafIndex'])} leaf nodes")
