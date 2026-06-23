import { NetworkProvider } from "./NetworkProvider";
import AdMobProvider from "./AdMobProvider";
import LiftOffProvider from "./LiftOffProvider";
import InMobiProvider from "./InMobiProvider";
import ChartBoostProvider from "./ChartBoostProvider";
import PangleProvider from "./PangleProvider";
import MintegralProvider from "./MintegralProvider";
import {
  BiddingInMobiProvider,
  BiddingLiftOffProvider,
  BiddingMintegralProvider,
  BiddingPangleProvider,
} from "./BiddingProviders";

const providers: Record<string, NetworkProvider> = {};

[
  new AdMobProvider(),
  new LiftOffProvider(),
  new InMobiProvider(),
  new ChartBoostProvider(),
  new PangleProvider(),
  new MintegralProvider(),
  new BiddingLiftOffProvider(),
  new BiddingInMobiProvider(),
  new BiddingMintegralProvider(),
  new BiddingPangleProvider(),
].forEach((p) => {
  providers[p.id] = p;
});

export default providers;
