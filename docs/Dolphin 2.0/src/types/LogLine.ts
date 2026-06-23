export default interface LogLine {
  id: number; // unique key
  msg: string; // the headline
  data?: unknown; // optional payload
}
