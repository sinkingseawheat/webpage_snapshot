import { Html, Head, Main, NextScript } from "next/document";
import Link from "next/link";

export default function Document() {

  return (
    <Html lang="ja">
      <Head />
      <body>
        <div className="l_homeLayout">
          <div className="l_homeLayout__aside">
            <section>
              <h1>Webページの調査ツール</h1>
            </section>
            <aside>
              <nav className="c_homePrimaryNav" aria-label="ツール一覧">
                <ul className="c_homePrimaryNav__list">
                  <li className="c_homePrimaryNav__item"><Link href="/">TOP（作成中）</Link></li>
                  <li className="c_homePrimaryNav__item"><Link href="/snapshot">ページの現状を記録</Link></li>
                </ul>
              </nav>
            </aside>
            <address>
              <a href="https://github.com/SinkingSeaWheat/website_snapshot" className="href" target="_blank">このツールのGitHubページへ移動する</a>
            </address>
          </div>
          <div className="l_homeLayout__main">
            <Main />
          </div>
        </div>
        <NextScript />
      </body>
    </Html>
  );
}
