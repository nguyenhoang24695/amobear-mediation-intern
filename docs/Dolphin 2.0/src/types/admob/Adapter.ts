import AdapterConfigMetadata from "./AdapterConfigMetadata";

export default interface Adapter {
  name: string;
  adapterId: string;
  title: string;
  platform: string;
  formats: string[];
  adapterConfigMetadata: AdapterConfigMetadata[];
}
