import { Html, Head, Main, NextScript } from "next/document";
import Link from "next/link";

export default function Document() {

  return (
    <Html lang="ja">
      <Head />
      <body>
        <div className="l_homeLayout">
          <div className="l_homeLayout__header">
            <header>
              <section>
                <h1>Webページの調査ツール</h1>
              </section>
            </header>
          </div>
          <div className="l_homeLayout__aside">
            <aside>
              <nav className="c_homePrimaryNav" aria-label="ツール一覧">
                <ul className="c_homePrimaryNav__list">
                  <li className="c_homePrimaryNav__item"><Link href="/">ダッシュボード</Link></li>
                  <li className="c_homePrimaryNav__item"><Link href="/snapshot">ページを丸ごとダウンロード</Link></li>
                </ul>
              </nav>
            </aside>
          </div>
          <div className="l_homeLayout__main">
            <Main />
          </div>
          <div className="l_homeLayout__footer">
            <footer>
              <address>
                <a href="https://github.com/SinkingSeaWheat/website_snapshot" className="href" target="_blank">GitHub</a>
              </address>
            </footer>
          </div>
        </div>
        <NextScript />
      </body>
    </Html>
  );
}
