import { filterTextForGrade, ageToGradeLevel } from '../utils/kanjiFilter';

export interface VocabularyQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  difficulty: number;
  category: string;
  originalQuestion?: string;
  originalOptions?: string[];
}

export interface AgeGroupQuestions {
  ageGroup: string;
  ageRange: { min: number; max: number };
  questions: VocabularyQuestion[];
}

// 6-8歳向け語彙問題（低学年）
const age6to8Questions: VocabularyQuestion[] = [
  // 動物・生き物
  { id: 'q6_1', question: '「いぬ」はどんな鳴（な）き声？', options: ['わんわん', 'にゃーにゃー', 'もーもー'], correct: 0, difficulty: 2, category: '動物' },
  { id: 'q6_2', question: '「ねこ」はどんな鳴（な）き声？', options: ['わんわん', 'にゃーにゃー', 'ちゅんちゅん'], correct: 1, difficulty: 2, category: '動物' },
  { id: 'q6_3', question: '「とり」はどんな鳴（な）き声？', options: ['もーもー', 'ちゅんちゅん', 'わんわん'], correct: 1, difficulty: 2, category: '動物' },
  { id: 'q6_4', question: '「うし」はどんな鳴（な）き声？', options: ['もーもー', 'にゃーにゃー', 'ちゅんちゅん'], correct: 0, difficulty: 2, category: '動物' },
  { id: 'q6_5', question: '「ぞう」の鼻は？', options: ['みじかい', 'ながい', 'ない'], correct: 1, difficulty: 2, category: '動物' },
  
  // 色
  { id: 'q6_6', question: '「あか」い色のものはどれ？', options: ['りんご', 'バナナ', 'きゅうり'], correct: 0, difficulty: 2, category: '色' },
  { id: 'q6_7', question: '「きいろ」い色のものはどれ？', options: ['りんご', 'バナナ', 'ぶどう'], correct: 1, difficulty: 2, category: '色' },
  { id: 'q6_8', question: '「みどり」の色のものはどれ？', options: ['いちご', 'みかん', 'きゅうり'], correct: 2, difficulty: 2, category: '色' },
  { id: 'q6_9', question: '「しろ」い色のものはどれ？', options: ['ゆき', 'トマト', 'そら'], correct: 0, difficulty: 2, category: '色' },
  { id: 'q6_10', question: '「あお」い色のものはどれ？', options: ['りんご', 'そら', 'きゅうり'], correct: 1, difficulty: 2, category: '色' },
  
  // 感情・挨拶
  { id: 'q6_11', question: '「ありがとう」はいつ言う？', options: ['おこった時', 'うれしい時', 'かなしい時'], correct: 1, difficulty: 3, category: '感情' },
  { id: 'q6_12', question: '「おはよう」はいつ言う？', options: ['あさ', 'ひる', 'よる'], correct: 0, difficulty: 2, category: '感情' },
  { id: 'q6_13', question: '「こんばんは」はいつ言う？', options: ['あさ', 'ひる', 'よる'], correct: 2, difficulty: 2, category: '感情' },
  { id: 'q6_14', question: '「ごめんなさい」はいつ言う？', options: ['わるいことをした時', 'うれしい時', 'おなかがすいた時'], correct: 0, difficulty: 3, category: '感情' },
  { id: 'q6_15', question: '「さようなら」はいつ言う？', options: ['あう時', 'わかれる時', 'たべる時'], correct: 1, difficulty: 3, category: '感情' },
  
  // 体の部位
  { id: 'q6_16', question: '「て」はいくつある？', options: ['1つ', '2つ', '3つ'], correct: 1, difficulty: 2, category: '体' },
  { id: 'q6_17', question: '「あし」はいくつある？', options: ['1つ', '2つ', '4つ'], correct: 1, difficulty: 2, category: '体' },
  { id: 'q6_18', question: '「め」はいくつある？', options: ['1つ', '2つ', '3つ'], correct: 1, difficulty: 2, category: '体' },
  { id: 'q6_19', question: '「くち」はなんのためにある？', options: ['みるため', 'きくため', 'たべるため'], correct: 2, difficulty: 3, category: '体' },
  { id: 'q6_20', question: '「はな」はなんのためにある？', options: ['においをかぐため', 'みるため', 'きくため'], correct: 0, difficulty: 3, category: '体' },
  
  // 数・量
  { id: 'q6_21', question: '「おおきい」の反対は？', options: ['たかい', 'ちいさい', 'ながい'], correct: 1, difficulty: 3, category: '数量' },
  { id: 'q6_22', question: '「たかい」の反対は？', options: ['ひくい', 'ちいさい', 'みじかい'], correct: 0, difficulty: 3, category: '数量' },
  { id: 'q6_23', question: '「ながい」の反対は？', options: ['ひくい', 'ちいさい', 'みじかい'], correct: 2, difficulty: 3, category: '数量' },
  { id: 'q6_24', question: '「おもい」の反対は？', options: ['かるい', 'ちいさい', 'やわらかい'], correct: 0, difficulty: 3, category: '数量' },
  { id: 'q6_25', question: '「はやい」の反対は？', options: ['おそい', 'ちいさい', 'みじかい'], correct: 0, difficulty: 3, category: '数量' },
  
  // 食べ物
  { id: 'q6_26', question: '「あまい」食べ物はどれ？', options: ['ケーキ', 'しお', 'レモン'], correct: 0, difficulty: 3, category: '食べ物' },
  { id: 'q6_27', question: '「すっぱい」食べ物はどれ？', options: ['あめ', 'レモン', 'パン'], correct: 1, difficulty: 3, category: '食べ物' },
  { id: 'q6_28', question: '「からい」食べ物はどれ？', options: ['アイス', 'わさび', 'りんご'], correct: 1, difficulty: 3, category: '食べ物' },
  { id: 'q6_29', question: '「つめたい」食べ物はどれ？', options: ['アイス', 'スープ', 'やきいも'], correct: 0, difficulty: 3, category: '食べ物' },
  { id: 'q6_30', question: '「あつい」食べ物はどれ？', options: ['アイス', 'スープ', 'サラダ'], correct: 1, difficulty: 3, category: '食べ物' },
  
  // 場所・方向
  { id: 'q6_31', question: '「うえ」の反対は？', options: ['した', 'みぎ', 'ひだり'], correct: 0, difficulty: 3, category: '方向' },
  { id: 'q6_32', question: '「みぎ」の反対は？', options: ['うえ', 'した', 'ひだり'], correct: 2, difficulty: 3, category: '方向' },
  { id: 'q6_33', question: '「まえ」の反対は？', options: ['うしろ', 'よこ', 'なか'], correct: 0, difficulty: 3, category: '方向' },
  { id: 'q6_34', question: '「そと」の反対は？', options: ['となり', 'なか', 'とおく'], correct: 1, difficulty: 3, category: '方向' },
  { id: 'q6_35', question: '「ちかく」の反対は？', options: ['そば', 'とおく', 'なか'], correct: 1, difficulty: 3, category: '方向' },
  
  // 天気・自然
  { id: 'q6_36', question: '「あめ」が降る時の空は？', options: ['あおい', 'くろい', 'しろい'], correct: 1, difficulty: 3, category: '自然' },
  { id: 'q6_37', question: '「ゆき」が降る時は？', options: ['あつい', 'さむい', 'あたたかい'], correct: 1, difficulty: 3, category: '自然' },
  { id: 'q6_38', question: '「たいよう」が出ている時は？', options: ['さむい', 'あかるい', 'くらい'], correct: 1, difficulty: 3, category: '自然' },
  { id: 'q6_39', question: '「よる」になると空は？', options: ['あかるい', 'くらい', 'みどり'], correct: 1, difficulty: 3, category: '自然' },
  { id: 'q6_40', question: '「かぜ」が吹くと？', options: ['あつくなる', 'うごく', 'とまる'], correct: 1, difficulty: 3, category: '自然' },
  
  // 乗り物
  { id: 'q6_41', question: '「でんしゃ」はどこを走る？', options: ['そら', 'せんろ', 'みず'], correct: 1, difficulty: 3, category: '乗り物' },
  { id: 'q6_42', question: '「ひこうき」はどこを飛ぶ？', options: ['そら', 'みず', 'ち'], correct: 0, difficulty: 3, category: '乗り物' },
  { id: 'q6_43', question: '「ふね」はどこを進む？', options: ['そら', 'みず', 'やま'], correct: 1, difficulty: 3, category: '乗り物' },
  { id: 'q6_44', question: '「じどうしゃ」はどこを走る？', options: ['そら', 'みち', 'みず'], correct: 1, difficulty: 3, category: '乗り物' },
  { id: 'q6_45', question: '「じてんしゃ」をこぐのは？', options: ['て', 'あし', 'あたま'], correct: 1, difficulty: 3, category: '乗り物' },
  
  // 時間
  { id: 'q6_46', question: '1日は何時間？', options: ['12時間', '24時間', '48時間'], correct: 1, difficulty: 4, category: '時間' },
  { id: 'q6_47', question: '1週間は何日？', options: ['5日', '7日', '10日'], correct: 1, difficulty: 4, category: '時間' },
  { id: 'q6_48', question: '「きのう」の次の日は？', options: ['きょう', 'あした', 'あさって'], correct: 0, difficulty: 4, category: '時間' },
  { id: 'q6_49', question: '「きょう」の次の日は？', options: ['きのう', 'あした', 'せんしゅう'], correct: 1, difficulty: 4, category: '時間' },
  { id: 'q6_50', question: '「あさ」の次は？', options: ['よる', 'ひる', 'ゆうがた'], correct: 1, difficulty: 4, category: '時間' }
];

