import React from 'react';
import './Ruby.css';

interface RubyProps {
  text: string;
  ruby: string;
}

// ルビを振るためのコンポーネント
export const Ruby: React.FC<RubyProps> = ({ text, ruby }) => {
  return (
    <ruby>
      {text}
      <rt>{ruby}</rt>
    </ruby>
  );
};

// よく使う言葉のルビ付きコンポーネント
export const RubyText = {
  // メニュー関連
  選択: () => <Ruby text="選択" ruby="せんたく" />,
  検索: () => <Ruby text="検索" ruby="けんさく" />,
  登録: () => <Ruby text="登録" ruby="とうろく" />,
  更新: () => <Ruby text="更新" ruby="こうしん" />,
  統計: () => <Ruby text="統計" ruby="とうけい" />,
  
  // 本関連
  推薦: () => <Ruby text="推薦" ruby="すいせん" />,
  図書: () => <Ruby text="図書" ruby="としょ" />,
  書籍: () => <Ruby text="書籍" ruby="しょせき" />,
  著者: () => <Ruby text="著者" ruby="ちょしゃ" />,
  出版社: () => <Ruby text="出版社" ruby="しゅっぱんしゃ" />,
  
  // 学年関連
  年齢: () => <Ruby text="年齢" ruby="ねんれい" />,
  学年: () => <Ruby text="学年" ruby="がくねん" />,
  小学校低学年: () => (
    <>
      <Ruby text="小学校" ruby="しょうがっこう" />
      <Ruby text="低学年" ruby="ていがくねん" />
    </>
  ),
  小学校中学年: () => (
    <>
      <Ruby text="小学校" ruby="しょうがっこう" />
      <Ruby text="中学年" ruby="ちゅうがくねん" />
    </>
  ),
  小学校高学年: () => (
    <>
      <Ruby text="小学校" ruby="しょうがっこう" />
      <Ruby text="高学年" ruby="こうがくねん" />
    </>
  ),
  中学生: () => <Ruby text="中学生" ruby="ちゅうがくせい" />,
  
  // その他
  興味: () => <Ruby text="興味" ruby="きょうみ" />,
  分野: () => <Ruby text="分野" ruby="ぶんや" />,
  語彙力: () => <Ruby text="語彙力" ruby="ごいりょく" />,
  常識力: () => <Ruby text="常識力" ruby="じょうしきりょく" />,
  初級: () => <Ruby text="初級" ruby="しょきゅう" />,
  中級: () => <Ruby text="中級" ruby="ちゅうきゅう" />,
  上級: () => <Ruby text="上級" ruby="じょうきゅう" />,
  必須: () => <Ruby text="必須" ruby="ひっす" />,
  任意: () => <Ruby text="任意" ruby="にんい" />,
  
  // 複合語をルビ付きで返す関数
  withRuby: (text: string): React.ReactNode => {
    const rubyMap: { [key: string]: string } = {
      '選択': 'せんたく',
      '検索': 'けんさく',
      '登録': 'とうろく',
      '更新': 'こうしん',
      '統計': 'とうけい',
      '推薦': 'すいせん',
      '図書': 'としょ',
      '書籍': 'しょせき',
      '著者': 'ちょしゃ',
      '出版社': 'しゅっぱんしゃ',
      '年齢': 'ねんれい',
      '学年': 'がくねん',
      '興味': 'きょうみ',
      '分野': 'ぶんや',
      '語彙力': 'ごいりょく',
      '常識力': 'じょうしきりょく',
      '初級': 'しょきゅう',
      '中級': 'ちゅうきゅう',
      '上級': 'じょうきゅう',
      '必須': 'ひっす',
      '任意': 'にんい',
      '小学校': 'しょうがっこう',
      '低学年': 'ていがくねん',
      '中学年': 'ちゅうがくねん',
      '高学年': 'こうがくねん',
      '中学生': 'ちゅうがくせい',
      '中学': 'ちゅうがく',
      '受験': 'じゅけん'
    };

    // テキストを分割してルビを適用
    let result: React.ReactNode[] = [];
    let currentText = text;
    
    Object.entries(rubyMap).forEach(([kanji, reading]) => {
      if (currentText.includes(kanji)) {
        const parts = currentText.split(kanji);
        if (parts.length > 1) {
          result.push(parts[0]);
          result.push(<Ruby key={kanji} text={kanji} ruby={reading} />);
          currentText = parts.slice(1).join(kanji);
        }
      }
    });
    
    if (currentText) {
      result.push(currentText);
    }
    
    return result.length > 0 ? <>{result}</> : text;
  }
};