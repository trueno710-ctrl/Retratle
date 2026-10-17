//+------------------------------------------------------------------+
//| PerfectOrderEA.mq4                                               |
//| 4時間足・1時間足・15分足の 25/75/200EMA パーフェクトオーダー      |
//| + 15分足 5/25/75EMA パーフェクトオーダー成立でエントリー         |
//| 損切り: 75EMA / 利確: リスクリワード 1:2 / リスク: 証拠金の1%    |
//+------------------------------------------------------------------+
#property copyright "Retratle"
#property version   "1.00"
#property strict

//--- 入力パラメータ
input double RiskPercent   = 1.0;      // リスク(証拠金に対する%)
input double RiskReward    = 2.0;      // リスクリワード(1:X)
input bool   UseEquity     = false;    // true=有効証拠金 / false=口座残高 で計算
input int    FastEMA       = 5;        // トリガー用EMA
input int    ShortEMA      = 25;       // 短期EMA
input int    MidEMA        = 75;       // 中期EMA(損切り位置)
input int    LongEMA       = 200;      // 長期EMA
input double SLBufferPips  = 0.0;      // 75EMAからさらに離す幅(pips)
input double MinSLPips     = 5.0;      // 損切り幅の下限(pips)。未満は見送り
input double MaxSLPips     = 100.0;    // 損切り幅の上限(pips)。超えたら見送り
input double MaxSpreadPips = 3.0;      // 許容スプレッド(pips)
input int    SlippagePips  = 3;        // 許容スリッページ(pips)
input int    MagicNumber   = 20261017; // マジックナンバー
input bool   AllowLong     = true;     // ロングを許可
input bool   AllowShort    = true;     // ショートを許可

datetime g_lastBar = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   Print("PerfectOrderEA 起動: ", Symbol(), " リスク=", RiskPercent, "% RR=1:", RiskReward);
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| 15分足の確定ごとに1回だけ判定する                                 |
//+------------------------------------------------------------------+
void OnTick()
{
   datetime barTime = iTime(NULL, PERIOD_M15, 0);
   if(barTime == 0 || barTime == g_lastBar) return;
   g_lastBar = barTime;

   if(HasOpenPosition()) return;  // 1通貨ペアにつき1ポジションまで

   int dir = GetSignal();
   if(dir == 1  && AllowLong)  OpenTrade(1);
   if(dir == -1 && AllowShort) OpenTrade(-1);
}

//+------------------------------------------------------------------+
double Ema(int tf, int period, int shift)
{
   return iMA(NULL, tf, period, 0, MODE_EMA, PRICE_CLOSE, shift);
}

//--- 1=上昇パーフェクトオーダー / -1=下降パーフェクトオーダー / 0=なし
int PerfectOrder(int tf, int p1, int p2, int p3, int shift)
{
   double a = Ema(tf, p1, shift);
   double b = Ema(tf, p2, shift);
   double c = Ema(tf, p3, shift);
   if(a <= 0 || b <= 0 || c <= 0) return 0;  // 履歴データ不足
   if(a > b && b > c) return 1;
   if(a < b && b < c) return -1;
   return 0;
}

//--- 確定足(shift=1)で判定。5/25/75 が「今回の足で」揃った時だけシグナル
int GetSignal()
{
   int h4  = PerfectOrder(PERIOD_H4,  ShortEMA, MidEMA, LongEMA, 1);
   int h1  = PerfectOrder(PERIOD_H1,  ShortEMA, MidEMA, LongEMA, 1);
   int m15 = PerfectOrder(PERIOD_M15, ShortEMA, MidEMA, LongEMA, 1);
   if(h4 == 0 || h4 != h1 || h1 != m15) return 0;

   int nowPO  = PerfectOrder(PERIOD_M15, FastEMA, ShortEMA, MidEMA, 1);
   int prevPO = PerfectOrder(PERIOD_M15, FastEMA, ShortEMA, MidEMA, 2);
   if(nowPO == h4 && prevPO != h4) return h4;
   return 0;
}

//+------------------------------------------------------------------+
double PipSize()
{
   return (Digits == 3 || Digits == 5) ? Point * 10 : Point;
}

