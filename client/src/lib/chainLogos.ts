// Official chain logos from trustwallet/assets (CDN-hosted, stable).
// These URLs are public and do not require authentication.
import type { ChainCode } from "./constants";

export const CHAIN_LOGOS: Record<ChainCode, string> = {
  ETH: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  BTC: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png",
  SOL: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
  TRX: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png",
  XRP: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/xrp/info/logo.png",
  SUI: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sui/info/logo.png",
};
