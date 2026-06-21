import type { koMessages } from "./ko";

type WidenMessageValues<T> = T extends string
  ? string
  : {
      readonly [K in keyof T]: WidenMessageValues<T[K]>;
    };

export type Messages = WidenMessageValues<typeof koMessages>;
