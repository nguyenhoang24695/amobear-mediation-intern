export default interface MintegralPlacementResponse {
  publisher_id: number;
  app_id: number;
  placement_id: number;
  placement_name: string;
  // Present on list
  ad_type?: string;
}
