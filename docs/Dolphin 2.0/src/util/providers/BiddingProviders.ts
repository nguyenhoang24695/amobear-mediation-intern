import { BiddingNetworkID } from "../../types/Networks";
import InMobiProvider from "./InMobiProvider";
import LiftOffProvider from "./LiftOffProvider";
import MintegralProvider from "./MintegralProvider";
import PangleProvider from "./PangleProvider";

export class BiddingLiftOffProvider extends LiftOffProvider {
  readonly id = BiddingNetworkID.LiftOff;
}

export class BiddingInMobiProvider extends InMobiProvider {
  readonly id = BiddingNetworkID.InMobi;
}

export class BiddingMintegralProvider extends MintegralProvider {
  readonly id = BiddingNetworkID.Mintegral;
}

export class BiddingPangleProvider extends PangleProvider {
  readonly id = BiddingNetworkID.Pangle;
}