// 9-11歳向け語彙問題（中学年）
const age9to11Questions: VocabularyQuestion[] = [
  // 語彙・意味
  { id: 'q9_1', question: '「勇敢」の意味は？', options: ['こわがり', '勇気がある', 'やさしい'], correct: 1, difficulty: 4, category: '性格' },
  { id: 'q9_2', question: '「探検」の意味は？', options: ['家にいること', '知らない場所を調べること', '勉強すること'], correct: 1, difficulty: 4, category: '行動' },
  { id: 'q9_3', question: '「協力」の意味は？', options: ['一人でやること', 'みんなで力を合わせること', '競争すること'], correct: 1, difficulty: 5, category: '行動' },
  { id: 'q9_4', question: '「発見」の意味は？', options: ['なくすこと', '新しく見つけること', '忘れること'], correct: 1, difficulty: 4, category: '行動' },
  { id: 'q9_5', question: '「努力」の意味は？', options: ['あきらめること', '一生懸命がんばること', '楽をすること'], correct: 1, difficulty: 5, category: '行動' },
  
  // 反対語
  { id: 'q9_6', question: '「成功」の反対は？', options: ['失敗', '努力', '挑戦'], correct: 0, difficulty: 4, category: '反対語' },
  { id: 'q9_7', question: '「始まり」の反対は？', options: ['途中', '終わり', '続き'], correct: 1, difficulty: 4, category: '反対語' },
  { id: 'q9_8', question: '「増える」の反対は？', options: ['変わる', '減る', '止まる'], correct: 1, difficulty: 4, category: '反対語' },
  { id: 'q9_9', question: '「賛成」の反対は？', options: ['反対', '同意', '相談'], correct: 0, difficulty: 4, category: '反対語' },
  { id: 'q9_10', question: '「進歩」の反対は？', options: ['変化', '後退', '発展'], correct: 1, difficulty: 5, category: '反対語' },
  
  // 類語・同義語
  { id: 'q9_11', question: '「美しい」と同じ意味は？', options: ['きれい', 'おもしろい', 'たのしい'], correct: 0, difficulty: 4, category: '類語' },
  { id: 'q9_12', question: '「大切」と同じ意味は？', options: ['便利', '重要', '簡単'], correct: 1, difficulty: 4, category: '類語' },
  { id: 'q9_13', question: '「困難」と同じ意味は？', options: ['簡単', '難しい', '楽しい'], correct: 1, difficulty: 5, category: '類語' },
  { id: 'q9_14', question: '「有名」と同じ意味は？', options: ['知られている', '珍しい', '新しい'], correct: 0, difficulty: 4, category: '類語' },
  { id: 'q9_15', question: '「完成」と同じ意味は？', options: ['始まり', '途中', '仕上がり'], correct: 2, difficulty: 5, category: '類語' },
  
  // 慣用句・ことわざ
  { id: 'q9_16', question: '「猫の手も借りたい」とは？', options: ['猫が好き', 'とても忙しい', '手が痛い'], correct: 1, difficulty: 6, category: '慣用句' },
  { id: 'q9_17', question: '「石の上にも三年」とは？', options: ['石が重い', '我慢強く続ける', '座るのが好き'], correct: 1, difficulty: 6, category: 'ことわざ' },
  { id: 'q9_18', question: '「頭を冷やす」とは？', options: ['シャンプーする', '帽子をかぶる', '冷静になる'], correct: 2, difficulty: 6, category: '慣用句' },
  { id: 'q9_19', question: '「早起きは三文の徳」とは？', options: ['朝は寒い', '早起きは良いこと', '三文もらえる'], correct: 1, difficulty: 6, category: 'ことわざ' },
  { id: 'q9_20', question: '「口が重い」とは？', options: ['口が痛い', 'あまり話さない', '食べ過ぎ'], correct: 1, difficulty: 6, category: '慣用句' },
  
  // 敬語・丁寧語
  { id: 'q9_21', question: '「食べる」の丁寧語は？', options: ['召し上がる', '食べます', 'いただく'], correct: 1, difficulty: 5, category: '敬語' },
  { id: 'q9_22', question: '「見る」の丁寧語は？', options: ['ご覧になる', '見ます', '拝見する'], correct: 1, difficulty: 5, category: '敬語' },
  { id: 'q9_23', question: '「言う」の丁寧語は？', options: ['おっしゃる', '言います', '申す'], correct: 1, difficulty: 5, category: '敬語' },
  { id: 'q9_24', question: '「来る」の丁寧語は？', options: ['いらっしゃる', '来ます', '参る'], correct: 1, difficulty: 5, category: '敬語' },
  { id: 'q9_25', question: '「行く」の丁寧語は？', options: ['いらっしゃる', '行きます', '参る'], correct: 1, difficulty: 5, category: '敬語' },
  
  // 漢字の読み
  { id: 'q9_26', question: '「美術」の読み方は？', options: ['びじゅつ', 'みじゅつ', 'うつくしいじゅつ'], correct: 0, difficulty: 4, category: '漢字' },
  { id: 'q9_27', question: '「図書」の読み方は？', options: ['としょ', 'ずしょ', 'とうしょ'], correct: 0, difficulty: 4, category: '漢字' },
  { id: 'q9_28', question: '「音楽」の読み方は？', options: ['おとがく', 'おんがく', 'いんがく'], correct: 1, difficulty: 4, category: '漢字' },
  { id: 'q9_29', question: '「算数」の読み方は？', options: ['さんすう', 'けいすう', 'そろばん'], correct: 0, difficulty: 4, category: '漢字' },
  { id: 'q9_30', question: '「理科」の読み方は？', options: ['りが', 'りか', 'りこう'], correct: 1, difficulty: 4, category: '漢字' },
  
  // 文学・物語
  { id: 'q9_31', question: '「主人公」とは？', options: ['家の主人', '物語の中心人物', '校長先生'], correct: 1, difficulty: 5, category: '文学' },
  { id: 'q9_32', question: '「あらすじ」とは？', options: ['細かい内容', '大まかな内容', '感想'], correct: 1, difficulty: 5, category: '文学' },
  { id: 'q9_33', question: '「詩」とは？', options: ['長い文章', '短くて美しい文', '説明文'], correct: 1, difficulty: 5, category: '文学' },
  { id: 'q9_34', question: '「作者」とは？', options: ['本を読む人', '本を書いた人', '本を売る人'], correct: 1, difficulty: 4, category: '文学' },
  { id: 'q9_35', question: '「結末」とは？', options: ['物語の始まり', '物語の途中', '物語の終わり'], correct: 2, difficulty: 5, category: '文学' },
  
  // 科学・自然
  { id: 'q9_36', question: '「昆虫」の特徴は？', options: ['足が4本', '足が6本', '足が8本'], correct: 1, difficulty: 5, category: '科学' },
  { id: 'q9_37', question: '「植物」が育つのに必要なものは？', options: ['音楽', '太陽の光', '電気'], correct: 1, difficulty: 4, category: '科学' },
  { id: 'q9_38', question: '「磁石」がくっつくものは？', options: ['木', '鉄', 'プラスチック'], correct: 1, difficulty: 4, category: '科学' },
  { id: 'q9_39', question: '「蒸発」とは？', options: ['氷になること', '水が水蒸気になること', '雨が降ること'], correct: 1, difficulty: 5, category: '科学' },
  { id: 'q9_40', question: '「化石」とは？', options: ['新しい石', '昔の生き物の跡', '人工の石'], correct: 1, difficulty: 5, category: '科学' },
  
  // 社会・地理
  { id: 'q9_41', question: '「都道府県」は全部でいくつ？', options: ['45', '47', '50'], correct: 1, difficulty: 5, category: '社会' },
  { id: 'q9_42', question: '日本の首都は？', options: ['大阪', '東京', '京都'], correct: 1, difficulty: 4, category: '社会' },
  { id: 'q9_43', question: '「国会」とは？', options: ['会社の会議', '国の政治を決める場所', '学校の集会'], correct: 1, difficulty: 6, category: '社会' },
  { id: 'q9_44', question: '「輸出」とは？', options: ['外国から買うこと', '外国に売ること', '国内で売ること'], correct: 1, difficulty: 6, category: '社会' },
  { id: 'q9_45', question: '「伝統」とは？', options: ['新しいもの', '昔から続いているもの', '外国のもの'], correct: 1, difficulty: 5, category: '社会' },
  
  // 数学・計算
  { id: 'q9_46', question: '「平均」とは？', options: ['一番大きい数', '全部を足して割った数', '一番小さい数'], correct: 1, difficulty: 5, category: '数学' },
  { id: 'q9_47', question: '「面積」とは？', options: ['長さ', '広さ', '重さ'], correct: 1, difficulty: 4, category: '数学' },
  { id: 'q9_48', question: '「割合」を表すときに使う記号は？', options: ['%', '&', '#'], correct: 0, difficulty: 5, category: '数学' },
  { id: 'q9_49', question: '三角形の角の数は？', options: ['2個', '3個', '4個'], correct: 1, difficulty: 4, category: '数学' },
  { id: 'q9_50', question: '「直角」は何度？', options: ['45度', '90度', '180度'], correct: 1, difficulty: 5, category: '数学' }
];

