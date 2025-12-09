# 動的ターンキャラの手番ずれ調査報告

## 1. 原因の整理
- AIターン処理 `processAITurn` のパス処理で、プレイヤーが打てる手がない場合に `processAITurn()` を**awaitせず再帰呼び出し**している（行263）。
- 直後に `state.isThinking = false` を実行するため、次のAI思考が走っている間でも「思考中フラグ」が下がった状態になり、iOS WebViewのイベントループではユーザー入力や描画が割り込む余地が生まれる。【F:index.html†L220-L274】
- その結果、以下の競合が発生する:
  - AIが「プレイヤーに合法手なし」と判定 → 1500ms待ち → `switchTurn()` → 非同期でAI再実行
  - 直後にフラグがfalseに戻るため、UIはユーザー手番のように見えるが内部ターンはAI側（-1）。
  - iOSではタイミングが詰まることで再開したAIが即着手し、**「ユーザーがタップしたのに白石が置かれた／AIが連続で2手打つ」**ように見える。

## 2. 再現手順
1. キャラ選択で「椎奈」または「ジキル」を選び、深さ3/4（デフォルト設定）で開始。
2. 中盤（約20手前後）まで通常プレイ。
3. プレイヤーに合法手がなくなる形を作る（角を押さえられた後、辺で詰められる局面など）。
4. AI着手直後〜数秒以内に盤面をタップする。
   - iOS Safari/アプリ内WebViewで再現性が高く、Android/PCでは起きにくい。
5. 現象: パスのダイアログが表示されないまま白石が置かれ、AIが連続2手分進む。

### デバッグ用ログ案
- パス分岐直前に `console.log('pass check', {turn: state.turn, playerMoves});` を出力し、`state.turn` が -1 のまま再入していないか確認。
- `processAITurn` 入口で `isThinking` 状態と `game.turn` を記録し、フラグの競合を追跡。

## 3. 改善案（疑似パッチ）
- 手番と状態更新を**単一のターン進行関数**で管理し、AI再帰呼び出しは必ずawaitする。
- パス時のフラグ競合を防ぐため、`isThinking` の変更はAI処理の完了後にまとめて行う。

```javascript
async function processAITurn() {
  if (state.gameEnded || state.turn !== -1 || state.isThinking) return;
  state.isThinking = true;

  const bestMove = await computeBestMove();
  if (bestMove) game.makeMove(...);

  game.switchTurn();
  syncState();

  const playerMoves = game.getValidMoves(1);
  if (!state.gameEnded && playerMoves.length === 0) {
    state.message = '君はパスだね。';
    await delay(1500);
    game.switchTurn();
    syncState();
    await processAITurn(); // ★必ずawaitする
  }

  state.isThinking = false;
}
```
- さらに `onPlayerClick` / `processAITurn` / パス処理を共通の `nextTurn()` でシリアライズし、ターン切り替えと合法手計算の順序を **「盤面更新 → 合法手計算 → パス判定 → ターン更新」** に統一することで二重更新の余地をなくす。

以上です。
