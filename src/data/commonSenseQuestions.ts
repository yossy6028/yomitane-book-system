import { filterTextForGrade, ageToGradeLevel } from '../utils/kanjiFilter';

export interface CommonSenseQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  difficulty: number;
  category: string;
  explanation?: string;
  originalQuestion?: string;
  originalOptions?: string[];
  originalExplanation?: string;
}

export interface AgeGroupCommonSenseQuestions {
  ageGroup: string;
  ageRange: { min: number; max: number };
  questions: CommonSenseQuestion[];
}

// 6-8歳向け常識問題（低学年）
const age6to8CommonSenseQuestions: CommonSenseQuestion[] = [
  // 社会常識・マナー
  { id: 'cs6_1', question: '電車の中では何をするのが正しい？', options: ['大きな声でしゃべる', '静かにする', '走り回る'], correct: 1, difficulty: 3, category: 'マナー', explanation: '電車の中では他の人の迷惑にならないよう静かにしましょう' },
  { id: 'cs6_2', question: '人にものをもらった時は何と言う？', options: ['いらない', 'ありがとう', '当たり前'], correct: 1, difficulty: 2, category: 'マナー', explanation: 'ものをもらったら感謝の気持ちを込めて「ありがとう」と言います' },
  { id: 'cs6_3', question: '図書館では何をするのが正しい？', options: ['静かに本を読む', '友達と大声で話す', '走り回る'], correct: 0, difficulty: 3, category: 'マナー', explanation: '図書館は静かに本を読む場所です' },
  { id: 'cs6_4', question: '横断歩道を渡る時は？', options: ['赤信号で渡る', '青信号で渡る', '信号を見ない'], correct: 1, difficulty: 2, category: '安全', explanation: '交通安全のため、青信号で左右を確認して渡りましょう' },
  { id: 'cs6_5', question: '友達が転んで泣いている時は？', options: ['笑う', '無視する', '大丈夫か聞く'], correct: 2, difficulty: 3, category: '思いやり', explanation: '困っている人がいたら心配して声をかけてあげましょう' },
  
  // 心情理解
  { id: 'cs6_6', question: '友達が誕生日プレゼントをくれた時の気持ちは？', options: ['悲しい', 'うれしい', 'おこる'], correct: 1, difficulty: 2, category: '感情', explanation: 'プレゼントをもらうとうれしい気持ちになります' },
  { id: 'cs6_7', question: '大切なおもちゃを壊された時の気持ちは？', options: ['うれしい', 'かなしい', 'たのしい'], correct: 1, difficulty: 2, category: '感情', explanation: '大切なものを壊されると悲しい気持ちになります' },
  { id: 'cs6_8', question: 'テストで100点を取った時の気持ちは？', options: ['かなしい', 'うれしい', 'こわい'], correct: 1, difficulty: 2, category: '感情', explanation: '良い結果が出ると嬉しい気持ちになります' },
  { id: 'cs6_9', question: '友達とけんかをした後の気持ちは？', options: ['すっきり', 'もやもや', 'わくわく'], correct: 1, difficulty: 3, category: '感情', explanation: 'けんかをするといやな気持ちになります' },
  { id: 'cs6_10', question: '新しい友達ができた時の気持ちは？', options: ['さみしい', 'うれしい', 'つまらない'], correct: 1, difficulty: 2, category: '感情', explanation: '新しい友達ができると嬉しくなります' },
  
  // 基本的なルール・常識
  { id: 'cs6_11', question: '朝起きたら最初にすることは？', options: ['ゲームをする', 'おはようと言う', '怒る'], correct: 1, difficulty: 2, category: '生活', explanation: '朝起きたら家族に「おはよう」とあいさつしましょう' },
  { id: 'cs6_12', question: '食事の前にすることは？', options: ['手を洗う', 'テレビを見る', '寝る'], correct: 0, difficulty: 2, category: '生活', explanation: '食事の前は手をきれいに洗いましょう' },
  { id: 'cs6_13', question: '夜寝る前にすることは？', options: ['歯をみがく', 'お菓子を食べる', '外で遊ぶ'], correct: 0, difficulty: 2, category: '生活', explanation: '寝る前は歯をみがいて口の中をきれいにしましょう' },
  { id: 'cs6_14', question: '雨の日の外出で必要なものは？', options: ['水着', 'かさ', 'サングラス'], correct: 1, difficulty: 2, category: '生活', explanation: '雨の日は濡れないようにかさを持ちましょう' },
  { id: 'cs6_15', question: '病気の時はどうする？', options: ['外で遊ぶ', '無理をしない', 'たくさん食べる'], correct: 1, difficulty: 3, category: '健康', explanation: '病気の時は体を休めて無理をしないことが大切です' },
  
  // 人間関係・協調性
  { id: 'cs6_16', question: '友達がいやがることをしてしまった時は？', options: ['知らんぷりする', 'ごめんなさいと言う', '逃げる'], correct: 1, difficulty: 3, category: '人間関係', explanation: '悪いことをしたら素直に謝りましょう' },
  { id: 'cs6_17', question: 'みんなで遊んでいる時、一人だけ仲間に入れない子がいたら？', options: ['無視する', '一緒に遊ぼうと声をかける', '笑う'], correct: 1, difficulty: 4, category: '人間関係', explanation: '一人でいる子には優しく声をかけてあげましょう' },
  { id: 'cs6_18', question: '順番を待っている時は？', options: ['割り込む', '静かに待つ', '文句を言う'], correct: 1, difficulty: 3, category: '人間関係', explanation: '順番は守って静かに待ちましょう' },
  { id: 'cs6_19', question: '友達と意見が違う時は？', options: ['けんかする', '話し合う', '無視する'], correct: 1, difficulty: 4, category: '人間関係', explanation: '意見が違っても話し合いで解決しましょう' },
  { id: 'cs6_20', question: '困っている人を見つけた時は？', options: ['見て見ぬふりをする', '手伝う', '笑う'], correct: 1, difficulty: 3, category: '人間関係', explanation: '困っている人がいたら手伝ってあげましょう' },
  
  // 季節・行事
  { id: 'cs6_21', question: 'お正月に食べるものは？', options: ['ケーキ', 'おせち料理', 'バーベキュー'], correct: 1, difficulty: 3, category: '行事', explanation: 'お正月にはおせち料理を食べる習慣があります' },
  { id: 'cs6_22', question: 'クリスマスの時期は？', options: ['夏', '冬', '春'], correct: 1, difficulty: 2, category: '行事', explanation: 'クリスマスは12月、冬の行事です' },
  { id: 'cs6_23', question: '桜が咲く季節は？', options: ['春', '夏', '冬'], correct: 0, difficulty: 2, category: '季節', explanation: '桜は春に咲きます' },
  { id: 'cs6_24', question: '海水浴をするのはいつ？', options: ['冬', '夏', '秋'], correct: 1, difficulty: 2, category: '季節', explanation: '暑い夏に海水浴を楽しみます' },
  { id: 'cs6_25', question: '運動会が多い季節は？', options: ['夏', '秋', '冬'], correct: 1, difficulty: 3, category: '行事', explanation: '涼しくなった秋に運動会をすることが多いです' },
  
  // 安全・健康
  { id: 'cs6_26', question: '知らない人についていってはいけないのはなぜ？', options: ['楽しくないから', '危険だから', 'つまらないから'], correct: 1, difficulty: 4, category: '安全', explanation: '知らない人についていくのは危険です' },
  { id: 'cs6_27', question: '薬を飲む時は？', options: ['好きなだけ飲む', '大人と一緒に飲む', '友達にあげる'], correct: 1, difficulty: 3, category: '健康', explanation: '薬は大人と一緒に正しく飲みましょう' },
  { id: 'cs6_28', question: '火を見つけた時は？', options: ['触る', '大人に知らせる', '近づく'], correct: 1, difficulty: 3, category: '安全', explanation: '火は危険なので大人に知らせましょう' },
  { id: 'cs6_29', question: '暗い道を歩く時は？', options: ['一人で歩く', '大人と一緒に歩く', '走る'], correct: 1, difficulty: 3, category: '安全', explanation: '暗い道は大人と一緒に歩きましょう' },
  { id: 'cs6_30', question: '野菜を食べるのはなぜ？', options: ['おいしいから', '体に良いから', '安いから'], correct: 1, difficulty: 3, category: '健康', explanation: '野菜は体に必要な栄養がたくさん入っています' },
  
  // 家族・家庭
  { id: 'cs6_31', question: '家族が病気の時は？', options: ['うるさくする', '静かにする', '遊びに行く'], correct: 1, difficulty: 3, category: '家庭', explanation: '病気の人は静かに休ませてあげましょう' },
  { id: 'cs6_32', question: 'お手伝いを頼まれた時は？', options: ['いやがる', '手伝う', '逃げる'], correct: 1, difficulty: 3, category: '家庭', explanation: '家族のお手伝いは積極的にしましょう' },
  { id: 'cs6_33', question: '使ったものはどうする？', options: ['そのまま', '片付ける', '隠す'], correct: 1, difficulty: 2, category: '家庭', explanation: '使ったものは元の場所に片付けましょう' },
  { id: 'cs6_34', question: '家族と出かける時は？', options: ['勝手に行く', '一緒に行く', '家にいる'], correct: 1, difficulty: 2, category: '家庭', explanation: '家族との時間を大切にしましょう' },
  { id: 'cs6_35', question: 'おじいちゃん、おばあちゃんには？', options: ['冷たくする', '優しくする', '無視する'], correct: 1, difficulty: 2, category: '家庭', explanation: 'お年寄りには優しく接しましょう' },
  
  // 学校生活
  { id: 'cs6_36', question: '先生の話を聞く時は？', options: ['おしゃべりする', '静かに聞く', '寝る'], correct: 1, difficulty: 2, category: '学校', explanation: '先生の話は静かに聞きましょう' },
  { id: 'cs6_37', question: '宿題は？', options: ['やらない', 'きちんとやる', '友達にやってもらう'], correct: 1, difficulty: 2, category: '学校', explanation: '宿題は自分できちんとやりましょう' },
  { id: 'cs6_38', question: '友達の消しゴムを借りた時は？', options: ['返さない', 'ちゃんと返す', '隠す'], correct: 1, difficulty: 2, category: '学校', explanation: '借りたものは必ず返しましょう' },
  { id: 'cs6_39', question: '掃除の時間は？', options: ['遊ぶ', 'みんなで掃除する', '隠れる'], correct: 1, difficulty: 2, category: '学校', explanation: 'みんなで協力して掃除しましょう' },
  { id: 'cs6_40', question: '給食は？', options: ['好きなものだけ食べる', 'バランスよく食べる', '食べない'], correct: 1, difficulty: 3, category: '学校', explanation: '給食はバランスよく食べましょう' },
  
  // 環境・自然
  { id: 'cs6_41', question: 'ゴミはどうする？', options: ['そのまま捨てる', 'ゴミ箱に捨てる', '道に捨てる'], correct: 1, difficulty: 2, category: '環境', explanation: 'ゴミは決められた場所に捨てましょう' },
  { id: 'cs6_42', question: '花や木は？', options: ['折る', '大切にする', '蹴る'], correct: 1, difficulty: 2, category: '環境', explanation: '自然の花や木は大切にしましょう' },
  { id: 'cs6_43', question: '水を使った後は？', options: ['出しっぱなし', '蛇口を閉める', 'そのまま'], correct: 1, difficulty: 2, category: '環境', explanation: '水は大切に使って蛇口を閉めましょう' },
  { id: 'cs6_44', question: '電気をつけっぱなしにするのは？', options: ['良い', 'もったいない', 'かっこいい'], correct: 1, difficulty: 3, category: '環境', explanation: '使わない電気はもったいないので消しましょう' },
  { id: 'cs6_45', question: '虫を見つけた時は？', options: ['殺す', 'そっとしておく', 'いじめる'], correct: 1, difficulty: 3, category: '環境', explanation: '小さな虫も大切な命です' },
  
  // 時間・約束
  { id: 'cs6_46', question: '約束の時間は？', options: ['遅れても良い', '守る', '忘れても良い'], correct: 1, difficulty: 3, category: '約束', explanation: '約束の時間は守りましょう' },
  { id: 'cs6_47', question: '友達との約束は？', options: ['破っても良い', '守る', '忘れる'], correct: 1, difficulty: 3, category: '約束', explanation: '友達との約束は大切に守りましょう' },
  { id: 'cs6_48', question: '早寝早起きは？', options: ['体に悪い', '体に良い', '関係ない'], correct: 1, difficulty: 3, category: '生活', explanation: '早寝早起きは健康的な生活の基本です' },
  { id: 'cs6_49', question: '朝ごはんは？', options: ['食べなくても良い', '食べる', '夜食べる'], correct: 1, difficulty: 2, category: '生活', explanation: '朝ごはんを食べて元気に一日を始めましょう' },
  { id: 'cs6_50', question: '本を読むのは？', options: ['つまらない', '良いこと', '無駄'], correct: 1, difficulty: 3, category: '学習', explanation: '本を読むと知識が増えて想像力も育ちます' }
];

