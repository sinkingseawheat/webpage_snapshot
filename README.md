This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## どんなツール？

playwrightを用いたWebページのスナップショットツールです。
まだアルファ版です。Electronでアプリ化ができなかったので、あたらめて作り直すかもしれません。
エラーハンドルがまだまだ甘いと思います。

## 設定

結果は`./_data/result`に保存されます。
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

## 始め方

まずはコンソールで以下のコマンドでビルドしてください。

```bash
npm build
```

以下のコマンドでローカルサーバーを起動してください。

```bash
npm start
```

ブラウザで[http://localhost:3000/snapshot](http://localhost:3000/snapshot)を開いてください。

「入力欄」の「URL」対象のURLを改行区切りで入力してください。

「送信」ボタンを押してください。

今はまだ、コンソールにのみ進捗状況が表示されます。
`-- 20241124-gaane0xs2w8yywxvの処理を完了しました --`
のように表示されたら完了です。

下部のプルダウンを展開すると選択肢が表示されます。選択すると送信したURL全体の結果が表示されます。

各URLの行の「ページ詳細を見るリンク」から各ページの詳細に遷移できます。