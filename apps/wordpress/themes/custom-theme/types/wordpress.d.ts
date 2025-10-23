declare module "@wordpress/server-side-render" {
  import { ComponentType, ReactElement } from "react";

  interface ServerSideRenderProps {
    block: string;
    attributes?: Record<string, any>;
    className?: string;
    httpMethod?: "GET" | "POST";
    urlQueryArgs?: Record<string, any>;
    EmptyResponsePlaceholder?: ComponentType;
    ErrorResponsePlaceholder?: ComponentType;
    LoadingResponsePlaceholder?: ComponentType;
  }

  const ServerSideRender: ComponentType<ServerSideRenderProps>;
  export default ServerSideRender;
}
