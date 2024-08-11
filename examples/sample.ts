import 'dotenv/config';
import OpenAI from 'openai';
import { queryFormatted, Tool, annotate } from 'typai';
import { dispatchQueryFormatted, handleToolCall } from 'typai';
import * as t from 'io-ts';

const openai = new OpenAI(
  // Probably unnecessary if using process.env (should work even if removed)
  {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    baseURL: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  });

const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

const emotionTool: Tool<{ emotion: string }> = {
  name: 'notifyEmotion',
  description: 'Notify the emotion of a given text',
  parameters: t.type({
    emotion: annotate(t.string, {
      description: 'estimated emotion',
      enum: ['happy', 'angry', 'sad']
    })
  })
};

async function estimateEmotion() {
  try {
    const result = await queryFormatted(
      openai,
      model,
      "次の発言の感情を推定してください。「ちっとも涼しくならないですぅ💦」",
      emotionTool
    );
    console.log("Tool called:", result.tool.name);
    console.log("Parameters:", result.parameters);
  } catch (error) {
    console.log(error);
  }
}

const useItemTool: Tool<{ item: string }> = {
  name: 'useItem',
  description: 'use an Item',
  parameters: t.type({
    item: t.string,
  })
};

const walkToTool: Tool<{ direction: string }> = {
  name: 'walkTo',
  description: 'walk to direction',
  parameters: t.type({
    direction: annotate(t.string, {
      description: 'estimated emotion',
      enum: ['left', 'right', 'back']
    }),
  })
};

const tools = [useItemTool, walkToTool] as const;

async function decideAction() {
  try {
    const result = await dispatchQueryFormatted(
      openai,
      model,
      "あなたはダンジョンの分かれ道にいます。次の行動を決定してください。",
      ...tools
    );

    handleToolCall(
      result, 
      (params: { item: string }) => {
        console.log("usedItemTool was called with parameters:", params);
      },
      (params: { direction: string }) => {
        console.log("walkTool was called with parameters:", params);
      });
  } catch (error) {
    console.log(error);
  }
}

const arrayRootTool: Tool<string[]> = {
  name: 'selectItems',
  description: 'Notify the selected items',
  parameters: t.array(t.string)
};


async function rootArray() {
  try {
    const result = await queryFormatted(
      openai,
      model,
      `以下の中から、大きい順に3つ選んでください：
      ["ぞう", "ねこ", "いぬ", "うさぎ", "ひつじ"]`, 
      arrayRootTool
    );
    console.log("Tool called:", result.tool.name);
    console.log("Parameters:", result.parameters);
  } catch (error) {
    console.log(error);
  }


}

