/**
 * Reversi: Character Duel - Character Definitions (v0.9)
 * セリフ増量版
 */
const CHARACTERS = [
    {
        id: "shiina",
        name: "椎奈",
        description: "近所の謎の25歳のお姉さん。",
        icon: "🐋",
        logicType: "dynamic_turn",
        depth: 5,
        randomness: 1,
        parameters: {
            switchTurn: 20,
            early: { mobility: 10, position: 100, discDiff: -30 },
            late: { mobility: 2, position: 50, discDiff: 100 }
        },
        dialogues: {
            start: ["ふふっ。今日は私に勝てるかなっ？", "今日は勝てるといいねっ", "キミも大きくなったねっ"],
            thinking: ["うーん！面白いねっ", "強くなったねっ！", "面白い手を考えたねっ","ふむふむ"],
            generic: ["いいねっ", "あはっ", "ふふっ","次はどこ置く～？","ふふふっ"],
            corner: ["角もーらいっ", "キミも優しいねっ", "取れちゃったっ"],
            advantage: ["今日も勝っちゃおっかなっ", "ふふっ。昔みたいでかーわいっ", "今日は私の勝ちかなっ！"],
            disadvantage: ["もーーーっ", "今日の君は強いねっ", "んーー！！"],
            win: ["ふふっ。今日は勝っちゃったっ", "楽しかったよっ！またやろうね！","次は勝てると良いねっ"],
            lose: ["うーん...何が駄目だったんだろ...", "えーん...負けちゃった"]
        }
    },

    {
        id: "saki",
        name: "佐紀",
        description: "２歳年上の先輩",
        icon: "🐾",
        logicType: "static",
        depth: 2,
        randomness: 80,
        parameters: {mobility: 2, position: 40, discDiff: 20 },
        dialogues: {
            start: ["今日は私に勝てるかな～？", "ふふっ", "佐紀ちゃんに挑むとは～"],
            thinking: ["あははっ 面白いじゃん！", "強くなったじゃん！", "んーー","ふむふむ～","ナルホドねぇ"],
            generic: ["ふふふっ", "面白いじゃん", "あははっ","そこでいいの～？"],
            corner: ["角いただきー", "面白いじゃん", "佐紀ちゃんの勝利は近いなー？"],
            advantage: ["今日も佐紀ちゃんの勝ちだな", "♪～ ♬～", "んーキミもまだまだだねぇ"],
            disadvantage: ["んー。佐紀ちゃんでも難しいかな～？", "いつもより強いじゃん。", "ズルしてないよね？"],
            win: ["あははっ", "また今度挑み給え～","今日も佐紀ちゃんの勝ちでした～"],
            lose: ["...", "佐紀ちゃんを負かすとはいい度胸だねぇ","むーーー！"]
        }
    },
    {
        id: "attacker",
        name: "猪突猛進のアキ",
        description: "とにかく石をたくさん取りたがります。後のことは考えていません。",
        icon: "🔥",
        logicType: "static",
        depth: 2,
        randomness: 0,
        parameters: { mobility: 5, position: 10, discDiff: 80 },
        dialogues: {
            start: ["手加減しないよ！", "ガンガン攻めるからね！", "細かいことは気にしない！"],
            thinking: ["どこが一番取れるかな…", "うーん、攻め時か…？", "よし、あそこだ！"],
            generic: ["ほらよっと！", "どんどん行くよー！", "次！"],
            corner: ["角？ まあくれてやるよ。", "角よりも、石の数だろ！"],
            advantage: ["見たか！私の石の量を！", "圧倒的じゃないか！", "止まらないねぇ！"],
            disadvantage: ["あれ…数負けてる？", "おかしいな…計算が…", "くそっ、取り返すぞ！"],
            win: ["やったー！私の勝ちだ！", "力こそパワーだね！"],
            lose: ["うそ…なんで負けたの？", "次は絶対勝つからな！"]
        }
    },
    {
        id: "defender",
        name: "鉄壁のマモル",
        description: "角や辺を重視する堅実派。石の数は最後に勝てばいいと思っています。",
        icon: "🛡️",
        logicType: "static",
        depth: 4,
        randomness: 0,
        parameters: { mobility: 30, position: 100, discDiff: 0 },
        dialogues: {
            start: ["堅実にいきます。", "守りこそ最大の攻撃です。", "お手柔らかに。"],
            thinking: ["安全地帯を探しています…", "リスクを計算中…", "そこは罠ですね…"],
            generic: ["ふむ。", "ここは固く。", "配置よし。"],
            corner: ["角は頂きました。", "計画通りです。", "これで盤石ですね。"],
            advantage: ["盤面は制圧しました。", "予定通りです。", "私の領域ですね。"],
            disadvantage: ["む、崩されたか…", "想定外の展開です。", "立て直さなくては…"],
            win: ["論理的な帰結です。", "守り勝ちですね。"],
            lose: ["私の守りが破られるとは…", "完敗です。お見事。"]
        }
    },
    {
        id: "hybrid",
        name: "二重人格のジキル",
        description: "序盤は穏やかに守りますが、25手目を超えると急に攻撃的になります。",
        icon: "🎭",
        logicType: "dynamic_turn",
        depth: 3,
        randomness: 0,
        parameters: {
            switchTurn: 25,
            early: { mobility: 20, position: 80, discDiff: -10 },
            late: { mobility: 5, position: 10, discDiff: 100 }
        },
        dialogues: {
            start: ["…お手柔らかに頼むよ。", "争いは好まないんだ。", "静かに対局しましょう。"],
            thinking: ["…（人格が揺らいでいる）…", "ううっ…頭が…", "どっちだ…？"],
            generic: ["はい、ここですね。", "穏やかにいきましょう。", "（ニヤリ…）"],
            corner: ["そこは僕の場所だ…。", "いい場所だねぇ…ククク。", "ありがとうございます。"],
            advantage: ["ヒャハハ！全部俺の石だ！", "今の僕は強いよ？", "壊してやるよ！！"],
            disadvantage: ["僕を怒らせないでくれ…", "ちっ、調子に乗るなよ！", "まだだ…まだ舞える！"],
            win: ["ハハハ！弱い！弱いなぁ！", "これが僕の本性さ。"],
            lose: ["僕が…負けるなんて…", "覚えてろよ…！"]
        }
    },
    {
        id: "whimsical",
        name: "気まぐれなネコ",
        description: "基本は守備的ですが、たまに意味不明な手を打ちます。",
        icon: "🐈",
        logicType: "static",
        depth: 2,
        randomness: 3,
        parameters: { mobility: 10, position: 50, discDiff: 10 },
        dialogues: {
            start: ["にゃーん。", "遊んでくれるの？", "眠いにゃ…"],
            thinking: ["毛づくろい中…", "蝶々飛んでるにゃ…", "どれにするにゃ？"],
            generic: ["にゃっ！", "ここ好き。", "えいっ。"],
            corner: ["隅っこ落ち着くにゃ。", "ダンボール箱みたいにゃ。", "もらったにゃ。"],
            advantage: ["調子いいにゃ！", "ごはんまだ？", "すごいにゃ？"],
            disadvantage: ["むぅ…", "飽きてきたにゃ。", "爪研ぐぞ…"],
            win: ["勝ったにゃ！おやつくれ！", "ボク最強にゃ。"],
            lose: ["つまんないにゃ。", "ふんっ（顔を背ける）"]
        }
    }
];