bool HasOpenPosition()
{
   for(int i = OrdersTotal() - 1; i >= 0; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderSymbol() == Symbol() && OrderMagicNumber() == MagicNumber && OrderType() <= OP_SELL)
         return true;
   }
   return false;
}

//--- 損切り幅(価格差)から、証拠金の RiskPercent% になるロットを計算
double CalcLots(double slDistance)
{
   double base      = UseEquity ? AccountEquity() : AccountBalance();
   double riskMoney = base * RiskPercent / 100.0;
   double tickValue = MarketInfo(Symbol(), MODE_TICKVALUE);
   double tickSize  = MarketInfo(Symbol(), MODE_TICKSIZE);
   double lotStep   = MarketInfo(Symbol(), MODE_LOTSTEP);
   double minLot    = MarketInfo(Symbol(), MODE_MINLOT);
   double maxLot    = MarketInfo(Symbol(), MODE_MAXLOT);
   if(tickValue <= 0 || tickSize <= 0 || lotStep <= 0) return 0;

   double lossPerLot = slDistance / tickSize * tickValue;
   double lots = MathFloor(riskMoney / lossPerLot / lotStep + 1e-8) * lotStep;  // 切り捨て(リスク超過を防ぐ)

   if(lots < minLot)
   {
      Print("見送り: 計算ロット ", lots, " が最小ロット ", minLot, " 未満(リスク超過になるため)");
      return 0;
   }
   if(lots > maxLot) lots = maxLot;

   int lotDigits = (int)MathMax(0, MathCeil(-MathLog10(lotStep) - 1e-8));
   return NormalizeDouble(lots, lotDigits);
}

//+------------------------------------------------------------------+
void OpenTrade(int dir)
{
   RefreshRates();
   double pip = PipSize();

   double spreadPips = (Ask - Bid) / pip;
   if(spreadPips > MaxSpreadPips)
   {
      Print("見送り: スプレッド ", DoubleToString(spreadPips, 1), "pips が上限超え");
      return;
   }

   double ema75 = Ema(PERIOD_M15, MidEMA, 1);
   int    type;
   double price, sl, tp;

   if(dir == 1)
   {
      type  = OP_BUY;
      price = Ask;
      sl    = ema75 - SLBufferPips * pip;
      if(sl >= price) { Print("見送り: 価格が75EMAより下"); return; }
   }
   else
   {
      type  = OP_SELL;
      price = Bid;
      sl    = ema75 + SLBufferPips * pip;
      if(sl <= price) { Print("見送り: 価格が75EMAより上"); return; }
   }

   double slDistance = MathAbs(price - sl);  // スプレッド込みの実際の損失幅
   double slPips     = slDistance / pip;
   if(slPips < MinSLPips || slPips > MaxSLPips)
   {
      Print("見送り: 損切り幅 ", DoubleToString(slPips, 1), "pips が範囲外");
      return;
   }
   double stopLevel = MarketInfo(Symbol(), MODE_STOPLEVEL) * Point;
   if(slDistance < stopLevel)
   {
      Print("見送り: 損切り幅がブローカーのストップレベル未満");
      return;
   }

   tp = (dir == 1) ? price + slDistance * RiskReward : price - slDistance * RiskReward;

   double lots = CalcLots(slDistance);
   if(lots <= 0) return;

   if(AccountFreeMarginCheck(Symbol(), type, lots) <= 0)
   {
      Print("見送り: 余剰証拠金不足");
      return;
   }

   int slippage = (int)MathRound(SlippagePips * pip / Point);
   int ticket = OrderSend(Symbol(), type, lots, NormalizeDouble(price, Digits), slippage,
                          NormalizeDouble(sl, Digits), NormalizeDouble(tp, Digits),
                          "PerfectOrderEA", MagicNumber, 0, dir == 1 ? clrDodgerBlue : clrRed);
   if(ticket < 0)
      Print("発注失敗: エラー ", GetLastError());
   else
      Print(dir == 1 ? "買い" : "売り", " ", lots, "lot SL=", DoubleToString(sl, Digits),
            " (", DoubleToString(slPips, 1), "pips) TP=", DoubleToString(tp, Digits));
}
//+------------------------------------------------------------------+