// 9-11歳向け常識問題（中学年）
const age9to11CommonSenseQuestions: CommonSenseQuestion[] = [
  // 社会常識・マナー
  { id: 'cs9_1', question: '公共の場でのマナーとして正しいのは？', options: ['大声で話す', '他人に迷惑をかけない', '好きなように振る舞う'], correct: 1, difficulty: 4, category: 'マナー', explanation: '公共の場では他人の迷惑にならないよう配慮が必要です' },
  { id: 'cs9_2', question: 'エレベーターに乗る時のマナーは？', options: ['先に降りる人を待つ', '先に乗る', '押し合う'], correct: 0, difficulty: 4, category: 'マナー', explanation: '降りる人が先、乗る人は後が基本マナーです' },
  { id: 'cs9_3', question: '食事中のマナーで大切なことは？', options: ['早く食べる', '音を立てて食べる', '口を閉じて食べる'], correct: 2, difficulty: 4, category: 'マナー', explanation: '食事中は口を閉じて静かに食べるのがマナーです' },
  { id: 'cs9_4', question: '目上の人と話す時は？', options: ['敬語を使う', 'ため口で話す', '無視する'], correct: 0, difficulty: 5, category: 'マナー', explanation: '目上の人には敬語を使って丁寧に話しましょう' },
  { id: 'cs9_5', question: '謝罪する時に大切なことは？', options: ['言い訳をする', '素直に謝る', '相手のせいにする'], correct: 1, difficulty: 4, category: 'マナー', explanation: '悪いことをしたら素直に謝ることが大切です' },
  
  // 心情理解・共感力
  { id: 'cs9_6', question: '友達が悩んでいる時、最初にすべきことは？', options: ['アドバイスする', '話を聞く', '励ます'], correct: 1, difficulty: 5, category: '共感', explanation: 'まずは相手の話をよく聞いて気持ちを理解することが大切です' },
  { id: 'cs9_7', question: '友達が失敗して落ち込んでいる時は？', options: ['笑う', '慰める', '批判する'], correct: 1, difficulty: 4, category: '共感', explanation: '落ち込んでいる人には優しく慰めの言葉をかけましょう' },
  { id: 'cs9_8', question: '自分の意見と違う意見を聞いた時は？', options: ['否定する', '理解しようとする', '無視する'], correct: 1, difficulty: 5, category: '共感', explanation: '違う意見も理解しようとすることで視野が広がります' },
  { id: 'cs9_9', question: '友達が嫌がることをしてしまった時の気持ちは？', options: ['すっきり', '反省', '誇らしい'], correct: 1, difficulty: 4, category: '感情', explanation: '人に嫌なことをしたら反省の気持ちを持ちましょう' },
  { id: 'cs9_10', question: 'チームワークで大切なことは？', options: ['自分だけ頑張る', 'みんなで協力する', '他人任せにする'], correct: 1, difficulty: 4, category: '協調性', explanation: 'チームでは一人一人が協力することが大切です' },
  
  // 道徳・価値観
  { id: 'cs9_11', question: '嘘をつくことについて正しいのは？', options: ['時には必要', '基本的には良くない', '問題ない'], correct: 1, difficulty: 5, category: '道徳', explanation: '嘘は信頼関係を壊すので基本的には良くありません' },
  { id: 'cs9_12', question: '正義とは何？', options: ['強い者が正しい', '公平で正しいこと', '自分の都合'], correct: 1, difficulty: 6, category: '道徳', explanation: '正義とは公平で正しいことを意味します' },
  { id: 'cs9_13', question: '友情で最も大切なことは？', options: ['お金', '信頼', '見た目'], correct: 1, difficulty: 4, category: '道徳', explanation: '友情では互いの信頼が最も大切です' },
  { id: 'cs9_14', question: '他人のものを勝手に使うことは？', options: ['問題ない', '良くない', '時には良い'], correct: 1, difficulty: 3, category: '道徳', explanation: '他人のものは許可なく使ってはいけません' },
  { id: 'cs9_15', question: '困っている人を助けることは？', options: ['面倒なこと', '良いこと', '損なこと'], correct: 1, difficulty: 3, category: '道徳', explanation: '困っている人を助けるのは素晴らしいことです' },
  
  // 社会の仕組み
  { id: 'cs9_16', question: '税金の役割は？', options: ['政府のお小遣い', '公共サービスの財源', '無駄なもの'], correct: 1, difficulty: 6, category: '社会', explanation: '税金は学校や道路などの公共サービスに使われます' },
  { id: 'cs9_17', question: '選挙の意味は？', options: ['ゲーム', '代表者を選ぶこと', '競争'], correct: 1, difficulty: 5, category: '社会', explanation: '選挙は国民の代表者を選ぶ大切な制度です' },
  { id: 'cs9_18', question: '法律の役割は？', options: ['社会の秩序を保つ', '人を困らせる', '政府の権力'], correct: 0, difficulty: 6, category: '社会', explanation: '法律は社会の秩序を保ち、みんなが安全に暮らすためにあります' },
  { id: 'cs9_19', question: '職業に貴賤はあるか？', options: ['ある', 'ない', 'どちらでもない'], correct: 1, difficulty: 6, category: '社会', explanation: 'どの職業も社会に必要で、貴賤はありません' },
  { id: 'cs9_20', question: '民主主義の基本原理は？', options: ['強者が支配', 'みんなで決める', '一人が決める'], correct: 1, difficulty: 6, category: '社会', explanation: '民主主義はみんなで話し合って決める制度です' },
  
  // 環境・持続可能性
  { id: 'cs9_21', question: 'リサイクルの目的は？', options: ['お金儲け', '資源の有効活用', 'ゴミを増やす'], correct: 1, difficulty: 4, category: '環境', explanation: 'リサイクルは限りある資源を有効活用するためです' },
  { id: 'cs9_22', question: '地球温暖化の主な原因は？', options: ['太陽が熱くなった', '人間の活動', '自然現象'], correct: 1, difficulty: 5, category: '環境', explanation: '地球温暖化は主に人間の活動による温室効果ガスが原因です' },
  { id: 'cs9_23', question: '節水が大切な理由は？', options: ['水が無限にある', '水は限りある資源', '関係ない'], correct: 1, difficulty: 4, category: '環境', explanation: '水は限りある大切な資源なので節水が重要です' },
  { id: 'cs9_24', question: '自然保護が必要な理由は？', options: ['きれいだから', '生態系のバランス', '邪魔だから'], correct: 1, difficulty: 5, category: '環境', explanation: '自然保護は生態系のバランスを保つために必要です' },
  { id: 'cs9_25', question: '省エネルギーの意味は？', options: ['エネルギーを無駄遣い', 'エネルギーを節約', 'エネルギーを増やす'], correct: 1, difficulty: 4, category: '環境', explanation: '省エネルギーはエネルギーを大切に使うことです' },
  
  // 健康・安全
  { id: 'cs9_26', question: 'バランスの良い食事とは？', options: ['好きなものだけ', '栄養のバランスを考える', '量だけ多い'], correct: 1, difficulty: 4, category: '健康', explanation: 'バランスの良い食事は様々な栄養素をバランスよく取ることです' },
  { id: 'cs9_27', question: '運動が体に良い理由は？', options: ['疲れるから', '筋肉や心肺機能が鍛えられる', '時間つぶし'], correct: 1, difficulty: 4, category: '健康', explanation: '運動は筋肉や心肺機能を鍛えて健康を保ちます' },
  { id: 'cs9_28', question: 'ネットいじめについて正しいのは？', options: ['問題ない', '深刻な問題', '現実と関係ない'], correct: 1, difficulty: 5, category: '安全', explanation: 'ネットいじめは心に深い傷を与える深刻な問題です' },
  { id: 'cs9_29', question: '個人情報を守ることが大切な理由は？', options: ['面倒だから', '悪用される危険性', '関係ない'], correct: 1, difficulty: 5, category: '安全', explanation: '個人情報は悪用される危険性があるので守る必要があります' },
  { id: 'cs9_30', question: 'いじめを見つけた時にすべきことは？', options: ['見て見ぬふり', '大人に相談', '面白がる'], correct: 1, difficulty: 5, category: '安全', explanation: 'いじめを見つけたら大人に相談することが大切です' },
  
  // 学習・成長
  { id: 'cs9_31', question: '失敗から学ぶことの意味は？', options: ['恥ずかしいこと', '成長の機会', '時間の無駄'], correct: 1, difficulty: 5, category: '学習', explanation: '失敗は成長するための大切な学びの機会です' },
  { id: 'cs9_32', question: '読書の効果として正しいのは？', options: ['時間の無駄', '知識と想像力の向上', '目が悪くなる'], correct: 1, difficulty: 4, category: '学習', explanation: '読書は知識を増やし想像力を豊かにします' },
  { id: 'cs9_33', question: '目標を立てることの意味は？', options: ['プレッシャー', '方向性を決める', '制限'], correct: 1, difficulty: 5, category: '学習', explanation: '目標は頑張る方向性を決める大切なものです' },
  { id: 'cs9_34', question: '努力することの価値は？', options: ['疲れるだけ', '成長につながる', '意味がない'], correct: 1, difficulty: 4, category: '学習', explanation: '努力は自分の成長につながる価値あることです' },
  { id: 'cs9_35', question: '新しいことに挑戦することは？', options: ['危険', '成長の機会', '面倒'], correct: 1, difficulty: 4, category: '学習', explanation: '新しい挑戦は新たな能力を身につける機会です' },
  
  // 文化・多様性
  { id: 'cs9_36', question: '他の国の文化について正しいのは？', options: ['自分の国が一番', '尊重すべき', '関係ない'], correct: 1, difficulty: 5, category: '文化', explanation: '他の国の文化も尊重することが大切です' },
  { id: 'cs9_37', question: '伝統文化を守ることの意味は？', options: ['古いもの', '先祖からの贈り物', '邪魔なもの'], correct: 1, difficulty: 5, category: '文化', explanation: '伝統文化は先祖から受け継いだ大切な財産です' },
  { id: 'cs9_38', question: '言語の多様性について正しいのは？', options: ['一つだけが良い', '豊かな財産', '面倒なもの'], correct: 1, difficulty: 6, category: '文化', explanation: '様々な言語があることは人類の豊かな財産です' },
  { id: 'cs9_39', question: '障害のある人への接し方は？', options: ['避ける', '普通に接する', '特別扱いする'], correct: 1, difficulty: 5, category: '多様性', explanation: '障害のある人にも普通に優しく接することが大切です' },
  { id: 'cs9_40', question: '性別による役割分担について正しいのは？', options: ['固定的に決まっている', '個人の能力による', '伝統的が正しい'], correct: 1, difficulty: 6, category: '多様性', explanation: '性別ではなく個人の能力や意思が大切です' },
  
  // 経済・お金
  { id: 'cs9_41', question: 'お金の正しい使い方は？', options: ['すぐ使い切る', '計画的に使う', '貯めるだけ'], correct: 1, difficulty: 4, category: '経済', explanation: 'お金は計画的に使うことが大切です' },
  { id: 'cs9_42', question: '働くことの意味は？', options: ['お金のため', '社会貢献', '仕方なく'], correct: 1, difficulty: 5, category: '経済', explanation: '働くことは社会に貢献する意味があります' },
  { id: 'cs9_43', question: '欲しいものと必要なものの違いは？', options: ['同じもの', '違うもの', '関係ない'], correct: 1, difficulty: 5, category: '経済', explanation: '欲しいものと本当に必要なものは違います' },
  { id: 'cs9_44', question: '貯金することの意味は？', options: ['ケチなこと', '将来への準備', '意味がない'], correct: 1, difficulty: 4, category: '経済', explanation: '貯金は将来のための大切な準備です' },
  { id: 'cs9_45', question: '無駄遣いを避けるには？', options: ['何でも買う', 'よく考えて買う', '買わない'], correct: 1, difficulty: 4, category: '経済', explanation: '買い物の前によく考えることが無駄遣いを防ぎます' },
  
  // 時間管理・責任感
  { id: 'cs9_46', question: '時間を大切にすることの意味は？', options: ['急ぐこと', '有効活用すること', '時計を見ること'], correct: 1, difficulty: 4, category: '責任', explanation: '時間を有効活用することが時間を大切にすることです' },
  { id: 'cs9_47', question: '約束を守ることの大切さは？', options: ['面倒なこと', '信頼関係の基本', '関係ない'], correct: 1, difficulty: 4, category: '責任', explanation: '約束を守ることは信頼関係の基本です' },
  { id: 'cs9_48', question: '責任を持つことの意味は？', options: ['重い負担', '成長の証', '大人の特権'], correct: 1, difficulty: 5, category: '責任', explanation: '責任を持つことは成長した証です' },
  { id: 'cs9_49', question: '準備することの大切さは？', options: ['時間の無駄', '成功への近道', '面倒なこと'], correct: 1, difficulty: 4, category: '責任', explanation: '準備をしっかりすることが成功への近道です' },
  { id: 'cs9_50', question: '継続することの価値は？', options: ['つまらない', '力になる', '意味がない'], correct: 1, difficulty: 4, category: '責任', explanation: '継続は力なり、続けることで大きな力になります' }
];