// 12-15歳向け語彙問題（高学年〜中学生）
const age12to15Questions: VocabularyQuestion[] = [
  // 高度な語彙
  { id: 'q12_1', question: '「懐疑的」の意味は？', options: ['疑いを持つこと', '信じきること', '無関心なこと'], correct: 0, difficulty: 7, category: '高度語彙' },
  { id: 'q12_2', question: '「客観的」の意味は？', options: ['個人的な見方', '第三者の立場での見方', '感情的な見方'], correct: 1, difficulty: 7, category: '高度語彙' },
  { id: 'q12_3', question: '「抽象的」の意味は？', options: ['具体的でない', 'はっきりしている', '目に見える'], correct: 0, difficulty: 7, category: '高度語彙' },
  { id: 'q12_4', question: '「論理的」の意味は？', options: ['感情的', '筋道が通っている', '複雑'], correct: 1, difficulty: 6, category: '高度語彙' },
  { id: 'q12_5', question: '「効率的」の意味は？', options: ['時間がかかる', '無駄がない', '複雑'], correct: 1, difficulty: 6, category: '高度語彙' },
  
  // 科学・技術
  { id: 'q12_6', question: '「生態系」とは何のこと？', options: ['生き物の体のしくみ', '生き物とその環境の関係', '生き物の進化'], correct: 1, difficulty: 8, category: '科学' },
  { id: 'q12_7', question: '「光合成」を行うのは？', options: ['動物', '植物', '鉱物'], correct: 1, difficulty: 6, category: '科学' },
  { id: 'q12_8', question: '「遺伝」とは？', options: ['病気になること', '親の特徴が子に伝わること', '成長すること'], correct: 1, difficulty: 7, category: '科学' },
  { id: 'q12_9', question: '「重力」とは？', options: ['物を軽くする力', '物を引っ張る力', '物を押す力'], correct: 1, difficulty: 6, category: '科学' },
  { id: 'q12_10', question: '「摩擦」とは？', options: ['物が滑りやすくなること', '物がこすれ合う抵抗', '物が軽くなること'], correct: 1, difficulty: 6, category: '科学' },
  
  // 社会・歴史
  { id: 'q12_11', question: '「民主主義」とは？', options: ['一人が決める政治', '国民が参加する政治', '外国が決める政治'], correct: 1, difficulty: 7, category: '社会' },
  { id: 'q12_12', question: '「憲法」とは？', options: ['普通の法律', '国の基本的な法律', '外国の法律'], correct: 1, difficulty: 7, category: '社会' },
  { id: 'q12_13', question: '「グローバル化」とは？', options: ['国が小さくなること', '世界がつながること', '国が増えること'], correct: 1, difficulty: 7, category: '社会' },
  { id: 'q12_14', question: '「産業革命」が起こったのは？', options: ['古代', '江戸時代', '近世〜近代'], correct: 2, difficulty: 8, category: '歴史' },
  { id: 'q12_15', question: '「平安時代」に栄えた文学は？', options: ['源氏物語', '万葉集', '古事記'], correct: 0, difficulty: 7, category: '歴史' },
  
  // 文学・言語
  { id: 'q12_16', question: '「比喩」とは？', options: ['事実を述べること', 'たとえて表現すること', '反対の意味で表現すること'], correct: 1, difficulty: 6, category: '文学' },
  { id: 'q12_17', question: '「皮肉」とは？', options: ['素直に褒めること', '反対の意味で表現すること', 'たとえて言うこと'], correct: 1, difficulty: 7, category: '文学' },
  { id: 'q12_18', question: '「韻律」とは？', options: ['詩のリズム', '文章の長さ', '言葉の意味'], correct: 0, difficulty: 7, category: '文学' },
  { id: 'q12_19', question: '「随筆」とは？', options: ['物語', '自由に書いた文章', '詩'], correct: 1, difficulty: 6, category: '文学' },
  { id: 'q12_20', question: '「敬語」の種類で正しいのは？', options: ['尊敬語・謙譲語・丁寧語', '過去語・現在語・未来語', '主語・述語・目的語'], correct: 0, difficulty: 6, category: '言語' },
  
  // 心理・哲学
  { id: 'q12_21', question: '「共感」とは？', options: ['相手を批判すること', '相手の気持ちを理解すること', '相手を無視すること'], correct: 1, difficulty: 6, category: '心理' },
  { id: 'q12_22', question: '「偏見」とは？', options: ['正しい判断', '一方的な見方', '客観的な意見'], correct: 1, difficulty: 7, category: '心理' },
  { id: 'q12_23', question: '「アイデンティティ」とは？', options: ['他人になること', '自分らしさ', '有名になること'], correct: 1, difficulty: 8, category: '心理' },
  { id: 'q12_24', question: '「ストレス」とは？', options: ['楽しい気持ち', '心や体にかかる負担', '元気な状態'], correct: 1, difficulty: 6, category: '心理' },
  { id: 'q12_25', question: '「コミュニケーション」とは？', options: ['一人で考えること', '相手と意思を伝え合うこと', '勉強すること'], correct: 1, difficulty: 6, category: '心理' },
  
  // 経済・社会制度
  { id: 'q12_26', question: '「市場経済」とは？', options: ['国が全部決める経済', '需要と供給で決まる経済', '外国が決める経済'], correct: 1, difficulty: 8, category: '経済' },
  { id: 'q12_27', question: '「税金」の役割は？', options: ['個人の貯金', '公共サービスの財源', '会社の利益'], correct: 1, difficulty: 6, category: '経済' },
  { id: 'q12_28', question: '「インフレーション」とは？', options: ['物価が下がること', '物価が上がること', '物価が変わらないこと'], correct: 1, difficulty: 8, category: '経済' },
  { id: 'q12_29', question: '「社会保障」とは？', options: ['会社の保険', '国民の生活を守る制度', '外国との約束'], correct: 1, difficulty: 7, category: '社会' },
  { id: 'q12_30', question: '「持続可能」とは？', options: ['短期間だけ続く', '長期間続けられる', '今だけ良い'], correct: 1, difficulty: 7, category: '社会' },
  
  // 国際・文化
  { id: 'q12_31', question: '「多様性」とは？', options: ['同じであること', 'いろいろな違いがあること', '一つしかないこと'], correct: 1, difficulty: 7, category: '文化' },
  { id: 'q12_32', question: '「国際協力」とは？', options: ['国同士が争うこと', '国同士が協力すること', '一国だけで行うこと'], correct: 1, difficulty: 6, category: '国際' },
  { id: 'q12_33', question: '「文化遺産」とは？', options: ['新しく作ったもの', '昔から受け継がれた文化', '外国のもの'], correct: 1, difficulty: 6, category: '文化' },
  { id: 'q12_34', question: '「人権」とは？', options: ['特別な人だけの権利', '全ての人が持つ基本的権利', '大人だけの権利'], correct: 1, difficulty: 7, category: '社会' },
  { id: 'q12_35', question: '「国際連合」の目的は？', options: ['戦争をすること', '世界平和を保つこと', '貿易をすること'], correct: 1, difficulty: 7, category: '国際' },
  
  // 技術・情報
  { id: 'q12_36', question: '「デジタル」の反対は？', options: ['アナログ', 'バーチャル', 'マニュアル'], correct: 0, difficulty: 6, category: '技術' },
  { id: 'q12_37', question: '「アルゴリズム」とは？', options: ['コンピューターの部品', '問題を解く手順', 'プログラムの名前'], correct: 1, difficulty: 8, category: '技術' },
  { id: 'q12_38', question: '「人工知能（AI）」とは？', options: ['人間の脳', 'コンピューターが考える技術', 'ロボットの体'], correct: 1, difficulty: 7, category: '技術' },
  { id: 'q12_39', question: '「データベース」とは？', options: ['情報を整理して保存する仕組み', 'コンピューターゲーム', 'インターネットの会社'], correct: 0, difficulty: 7, category: '技術' },
  { id: 'q12_40', question: '「プログラミング」とは？', options: ['コンピューターを修理すること', 'コンピューターに指示を出すこと', 'コンピューターを買うこと'], correct: 1, difficulty: 6, category: '技術' },
  
  // 環境・自然
  { id: 'q12_41', question: '「温室効果」とは？', options: ['地球が冷えること', '地球が温まること', '雨が降ること'], correct: 1, difficulty: 7, category: '環境' },
  { id: 'q12_42', question: '「生物多様性」とは？', options: ['生き物の種類が少ないこと', '生き物の種類が豊かなこと', '生き物がいないこと'], correct: 1, difficulty: 8, category: '環境' },
  { id: 'q12_43', question: '「再生可能エネルギー」の例は？', options: ['石油', '太陽光発電', '石炭'], correct: 1, difficulty: 7, category: '環境' },
  { id: 'q12_44', question: '「食物連鎖」とは？', options: ['食べ物の作り方', '生き物が食べ食べられる関係', '料理のレシピ'], correct: 1, difficulty: 7, category: '環境' },
  { id: 'q12_45', question: '「リサイクル」の目的は？', options: ['新しいものを作ること', '資源を無駄にしないこと', 'ゴミを増やすこと'], correct: 1, difficulty: 6, category: '環境' },
  
  // 芸術・表現
  { id: 'q12_46', question: '「抽象画」とは？', options: ['写真のような絵', '具体的でない表現の絵', '風景画'], correct: 1, difficulty: 7, category: '芸術' },
  { id: 'q12_47', question: '「交響曲」とは？', options: ['一人で演奏する曲', 'オーケストラが演奏する大きな曲', '歌だけの曲'], correct: 1, difficulty: 7, category: '芸術' },
  { id: 'q12_48', question: '「建築」において重要なのは？', options: ['色だけ', '機能と美しさ', '大きさだけ'], correct: 1, difficulty: 6, category: '芸術' },
  { id: 'q12_49', question: '「デザイン」とは？', options: ['絵を描くこと', '目的に応じて設計すること', '色を塗ること'], correct: 1, difficulty: 6, category: '芸術' },
  { id: 'q12_50', question: '「パフォーマンス」とは？', options: ['静止した作品', '時間の中で展開する表現', '絵画作品'], correct: 1, difficulty: 6, category: '芸術' }
];

