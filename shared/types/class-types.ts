import { z } from "zod";

export enum ServiceType {
  PRIVATE = "PRIVATE",
  GROUP = "GROUP",
  COURSE = "COURSE",
}

export const ServiceTypeSchema = z.enum(ServiceType);

export enum ServiceKey {
  PRIVATE_CLASS = "PRIVATE",
  GROUP_CLASS = "GROUP_CLASS",
  COURSE_CLASS = "COURSE_CLASS",
}

export const ServiceKeySchema = z.enum(ServiceKey);

export function serviceTypeToServiceKey(serviceType: ServiceType): ServiceKey {
  switch (serviceType) {
    case ServiceType.PRIVATE:
      return ServiceKey.PRIVATE_CLASS;
    case ServiceType.GROUP:
      return ServiceKey.GROUP_CLASS;
    case ServiceType.COURSE:
      return ServiceKey.COURSE_CLASS;
    default:
      throw new Error(`Unsupported service type: ${serviceType as string}`);
  }
}

export default {};