const newsList = [{"position":1,"title":"写真ニュース(1/1): 「野球が好きで、野球が楽しい」５年目で初の故障離脱を経験したエース左腕…オリックスの後半戦キーマン","source":{"name":"BIGLOBEニュース","icon":"https://encrypted-tbn0.gstatic.com/faviconV2?url=https://news.biglobe.ne.jp&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"},"link":"https://news.biglobe.ne.jp/sports/0726/5250787616/sph_sph_20240726115511_1_jpg.html","thumbnail":"https://news.biglobe.ne.jp/sports/0726/5250787616/sph_20240726115511_1_thum800.jpg","date":"07/26/2024, 02:50 AM, +0000 UTC"},{"position":2,"title":"「ちょっと難しいけど楽しい」児童が司書の仕事を体験 | tysニュース | ｔｙｓテレビ山口 (1ページ)","source":{"name":"TBS NEWS DIG Powered by JNN","icon":"https://lh3.googleusercontent.com/_fEUW50Nowt-45FDZ7J9HgC0GeJYbuX6Hq3bowgvNvd9ZqEvfERojxH06eVNVrrAegv_2GjPvg"},"link":"https://newsdig.tbs.co.jp/articles/tys/1318798?display=1","thumbnail":"https://newsdig.ismcdn.jp/mwimgs/6/3/430mw/img_6384e7f086700eae1dd8ba130f13e55c247213.jpg","date":"07/25/2024, 09:31 AM, +0000 UTC"},{"position":3,"title":"ニュース・気象/マイ!Biz 日常の“楽しい”を共有しよう","source":{"name":"NHK.JP","icon":"https://encrypted-tbn2.gstatic.com/faviconV2?url=https://www.nhk.jp&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"},"link":"https://www.nhk.jp/p/my-asa/rs/J8792PY43V/episode/re/N8571Y1VYK/","date":"07/22/2024, 09:21 PM, +0000 UTC"},{"position":4,"title":"一人芝居「ペックfromスコットランド」 言葉なし 音で楽しい舞台","source":{"name":"中日新聞","icon":"https://lh3.googleusercontent.com/c2-rNqBBD_CCbqSlqUIOOpfbMT3AxioCUbxbf_0QynRD3sGG6-O18gbmD1ibr6hTEc2zGtWc"},"link":"https://www.chunichi.co.jp/article/933000","thumbnail":"https://static.chunichi.co.jp/image/article/size1/5/4/7/e/547e17544f60457224bdaa6280fcb31c_1.jpg","date":"07/25/2024, 03:50 AM, +0000 UTC"},{"position":5,"title":"『ギャルみこし』８０人の“ギャル”が天神祭を盛り上げ！２００ｋｇの神輿を担ぐ「めっちゃめっちゃ楽しい」「イエーイ」","source":{"name":"毎日放送","icon":"https://encrypted-tbn0.gstatic.com/faviconV2?url=https://www.mbs.jp&client=NEWS_360&size=96&type=FAVICON&fallback_opts=TYPE,SIZE,URL"},"link":"https://www.mbs.jp/news/kansainews/20240723/GE00059073.shtml","thumbnail":"https://www.mbs.jp/news/kansainews/20240723/fb/GE00059073.jpg","date":"07/23/2024, 09:10 AM, +0000 UTC"}];
const newsChoiceCount = 3;

async function chooseNews() {
  console.log("MODEL", model);
  const NewsItem = t.type({
    title: t.string,
    link: t.string,
  });
  type NewsItemType = t.TypeOf<typeof NewsItem>;
  
  const NewsList = t.array(NewsItem);
  type NewsListType = t.TypeOf<typeof NewsList>;
  
  const newsChoiceTool: Tool<NewsListType> = {
    name: "chooseNews",
    description: "選択した子供向けのニュースを通知",
    parameters: NewsList
  };

  const r = await queryFormatted(
    openai,
    model,
    `子供が読んでも悪くないニュースを${newsChoiceCount}つ選んでください。目的は、会話を楽しく弾ませることであり、そのための共通話題としてのニュースのピックアップにあります。:\n${JSON.stringify(newsList)}`, 
    newsChoiceTool,
    {verbose:{maxLength: Infinity, indent: 2}}
  );
  console.log(r.parameters);
}

// Character definition
const Character = annotate(
  t.type({
    name: annotate(t.string, {description: "キャラクター名 (lang: Japanese)"}),
    appearance: annotate(t.string, {description: "キャラクターの容姿。脇役のappearanceは簡潔にすること (lang: English)"}),
  }),
  {description: "キャラクター一覧。キャラクタードキュメントにない脇役も列挙しろ"},
);
type Character = t.TypeOf<typeof Character>;

const Characters = t.array(Character);
type Characters = t.TypeOf<typeof Characters>;

const charactersTool: Tool<Characters> = {
  name: "notifyCharacters",
  description: "Notify the characters of the story",
  parameters: Characters,
};

async function makeCharacter() {
  const prompt = `
# タスク

与えられたテーマに沿って、
そのテーマの中で活躍することになるマンガのキャラクターを設定しろ。

# 詳細

キャラクターの個性としては、ネガティヴなものを重視しろ。
欠点のないキャラクターは好まれない。
ただし、テーマがニュートラルならプロットはコメディに寄せるので、
キャラクターの欠点も深刻にならないように。
特に指定がない場合は女子にしろ。

命名は具体的に、今風に。
「山田太郎」「〇〇」のようなサンプル風の名前は禁じられている。

# テーマ

夜と懐中電灯と学校
`;

  const result = await queryFormatted(
    openai,
    model,
    prompt,
    charactersTool,
    {verbsose: {
      maxStringLength: 40,
      indent: 2,
      oneLineLength: 60,
    }} as any);

  console.log(result.parameters);
}

async function main() {
  await estimateEmotion();
  await decideAction();
  await rootArray();
  await chooseNews();
  await makeCharacter();
}

main();