export const vocabularyDatabase: AgeGroupQuestions[] = [
  {
    ageGroup: '6-8歳（低学年）',
    ageRange: { min: 6, max: 8 },
    questions: age6to8Questions
  },
  {
    ageGroup: '9-11歳（中学年）',
    ageRange: { min: 9, max: 11 },
    questions: age9to11Questions
  },
  {
    ageGroup: '12-15歳（高学年〜中学生）',
    ageRange: { min: 12, max: 15 },
    questions: age12to15Questions
  }
];

// ランダムに問題を選択する関数（年齢別漢字フィルタリング対応）
export function getRandomQuestions(age: number, count: number = 10): VocabularyQuestion[] {
  const ageGroup = vocabularyDatabase.find(group => 
    age >= group.ageRange.min && age <= group.ageRange.max
  );
  
  if (!ageGroup) {
    // 範囲外の場合は最も近い年齢グループを選択
    if (age < 6) {
      return getRandomQuestions(6, count);
    } else {
      return getRandomQuestions(15, count);
    }
  }
  
  const gradeLevel = ageToGradeLevel(age);
  const allQuestions = [...ageGroup.questions];
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  
  // 年齢に適した漢字でフィルタリング
  const filteredQuestions = shuffled.map(question => {
    const filteredQuestion = filterTextForGrade(question.question, {
      gradeLevel,
      allowHiragana: true,
      allowKatakana: true,
      strictMode: true
    });
    
    const filteredOptions = question.options.map(option =>
      filterTextForGrade(option, {
        gradeLevel,
        allowHiragana: true,
        allowKatakana: true,
        strictMode: true
      })
    );
    
    return {
      ...question,
      originalQuestion: question.question,
      originalOptions: question.options,
      question: filteredQuestion,
      options: filteredOptions
    };
  });
  
  return filteredQuestions.slice(0, count);
}

// 問題統計を取得する関数
export function getQuestionStatistics() {
  return vocabularyDatabase.map(group => ({
    ageGroup: group.ageGroup,
    totalQuestions: group.questions.length,
    categories: Array.from(new Set(group.questions.map(q => q.category))),
    averageDifficulty: Math.round(
      group.questions.reduce((sum, q) => sum + q.difficulty, 0) / group.questions.length * 10
    ) / 10
  }));
}