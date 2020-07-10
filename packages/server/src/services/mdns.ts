import mdns from "mdns";

export function advertiseService(serviceName: string, servicePort: number) {
  const serviceType = mdns.makeServiceType(serviceName, "tcp");
  const ad = mdns.createAdvertisement(serviceType, servicePort);

  return ad;
}