// 12-15歳向け常識問題（高学年〜中学生）
const age12to15CommonSenseQuestions: CommonSenseQuestion[] = [
  // 高度な社会常識・倫理
  { id: 'cs12_1', question: '言論の自由の大切さとは？', options: ['何でも言える権利', '責任を伴う表現の自由', '他人を傷つける権利'], correct: 1, difficulty: 7, category: '社会倫理', explanation: '言論の自由は責任を伴う表現の自由であり、他人の人権を尊重する必要があります' },
  { id: 'cs12_2', question: 'プライバシーの権利とは？', options: ['隠し事をする権利', '個人情報を守られる権利', '秘密を作る権利'], correct: 1, difficulty: 6, category: '社会倫理', explanation: 'プライバシーは個人の情報や私生活が守られる権利です' },
  { id: 'cs12_3', question: '平等の原則で最も重要なことは？', options: ['みんな同じ扱い', '公平な機会の提供', '結果の平等'], correct: 1, difficulty: 7, category: '社会倫理', explanation: '平等とは結果ではなく、公平な機会が与えられることです' },
  { id: 'cs12_4', question: '多数決の限界として正しいのは？', options: ['完璧な制度', '少数派の意見を無視する危険性', '時間がかかる'], correct: 1, difficulty: 7, category: '社会倫理', explanation: '多数決は少数派の意見や権利を無視する危険性があります' },
  { id: 'cs12_5', question: '社会契約の考え方とは？', options: ['政府が一方的に決める', '市民と政府の相互の約束', '法律の別名'], correct: 1, difficulty: 8, category: '社会倫理', explanation: '社会契約は市民と政府の間の相互の権利と義務の約束です' },
  
  // 心理学・人間関係
  { id: 'cs12_6', question: 'コミュニケーションで最も大切なことは？', options: ['正しく話すこと', '相互理解', '説得すること'], correct: 1, difficulty: 6, category: '心理', explanation: 'コミュニケーションの目的は相互理解を深めることです' },
  { id: 'cs12_7', question: 'ストレスへの健康的な対処法は？', options: ['我慢する', '適切な方法で発散する', '他人にぶつける'], correct: 1, difficulty: 6, category: '心理', explanation: 'ストレスは運動や趣味など適切な方法で発散することが大切です' },
  { id: 'cs12_8', question: '偏見を持つ危険性とは？', options: ['効率的判断', '公正な判断を妨げる', '時間短縮'], correct: 1, difficulty: 6, category: '心理', explanation: '偏見は事実に基づかない判断で、公正な評価を妨げます' },
  { id: 'cs12_9', question: 'アイデンティティの確立とは？', options: ['他人と同じになること', '自分らしさを見つけること', '有名になること'], correct: 1, difficulty: 7, category: '心理', explanation: 'アイデンティティは自分らしさや価値観を確立することです' },
  { id: 'cs12_10', question: '感情のコントロールで大切なことは？', options: ['感情を隠すこと', '感情を理解し適切に表現すること', '感情を無視すること'], correct: 1, difficulty: 6, category: '心理', explanation: '感情を理解し、適切な方法で表現することが大切です' },
  
  // 科学・論理的思考
  { id: 'cs12_11', question: '科学的思考の基本とは？', options: ['権威を信じること', '証拠に基づく判断', '直感に従うこと'], correct: 1, difficulty: 6, category: '論理', explanation: '科学的思考は証拠や事実に基づいて判断することです' },
  { id: 'cs12_12', question: '因果関係と相関関係の違いは？', options: ['同じもの', '原因と結果vs同時に起こる', '関係ない'], correct: 1, difficulty: 7, category: '論理', explanation: '因果関係は原因と結果、相関関係は同時に変化することです' },
  { id: 'cs12_13', question: '仮説を立てる意味は？', options: ['当てずっぽう', '検証可能な予測', '希望的観測'], correct: 1, difficulty: 6, category: '論理', explanation: '仮説は事実によって検証可能な予測や説明です' },
  { id: 'cs12_14', question: '批判的思考とは？', options: ['批判すること', '客観的に分析すること', '否定すること'], correct: 1, difficulty: 6, category: '論理', explanation: '批判的思考は情報を客観的に分析し評価することです' },
  { id: 'cs12_15', question: '論理的な議論の条件は？', options: ['声が大きい', '根拠がある', '感情的'], correct: 1, difficulty: 6, category: '論理', explanation: '論理的な議論には根拠や証拠が必要です' },
  
  // グローバル・国際理解
  { id: 'cs12_16', question: 'グローバル化の影響として正しいのは？', options: ['文化の均一化のみ', '相互依存の深化', '孤立化'], correct: 1, difficulty: 7, category: '国際', explanation: 'グローバル化により国同士の相互依存が深まっています' },
  { id: 'cs12_17', question: '国際協力が必要な理由は？', options: ['強国の利益', '地球規模の課題解決', '経済発展のみ'], correct: 1, difficulty: 6, category: '国際', explanation: '環境問題など地球規模の課題には国際協力が不可欠です' },
  { id: 'cs12_18', question: '文化の多様性を尊重する意味は？', options: ['面倒なこと', '人類の豊かさ', '効率が悪い'], correct: 1, difficulty: 6, category: '国際', explanation: '文化の多様性は人類の知恵と豊かさの源です' },
  { id: 'cs12_19', question: '人権の普遍性とは？', options: ['国によって違う', '全人類共通', '文化で決まる'], correct: 1, difficulty: 7, category: '国際', explanation: '基本的人権は文化や国を超えた全人類共通の権利です' },
  { id: 'cs12_20', question: '持続可能な発展とは？', options: ['経済成長のみ', '将来世代を考慮した発展', '現在だけ考える'], correct: 1, difficulty: 7, category: '国際', explanation: '持続可能な発展は将来世代のことも考えた発展です' },
  
  // 情報社会・メディアリテラシー
  { id: 'cs12_21', question: '情報の信頼性を判断する基準は？', options: ['情報源と根拠', '面白さ', '新しさ'], correct: 0, difficulty: 6, category: '情報', explanation: '情報の信頼性は情報源の確かさと根拠の有無で判断します' },
  { id: 'cs12_22', question: 'SNSの利用で注意すべきことは？', options: ['個人情報の管理', '友達の数', '投稿の頻度'], correct: 0, difficulty: 5, category: '情報', explanation: 'SNSでは個人情報の適切な管理が最も重要です' },
  { id: 'cs12_23', question: 'フェイクニュースの危険性は？', options: ['面白くない', '誤った判断を導く', '時間の無駄'], correct: 1, difficulty: 6, category: '情報', explanation: 'フェイクニュースは人々の誤った判断や行動を引き起こします' },
  { id: 'cs12_24', question: 'デジタル・デバイドとは？', options: ['機器の故障', '情報格差', '技術の進歩'], correct: 1, difficulty: 7, category: '情報', explanation: 'デジタル・デバイドは情報技術の利用機会の格差です' },
  { id: 'cs12_25', question: 'ネット上の表現の自由と責任は？', options: ['何でも自由', '責任を伴う自由', '制限のみ'], correct: 1, difficulty: 6, category: '情報', explanation: 'ネット上でも表現の自由には責任が伴います' },
  
  // 環境・持続可能性（高度）
  { id: 'cs12_26', question: '生物多様性が重要な理由は？', options: ['きれいだから', '生態系の安定', '珍しいから'], correct: 1, difficulty: 7, category: '環境', explanation: '生物多様性は生態系の安定と人類の生存に重要です' },
  { id: 'cs12_27', question: '再生可能エネルギーの意義は？', options: ['新しいから', '環境負荷の軽減', '高価だから'], correct: 1, difficulty: 6, category: '環境', explanation: '再生可能エネルギーは環境負荷を軽減し持続可能です' },
  { id: 'cs12_28', question: '循環型社会とは？', options: ['使い捨ての社会', '資源を循環利用する社会', '昔の社会'], correct: 1, difficulty: 7, category: '環境', explanation: '循環型社会は資源を無駄なく循環利用する社会です' },
  { id: 'cs12_29', question: '環境倫理の考え方は？', options: ['人間中心', '自然との共生', '経済優先'], correct: 1, difficulty: 7, category: '環境', explanation: '環境倫理は人間と自然の共生を重視します' },
  { id: 'cs12_30', question: '地球温暖化対策で個人ができることは？', options: ['何もできない', '省エネと意識改革', '政府任せ'], correct: 1, difficulty: 5, category: '環境', explanation: '個人レベルでも省エネや意識改革で貢献できます' },
  
  // 経済・社会制度（高度）
  { id: 'cs12_31', question: '市場経済の特徴は？', options: ['政府が全て決定', '需要と供給で価格決定', '平等な分配'], correct: 1, difficulty: 7, category: '経済', explanation: '市場経済では需要と供給の関係で価格が決まります' },
  { id: 'cs12_32', question: '社会保障制度の目的は？', options: ['政府の権力', '国民の生活保障', '税収増加'], correct: 1, difficulty: 6, category: '経済', explanation: '社会保障制度は国民の生活を保障するためのものです' },
  { id: 'cs12_33', question: '格差社会の問題点は？', options: ['競争がない', '社会の不安定化', '平等すぎる'], correct: 1, difficulty: 7, category: '経済', explanation: '過度な格差は社会の不安定化を招く可能性があります' },
  { id: 'cs12_34', question: '労働者の権利として重要なのは？', options: ['好きに働く権利', '適正な労働条件', '高給の権利'], correct: 1, difficulty: 6, category: '経済', explanation: '労働者には適正な労働条件で働く権利があります' },
  { id: 'cs12_35', question: '企業の社会的責任とは？', options: ['利益追求のみ', '社会への貢献', '法律の遵守のみ'], correct: 1, difficulty: 6, category: '経済', explanation: '企業は利益追求だけでなく社会への貢献も責任です' },
  
  // 政治・民主主義（高度）
  { id: 'cs12_36', question: '三権分立の意義は？', options: ['効率性の向上', '権力の濫用防止', '迅速な決定'], correct: 1, difficulty: 7, category: '政治', explanation: '三権分立は権力の集中と濫用を防ぐ制度です' },
  { id: 'cs12_37', question: '憲法の最高法規性とは？', options: ['一番新しい法律', 'すべての法律の基準', '政府の法律'], correct: 1, difficulty: 7, category: '政治', explanation: '憲法はすべての法律や政治の基準となる最高法規です' },
  { id: 'cs12_38', question: '民主主義の前提条件は？', options: ['経済発展', '主権者の政治参加', '強いリーダー'], correct: 1, difficulty: 7, category: '政治', explanation: '民主主義は主権者である国民の政治参加が前提です' },
  { id: 'cs12_39', question: '法の支配とは？', options: ['法律家の支配', '権力も法に従う', '厳罰主義'], correct: 1, difficulty: 7, category: '政治', explanation: '法の支配は権力者も含めすべてが法に従う原則です' },
  { id: 'cs12_40', question: '基本的人権の特徴は？', options: ['政府が与える', '生まれながらの権利', '努力で得る権利'], correct: 1, difficulty: 6, category: '政治', explanation: '基本的人権は生まれながらに持つ不可侵の権利です' },
  
  // 哲学・価値観（高度）
  { id: 'cs12_41', question: '道徳的相対主義の問題点は？', options: ['厳しすぎる', '普遍的基準の否定', '実用的でない'], correct: 1, difficulty: 8, category: '哲学', explanation: '道徳的相対主義は普遍的な道徳基準を否定する危険性があります' },
  { id: 'cs12_42', question: '自由意志と責任の関係は？', options: ['関係ない', '自由には責任が伴う', '責任は不要'], correct: 1, difficulty: 7, category: '哲学', explanation: '自由な選択には必ずその結果への責任が伴います' },
  { id: 'cs12_43', question: '正義の実現で重要なことは？', options: ['力の行使', '公正な手続き', '結果のみ'], correct: 1, difficulty: 7, category: '哲学', explanation: '正義の実現には公正な手続きが重要です' },
  { id: 'cs12_44', question: '個人の尊厳とは？', options: ['能力による価値', '人間としての固有価値', '社会的地位'], correct: 1, difficulty: 6, category: '哲学', explanation: '個人の尊厳は能力や地位に関係ない人間固有の価値です' },
  { id: 'cs12_45', question: '真理の探求において大切なことは？', options: ['権威への服従', '開かれた対話', '伝統の維持'], correct: 1, difficulty: 7, category: '哲学', explanation: '真理の探求には開かれた対話と批判的検討が必要です' },
  
  // 文化・芸術（高度）
  { id: 'cs12_46', question: '芸術の社会的意義は？', options: ['娯楽の提供', '人間性の豊かさ', '経済効果'], correct: 1, difficulty: 6, category: '文化', explanation: '芸術は人間の感性や精神性を豊かにする重要な役割があります' },
  { id: 'cs12_47', question: '文化の継承と革新の関係は？', options: ['対立関係', '相互補完', '関係ない'], correct: 1, category: '文化', difficulty: 7, explanation: '文化は継承と革新が相互に作用して発展します' },
  { id: 'cs12_48', question: '表現の自由の限界は？', options: ['無制限', '他者の権利の尊重', '政府の許可'], correct: 1, difficulty: 6, category: '文化', explanation: '表現の自由も他者の人権や尊厳を尊重する限界があります' },
  { id: 'cs12_49', question: '異文化理解の意義は？', options: ['観光のため', '人間理解の深化', '経済利益'], correct: 1, difficulty: 6, category: '文化', explanation: '異文化理解は人間性への理解を深める重要な意義があります' },
  { id: 'cs12_50', question: '創造性を育むために必要なことは？', options: ['暗記中心の学習', '多様な体験と自由な発想', '競争のみ'], correct: 1, difficulty: 6, category: '文化', explanation: '創造性は多様な体験と自由な発想環境で育まれます' }
];

