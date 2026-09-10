interface TradingDisclaimerProps {
  className?: string;
}

/** Required on every trading / signal surface. */
const TradingDisclaimer = ({ className = "" }: TradingDisclaimerProps) => (
  <p className={`text-[10px] leading-relaxed text-muted-foreground/80 ${className}`}>
    Market data is provided for information only. Nothing shown here is financial advice, a
    recommendation, or an offer to trade. Prices may be delayed or incomplete — verify with your
    broker or exchange before acting.
  </p>
);

export default TradingDisclaimer;
