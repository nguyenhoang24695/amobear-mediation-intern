export default interface MintegralUnitResponse {
  publisher_id: number;
  app_id: number;
  placement_id: number;
  unit_id: number;
  unit_name: string;
  // Ecpm floors / target ecpm are returned as keyed objects
  ecpm_floor?: Record<string, number>;
  target_ecpm?: Record<string, number>;
}
