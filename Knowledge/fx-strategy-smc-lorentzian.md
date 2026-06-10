---
date: 2026-06-10
updated: 2026-06-10
tags: [fx, trading, strategy, smc, lorentzian, ema]
project: fx-diary
---

# FXトレード戦略：SMC × ローレンツ分類 × EMA三本

## 使用インジケーター

| インジケーター | 役割 |
|---|---|
| LuxAlgo Smart Money Concepts (SMC) | 相場構造・エントリーポイント分析 |
| Lorentzian Classification (ML) | 機械学習による売買シグナル |
| EMA 25 | 短期トレンド |
| EMA 75 | 中期トレンド |
| EMA 200 | 長期トレンド（大局フィルター） |

---

## SMC（Smart Money Concepts）の主要概念

### 構造系
- **BOS（Break of Structure）** ── トレンド継続の確認。直近高値/安値を更新した際に表示
- **CHoCH（Change of Character）** ── トレンド転換シグナル。それまでの構造が崩れた瞬間

### ゾーン系
- **Order Block（OB）** ── 大口が注文を置いた価格帯（需要/供給ゾーン）
  - 水色ゾーン = Bullish OB（買いの根拠）
  - ピンク/赤ゾーン = Bearish OB（売りの根拠）
- **FVG（Fair Value Gap）** ── 急騰/急落で生じたギャップ。回帰ポイントになりやすい
- **EQH/EQL（Equal Highs/Lows）** ── 同水準の高値/安値が並ぶ＝流動性が溜まっているゾーン
- **Premium/Discount Zone** ── フィボナッチ50%より上がPremium（割高）、下がDiscount（割安）

---

## Lorentzian分類の仕組み

- ユークリッド距離ではなく**ローレンツ距離**を使うK近傍法
- 経済イベントによる相場の「歪み」を考慮した機械学習モデル
- デフォルトフィーチャー：RSI(14)、WT(10,11)、CCI(20)、ADX(20)
- フィルター：ボラティリティフィルター、レジームフィルター、ADXフィルター
- 出力：緑ラベル＝買いシグナル、赤ラベル＝売りシグナル

---

## エントリー条件

### ロング（買い）
1. **大局フィルター** ── 価格が200 EMAより上
2. **中期トレンド** ── 25 EMA > 75 EMA（EMAが上向き配列）
3. **SMC構造** ── 直近でBullish CHoCHまたはBullish BOSが発生
4. **価格帯** ── Bullish Order Blockまたはフィボ0.382〜0.5のDiscount Zoneに到達
5. **MLシグナル** ── Lorentzianが緑（Buy）ラベルを点灯
6. **任意** ── EQL（イコールロー）を割り込んで流動性を取った後のリバウンド

### ショート（売り）
1. **大局フィルター** ── 価格が200 EMAより下
2. **中期トレンド** ── 25 EMA < 75 EMA（EMAが下向き配列）
3. **SMC構造** ── 直近でBearish CHoCHまたはBearish BOSが発生
4. **価格帯** ── Bearish Order Blockまたはフィボ0.618〜0.786のPremium Zoneに到達
5. **MLシグナル** ── Lorentzianが赤（Sell）ラベルを点灯
6. **任意** ── EQH（イコールハイ）を上抜けて流動性を取った後の反落

---

## 決済条件

| 条件 | 説明 |
|---|---|
| 逆方向のLorentzianシグナル | 買いポジ中に赤ラベル → クローズ |
| 逆方向のCHoCH | ポジ方向と逆の構造転換 |
| 次の構造ターゲット | EQH（ロング）またはEQL（ショート）到達 |
| EMAクロス | 25 EMAが75 EMAを逆方向にクロス |

## 損切り
- エントリーに使ったOrder Blockの反対側（破壊された場合は根拠消滅）
- 直近スイングの外側

---

## チャート例（2026-06-10 NZD/USD）
- 1時間足・4時間足でCHoCH＋EQHを確認
- フィボ0.382（0.58606）付近にBearish OB
- 200 EMAより下でショートバイアス
- Lorentzian赤ラベル点灯後にエントリー → -37.7 pips（損切り）
