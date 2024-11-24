## 必要な環境

- Node.js v20.11.1以上

## どんなツール？

playwrightを用いたWebページのスナップショットツールです。
まだアルファ版です。Electronでアプリ化ができなかったので、あたらめて作り直すかもしれません。

## 設定

結果は`./_data/result`配下に保存されます。
設定は`./data/.networkSetting.json`で行います。

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

## 課題

- デザインがほぼデフォルトのデザインなので修正予定
- エラーハンドルがまだまだ甘いはず
- 進捗状況をブラウザに表示したい
- Electronなどでアプリ化したい
- アーカイブしたファイルを抽出できるようにしたい
- 抽出したリンクに対して、リクエストを試みるかのフィルターを作成したほうがいいかも