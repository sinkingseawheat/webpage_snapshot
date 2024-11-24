※ ver 0.1.0時点での情報です。

## 必要な環境

- Node.js v20.11.1以上

## どんなツール？

playwrightを用いたWebページのスナップショットツールです。
まだアルファ版です。Electronでアプリ化ができなかったので、あたらめて作り直すかもしれません。

## 設定

結果は`./_data/result`配下に保存されます。
設定は`./_data/.networkSetting.json`で行います。

以下は設定ファイルの例です。

```JSON
{
  "proxy":{
    "server":"",
    "bypass":"",
    "username":"",
    "password":""
  },
  "basicAuth":{
    "^https://example.com":{
      "username":"guest",
      "password":"****"
    },
  },
  "allowArchive":[
    "^https://example.com",
  ]
}
```

### proxy

proxyがある場合の設定です。 [Browser["newContext"]のoptionsにあるproxy](https://playwright.dev/docs/api/class-browser#browser-new-context)に形式を合わせています。
serverを空の文字列に設定すると無効になります。

### basicAuth

Basic認証の設定です。Basic認証が設定されているリクエストURLを特定する正規表現をkeyに、そのリクエストURLへのアクセスに必要なユーザー名、パスワードをvalueに設定してください。

### allowArchive

ファイルを保存する対象のURLを特定する正規表現の配列です。どれか1つの正規表現にマッチしたら保存します。
※ Webページの保存を禁止しているサイトもあります。ご注意ください

## 始め方

### 1.ファイルのビルド（※ これは最初だけです。）
まずはコンソールで以下のコマンドでnpm_modulesのダウンロードとビルドをしてください。

```bash
npm i --legacy-peer-deps
npm build
```

### 2.ローカルサーバーを起動
以下のコマンドでローカルサーバーを起動してください。

```bash
npm start
```

### 3. ブラウザで以下の入力を行ってください
ブラウザで[http://localhost:3000/snapshot](http://localhost:3000/snapshot)を開いてください。
「入力欄」の「URL」対象のURLを改行区切りで入力し、「送信」ボタンを押してください。ジョブの処理が開始されます。
今はまだ、コンソールにのみ進捗状況が表示されます。
`-- 20241124-gaane0xs2w8yywxvの処理を完了しました --`
のように表示されたらジョブが完了しています。

### 4.結果を確認する

ページ下部のプルダウンを展開するとジョブの選択肢が表示されます。選択すると送信したURL全体の結果が表示されます。

各URLの行の「ページ詳細を見るリンク」から各ページの詳細に遷移できます。

## _data配下について

設定ファイルおよび結果はプロジェクトルートの_data配下に格納されます。現在は変更できません。

```
_data/
  ├ result
  │   └ snapshot/
  │        └ ${yyyymmdd}/                ツールの実行日で作成したフォルダ
  |              └ ${jobId}/             各ジョブを判別するランダムな文字列で作成したフォルダ
  |                   └ ${indexOfURL}/   リクエストしたURLのインデックスで作成したフォルダ
  |                      └ capture_...   ページのキャプチャ（ライトテーマとダークテーマの2枚存在）
  |                      └ document...   DocumentObjectModelのdumpファイル
  |                      └ page.json     ページごとの結果
  |                      └ archive/      アーカイブしたファイルがある場合はこのフォルダに格納
  |                          └ 1         アーカイブしたファイルを連番で格納
  |                          └ ...
  |                      └ .completed    正常に完了したら作成されるファイル
  |                      └ main.json     ジョブ全体の結果
  |                   └ ...
  │        └ ...
  |              └ ...
  |                   └ ...
  └ .networkSetting.json                 設定ファイル
```

### main.json

__formData__

 ツールで受け付けたフォームデータ。使用していないフィールドも入っている。

__versiton__

 ツールのバージョン。package.jsonから取得。

__targetURLs__

 このツールでは受け付けたURLにインデクスをつけて処理している。その対照リスト。

__links__

 targetURLおよびそれらから発生したリクエスト、加えてページから抽出したリンクのレスポンス結果を記載。

### page.json

__redirectTransition__

 URLのリダイレクトの様子を記載。ここだけmeta refreshやjavascriptによるリダイレクトも反映する。ただし、サーバーリダイレクト→ブラウザでのリダイレクト→再びサーバーリダイレクトなど複雑な場合は正しい順番では格納されない。

__URLsRequestFromPage__

 このページからリクエストが発生したURL。

__URLsExtracted__

 このページから抽出したURL。いくつかのHTMLタグ（`[href], [src], [srcset], [action], picture, meta[property="og:image"], meta[name="twitter:image"]`）・style属性とCSSファイルおよびstyleタグのbackground-imageとmask-imageに対応している。全量ではない。

### アーカイブファイルの名前について
アーカイブファイルは連番にリネームして格納している。

## 課題

- デザインがほぼデフォルトのデザインなので修正予定
- エラーハンドルがまだまだ甘いはず
- 進捗状況をブラウザに表示したい
- Electronなどでアプリ化したい
- アーカイブしたファイルを抽出できるようにしたい
- 抽出したリンクに対して、リクエストを試みるかのフィルターを作成したほうがいいかも
- データや設定をユーザーのホームディレクトリ配下などに移動できるようにしたい
- LintやPretterが無い、Jestもちょっとだけしか入っていない