export const commonSenseDatabase: AgeGroupCommonSenseQuestions[] = [
  {
    ageGroup: '6-8歳（低学年）',
    ageRange: { min: 6, max: 8 },
    questions: age6to8CommonSenseQuestions
  },
  {
    ageGroup: '9-11歳（中学年）',
    ageRange: { min: 9, max: 11 },
    questions: age9to11CommonSenseQuestions
  },
  {
    ageGroup: '12-15歳（高学年〜中学生）',
    ageRange: { min: 12, max: 15 },
    questions: age12to15CommonSenseQuestions
  }
];

// ランダムに常識問題を選択する関数（年齢別漢字フィルタリング対応）
export function getRandomCommonSenseQuestions(age: number, count: number = 5): CommonSenseQuestion[] {
  const ageGroup = commonSenseDatabase.find(group => 
    age >= group.ageRange.min && age <= group.ageRange.max
  );
  
  if (!ageGroup) {
    if (age < 6) {
      return getRandomCommonSenseQuestions(6, count);
    } else {
      return getRandomCommonSenseQuestions(15, count);
    }
  }
  
  const gradeLevel = ageToGradeLevel(age);
  console.log('🔧 getRandomCommonSenseQuestions:', { age, gradeLevel, ageGroup: ageGroup.ageGroup });
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
    
    const filteredExplanation = question.explanation ? 
      filterTextForGrade(question.explanation, {
        gradeLevel,
        allowHiragana: true,
        allowKatakana: true,
        strictMode: true
      }) : undefined;
    
    return {
      ...question,
      originalQuestion: question.question,
      originalOptions: question.options,
      originalExplanation: question.explanation,
      question: filteredQuestion,
      options: filteredOptions,
      explanation: filteredExplanation
    };
  });
  
  return filteredQuestions.slice(0, count);
}

// 常識問題統計を取得する関数
export function getCommonSenseStatistics() {
  return commonSenseDatabase.map(group => ({
    ageGroup: group.ageGroup,
    totalQuestions: group.questions.length,
    categories: Array.from(new Set(group.questions.map(q => q.category))),
    averageDifficulty: Math.round(
      group.questions.reduce((sum, q) => sum + q.difficulty, 0) / group.questions.length * 10
    ) / 10
  }));
}