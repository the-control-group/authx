import { ComponentType } from "react";

export interface Strategy {
  component: ComponentType<{
    authority: any;
    authorities: any[];
    setAuthorization: (authorization: { id: string; secret: string }) => void;
  }>;
  fragment: string;
}
